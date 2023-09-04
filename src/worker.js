import {
  addDays,
  addHours,
  addMinutes,
  addMonths,
  addWeeks,
  addYears,
  differenceInDays,
  differenceInHours,
  differenceInMonths,
  differenceInWeeks,
  differenceInYears,
  isBefore,
  isEqual,
  isValid,
  parse,
} from "date-fns"
import { MinPriorityQueue } from "jsutils"
import { t } from "logseq-l10n"
import { getDisplayedMessage, parseRemindings } from "./libs/utils"

const INTERVAL = 30_000 // 30s

const UNITS = new Set(["y", "m", "w", "d", "h"])
const addUnit = {
  y: addYears,
  m: addMonths,
  w: addWeeks,
  d: addDays,
  h: addHours,
}
const differenceInUnit = {
  y: differenceInYears,
  m: differenceInMonths,
  w: differenceInWeeks,
  d: differenceInDays,
  h: differenceInHours,
}

const addRemindingUnit = {
  d: addDays,
  h: addHours,
  m: addMinutes,
}

const reminders = new Map()
let dates = new MinPriorityQueue()
let timer = null
let eid = null
let time = null
let lastItem = null
let lastID = null

const DEFAULT_OFFSET = 5

export async function handleReminder(id, contentOld, contentNew) {
  const [dtOld, repeatOld] = parseDate(contentOld)
  const [dtNew, repeatNew] = parseDate(contentNew, true)

  if (!dtOld && !dtNew) return

  if (dtNew) {
    if (isEqual(dtOld, dtNew) && repeatOld === repeatNew) {
      const item = reminders.get(id)
      if (!item) return
      item.msg = contentNew
    } else {
      if (eid === id) {
        resetTimer()
      }
      const now = new Date()
      if (!repeatNew && isBefore(dtNew, now)) return

      const item = {
        msg: contentNew,
        dt: dtNew,
        repeat: repeatNew,
      }
      reminders.set(id, item)
      const notifDts = await getNotificationDates(id, dtNew)
      for (const dt of notifDts) {
        if (isBefore(dt, now)) continue
        dates.push(dt.getTime(), id)
      }

      if (isBefore(dtNew, now)) {
        const nextDt = nextTime(dtNew, repeatNew)
        item.dt = nextDt
        const nextNotifDts = await getNotificationDates(id, nextDt)
        for (const dt of nextNotifDts) {
          if (isBefore(dt, now)) continue
          dates.push(dt.getTime(), id)
        }
        dates.push(nextDt.getTime(), id)
      } else {
        dates.push(dtNew.getTime(), id)
      }
    }
  } else {
    if (eid === id) {
      resetTimer()
    }
    reminders.delete(id)
  }

  await scheduleNext()
}

export function off() {
  clearTimeout(timer)
}

export function reinit() {
  clearTimeout(timer)
  reminders.clear()
  dates = new MinPriorityQueue()
  timer = null
  eid = null
  time = null
  lastItem = null
  lastID = null
}

async function scheduleNext() {
  let itemId = dates.peek()
  let item = reminders.get(itemId)
  let scheduled = dates.peekPriority()
  let dts =
    item == null
      ? []
      : [...(await getNotificationDates(itemId, item.dt)), item.dt].map((dt) =>
          dt.getTime(),
        )
  while (
    dates.length > 0 &&
    (item == null ||
      (scheduled !== item.remindIn?.getTime() && !dts.includes(scheduled)))
  ) {
    dates.pop()
    itemId = dates.peek()
    item = reminders.get(itemId)
    scheduled = dates.peekPriority()
    dts =
      item == null
        ? []
        : [...(await getNotificationDates(itemId, item.dt)), item.dt].map(
            (dt) => dt.getTime(),
          )
  }

  if (dates.length <= 0) return

  if (time != null && scheduled < time) {
    clearTimeout(timer)
    timer = null
    dates.push(time, eid)
  }
  if (timer == null) {
    const now = Date.now()
    eid = itemId
    time = scheduled
    const span = scheduled - now
    if (span <= INTERVAL) {
      timer = setTimeout(showNotification, span)
      dates.pop()
    } else {
      // HACK: Effort to make reminder as accurate as possible.
      timer = setTimeout(async () => {
        resetTimer()
        await scheduleNext()
      }, INTERVAL)
    }
    // console.log("scheduling:", item.msg, new Date(now).toString())
  }
}

