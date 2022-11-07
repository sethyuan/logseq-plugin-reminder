import {
  addDays,
  addHours,
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

const INTERVAL = 1000 * 60 * 60 * 24 // 1d

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
const dates = new MinPriorityQueue()
let timer = null
let eid = null
let time = null
let intervalTimer = null

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
  clearInterval(intervalTimer)
  clearTimeout(timer)
}

function scheduleNext() {
  let item = reminders.get(dates.peek())
  while (
    (item == null ||
      (item.dt.getTime() !== dates.peekPriority() &&
        nextTime(item.dt, item.repeat) !== dates.peekPriority())) &&
    dates.length > 0
  ) {
    dates.pop()
    item = reminders.get(dates.peek())
  }
  const id = dates.peek()
  const scheduled = dates.peekPriority()
  const now = Date.now()
  if (scheduled < now + INTERVAL) {
    if (time != null && scheduled < time) {
      clearTimeout(timer)
      timer = null
      dates.push(time, eid)
    }
    if (timer == null) {
      eid = id
      time = scheduled
      timer = setTimeout(showNotification, scheduled - now)
      dates.pop()
      // console.log("scheduling:", item.msg, new Date(scheduled).toString())
    }
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
      const block = await logseq.Editor.getBlock(id)
      logseq.Editor.scrollToBlockInPage(block.uuid)
    }
  }

  resetTimer()
  scheduleNext()
}

function parseDate(content) {
  // sample: \nSCHEDULED: <2022-11-07 Mon 23:18 .+1d>
  if (!content) return [null, null]
  const match = content.match(
    /\n(?:SCHEDULED|DEADLINE): \<(\d{4}-\d{2}-\d{2} [a-z]{3} \d{2}:\d{2})(?: [\.\+]\+(\d+[ymwdh]))?\>$/i,
  )
  if (!match) return [null, null]
  const [, dateStr, repeat] = match
  return [parse(dateStr, "yyyy-MM-dd EEE HH:mm", new Date()), repeat]
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

intervalTimer = setInterval(scheduleNext, INTERVAL)
