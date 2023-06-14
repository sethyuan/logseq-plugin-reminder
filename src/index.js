import "@logseq/libs"
import { format } from "date-fns"
import { setup, t } from "logseq-l10n"
import zhCN from "./translations/zh-CN.json"
import {
  handleReminder,
  off,
  onClose,
  onRemind10,
  onRemind15,
  onRemind30,
  onRemind5,
  reinit,
} from "./worker"

async function main() {
  await setup({ builtinTranslations: { "zh-CN": zhCN } })

  logseq.useSettingsSchema([
    {
      key: "alertOffset",
      type: "number",
      default: 5,
      description: t(
        "Alert n minutes before the event. Use 0 if you don't want to receive alerts before the event.",
      ),
    },
  ])

  const openBlockLabel = document.getElementById("openBlockLabel")
  const btn5 = document.getElementById("btn5")
  const btn10 = document.getElementById("btn10")
  const btn15 = document.getElementById("btn15")
  const btn30 = document.getElementById("btn30")
  const btnClose = document.getElementById("btnClose")
  openBlockLabel.textContent = t("Open triggering block.")
  btn5.textContent = t("Remind me in 5 minutes")
  btn10.textContent = t("Remind me in 10 minutes")
  btn15.textContent = t("Remind me in 15 minutes")
  btn30.textContent = t("Remind me in 30 minutes")
  btnClose.textContent = t("Close")
  btn5.addEventListener("click", onRemind5)
  btn10.addEventListener("click", onRemind10)
  btn15.addEventListener("click", onRemind15)
  btn30.addEventListener("click", onRemind30)
  btnClose.addEventListener("click", onClose)

  await initReminders()

  const cache = new Map()
  const dbOff = logseq.DB.onChanged(({ txData }) => {
    for (const [e, a, v, , isAdded] of txData) {
      switch (a) {
        case "scheduled":
        case "deadline": {
          const item = cache.get(e)
          if (item) {
            item.check = true
          } else {
            cache.set(e, { check: true })
          }
          break
        }
        case "content": {
          const item = cache.get(e)
          if (item) {
            if (isAdded) {
              item.contentNew = v
            } else {
              item.contentOld = v
            }
          } else {
            cache.set(e, isAdded ? { contentNew: v } : { contentOld: v })
          }
          break
        }
      }
    }

    for (const [id, { check, contentOld, contentNew }] of cache.entries()) {
      if (check && (contentOld || contentNew)) {
        handleReminder(id, contentOld, contentNew)
      }
    }

    cache.clear()
  })

  logseq.App.onCurrentGraphChanged(async () => {
    reinit()
    cache.clear()
    await initReminders()
  })

  logseq.beforeunload(() => {
    off()
    dbOff()
  })

  console.log("#reminder loaded")
}

async function initReminders() {
  const futureReminders = await fetchFutureReminders()
  for (const reminder of futureReminders) {
    await handleReminder(reminder.id, null, reminder.content)
  }
}

async function fetchFutureReminders() {
  try {
    return (
      (await logseq.DB.datascriptQuery(
        `[:find (pull ?b [:db/id :block/content])
        :in $ ?now
        :where
        (or [?b :block/scheduled ?d] [?b :block/deadline ?d])
        (or [?b :block/repeated? true] [(>= ?d ?now)])]`,
        format(new Date(), "yyyyMMdd"),
      )) ?? []
    ).flat()
  } catch (err) {
    console.error(err)
  }
  return []
}

logseq.ready(main).catch(console.error)