async function showNotification() {
  const id = eid
  const item = reminders.get(id)

  if (item != null) {
    const msg = await getDisplayedMessage(item.msg, item.dt)
    const notif = new Notification(t("Reminder"), {
      body: msg,
      requireInteraction: true,
    })
    notif.onclick = async (e) => {
      lastItem = item
      lastID = id
      openUI(msg, id)
    }

    // Only add more if it's on event time.
    if (time === item.dt.getTime()) {
      if (item.repeat) {
        const nextDt = nextTime(item.dt, item.repeat)
        item.dt = nextDt
        const nextNotifDts = await getNotificationDates(id, nextDt)
        const now = new Date()
        for (const dt of nextNotifDts) {
          if (isBefore(dt, now)) continue
          dates.push(dt.getTime(), id)
        }
        dates.push(nextDt.getTime(), id)
      } else if (item.remindIn == null || item.remindIn.getTime() <= time) {
        reminders.delete(id)
      }

      callHooks(id, item)
    }
  }

  resetTimer()
  await scheduleNext()
}

export async function onRemind5() {
  await remindMeIn(5)
}

export async function onRemind10() {
  await remindMeIn(10)
}

export async function onRemind15() {
  await remindMeIn(15)
}

export async function onRemind30() {
  await remindMeIn(30)
}

async function remindMeIn(minutes) {
  const id = lastID
  if (id != null) {
    const item = reminders.get(id)
    const remindIn = addMinutes(new Date(), minutes)
    if (item) {
      item.remindIn = remindIn
    } else {
      reminders.set(id, { ...lastItem, remindIn })
    }
    dates.push(remindIn.getTime(), id)
    lastID = null
    lastItem = null
    await scheduleNext()
  }
  closeUI()
}

export function onCloseAndOpenBlock() {
  // Set remindIn so existing ones get invalidated.
  const item = reminders.get(lastID)
  if (item) {
    item.remindIn = new Date()
  }

  const btnOpenBlock = document.getElementById("btnCloseAndOpenBlock")
  logseq.Editor.scrollToBlockInPage(btnOpenBlock.dataset.uuid)
  closeUI()
}

export function onClose() {
  // Set remindIn so existing ones get invalidated.
  const item = reminders.get(lastID)
  if (item) {
    item.remindIn = new Date()
  }

  closeUI()
}

function parseDate(content, useDefault = false) {
  // sample: \nSCHEDULED: <2022-11-07 Mon 23:18 .+1d>
  if (!content) return [null, null]
  const match = content.match(
    /\n\s*(?:SCHEDULED|DEADLINE): \<(\d{4}-\d{1,2}-\d{1,2} [a-z]{3} \d{1,2}:\d{1,2})(?: [\.\+]\+(\d+[ymwdh]))?\>/i,
  )
  if (!match) {
    if (useDefault && logseq.settings?.hasDefaultReminding) {
      const dt = parse(
        logseq.settings?.defaultRemindingTime,
        "HH:mm",
        new Date(),
      )
      return [isValid(dt) ? dt : null, null]
    } else {
      return [null, null]
    }
  }
  const [, dateStr, repeat] = match
  const date = parse(dateStr, "yyyy-MM-dd EEE HH:mm", new Date())
  return [date, repeat]
}

async function getNotificationDates(id, dt) {
  const remindings = await parseRemindings(id)
  const ret = remindings.map(([quantity, unit]) =>
    addRemindingUnit[unit](dt, -quantity),
  )
  return ret
}

function nextTime(d, repeat) {
  if (!repeat) return d

  const quantity = +repeat.substring(0, repeat.length - 1)
  const unit = repeat[repeat.length - 1]
  if (isNaN(quantity) || !UNITS.has(unit)) return d

  const diff = differenceInUnit[unit](new Date(), d)
  const times = (diff / quantity) >> 0
  d = addUnit[unit](d, quantity * (times + 1))
  return d
}

function resetTimer() {
  clearTimeout(timer)
  timer = null
  eid = null
  time = null
}

async function openUI(msg, id) {
  const msgEl = document.getElementById("msg")
  msgEl.textContent = msg
  const uuid = (await logseq.Editor.getBlock(id))?.uuid
  const btnOpenBlock = document.getElementById("btnCloseAndOpenBlock")
  btnOpenBlock.dataset.uuid = uuid
  logseq.showMainUI({ autoFocus: true })
}

function closeUI() {
  logseq.hideMainUI({ restoreEditingCursor: true })
}

async function callHooks(id, item) {
  const block = await logseq.Editor.getBlock(id)
  if (block == null) return
  const hookProp = block.properties?.reminderHook
  if (hookProp == null) return

  // HACK: Do not remove this line. It prevents `item` from being removed.
  console.log("reminder", item)
  await eval(`${hookProp}(block, item)`)
}
