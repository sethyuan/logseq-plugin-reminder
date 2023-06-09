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
  parse,
} from "date-fns"
import { MinPriorityQueue } from "jsutils"
import { t } from "logseq-l10n"
import { parseContent } from "./libs/utils"

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
  const [dtNew, repeatNew] = parseDate(contentNew)

  if (!dtOld && !dtNew) return

  if (dtNew) {
    if (isEqual(dtOld, dtNew) && repeatOld === repeatNew) {
      const item = reminders.get(id)
      if (!item) return
      item.msg = await parseContent(contentNew)
    } else {
      if (!repeatNew && isBefore(dtNew, new Date())) return
      if (eid === id) {
        resetTimer()
      }
      reminders.set(id, {
        msg: await parseContent(contentNew),
        dt: dtNew,
        repeat: repeatNew,
      })
      if (isBefore(dtNew, new Date())) {
        dates.push(nextTime(dtNew, repeatNew), id)
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

  scheduleNext()
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

function scheduleNext() {
  let item = reminders.get(dates.peek())
  let scheduled = dates.peekPriority()
  const now = Date.now()
  while (
    (item == null ||
      (item.remindIn?.getTime() !== scheduled &&
        item.dt.getTime() !== scheduled &&
        nextTime(item.dt, item.repeat) !== scheduled)) &&
    dates.length > 0
  ) {
    dates.pop()
    item = reminders.get(dates.peek())
    scheduled = dates.peekPriority()
  }

  if (dates.length <= 0) return

  const id = dates.peek()
  if (time != null && scheduled < time) {
    clearTimeout(timer)
    timer = null
    dates.push(time, eid)
  }
  if (timer == null) {
    eid = id
    time = scheduled
    const span = scheduled - now
    if (span < INTERVAL) {
      timer = setTimeout(showNotification, span)
      dates.pop()
    } else {
      // HACK: Effort to make reminder as accurate as possible.
      timer = setTimeout(() => {
        resetTimer()
        scheduleNext()
      }, INTERVAL)
    }
    // console.log("scheduling:", item.msg, new Date(now).toString())
  }
}

function showNotification() {
  const id = eid
  const item = reminders.get(id)

  if (item != null) {
    if (item.repeat) {
      const newTime = nextTime(item.dt, item.repeat)
      dates.push(newTime, id)
    } else {
      reminders.delete(id)
    }
    const notif = new Notification(t("Reminder"), {
      body: item.msg,
      requireInteraction: true,
    })
    notif.onclick = async (e) => {
      lastItem = item
      lastID = id
      openUI(item.msg)
    }
  }

  resetTimer()
  scheduleNext()
}

export function onRemind5() {
  remindMeIn(5)
}

export function onRemind10() {
  remindMeIn(10)
}

export function onRemind15() {
  remindMeIn(15)
}

export function onRemind30() {
  remindMeIn(30)
}

function remindMeIn(minutes) {
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
    scheduleNext()
  }
  closeUI()
}

export function onClose() {
  closeUI()
}

function parseDate(content) {
  // sample: \nSCHEDULED: <2022-11-07 Mon 23:18 .+1d>
  if (!content) return [null, null]
  const match = content.match(
    /\n\s*(?:SCHEDULED|DEADLINE): \<(\d{4}-\d{1,2}-\d{1,2} [a-z]{3} \d{1,2}:\d{1,2})(?: [\.\+]\+(\d+[ymwdh]))?\>/i,
  )
  if (!match) return [null, null]
  const [, dateStr, repeat] = match
  return [
    addMinutes(
      parse(dateStr, "yyyy-MM-dd EEE HH:mm", new Date()),
      -(logseq.settings?.alertOffset ?? DEFAULT_OFFSET),
    ),
    repeat,
  ]
}

function nextTime(d, repeat) {
  if (!repeat) return d.getTime()

  const quantity = +repeat.substring(0, repeat.length - 1)
  const unit = repeat[repeat.length - 1]
  if (isNaN(quantity) || !UNITS.has(unit)) return d.getTime()

  const diff = differenceInUnit[unit](new Date(), d)
  const times = (diff / quantity) >> 0
  d = addUnit[unit](d, quantity * (times + 1))
  return d.getTime()
}

function resetTimer() {
  clearTimeout(timer)
  timer = null
  eid = null
  time = null
}

function openUI(msg) {
  const msgEl = document.getElementById("msg")
  msgEl.textContent = msg
  logseq.showMainUI({ autoFocus: true })
}

function closeUI() {
  logseq.hideMainUI({ restoreEditingCursor: true })
}
