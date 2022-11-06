import "@logseq/libs"
import { format } from "date-fns"
import { setup, t } from "logseq-l10n"
import zhCN from "./translations/zh-CN.json"

async function main() {
  await setup({ builtinTranslations: { "zh-CN": zhCN } })

  logseq.useSettingsSchema([
    {
      key: "defaultTime",
      type: "string",
      default: "09:00",
      description: t(
        "The default time (in 24 hours format) for notification when only a date is given.",
      ),
    },
  ])

  const worker = new Worker(new URL("worker.js", import.meta.url), {
    type: "module",
  })

  const futureReminders = await fetchFutureReminders()
  for (const reminder of futureReminders) {
    worker.postMessage({ id: reminder.id, contentNew: reminder.content })
  }

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
        worker.postMessage({ id, contentOld, contentNew })
      }
    }

    cache.clear()
  })

  logseq.beforeunload(() => {
    dbOff()
    worker.terminate()
  })

  console.log("#reminder loaded")
}

async function fetchFutureReminders() {
  try {
    return (
      await logseq.DB.datascriptQuery(
        `[:find (pull ?b [:db/id :block/content])
        :in $ ?now
        :where
        (or [?b :block/scheduled ?d] [?b :block/deadline ?d])
        [(>= ?d ?now)]]`,
        format(new Date(), "yyyyMMdd"),
      )
    ).flat()
  } catch (err) {
    console.error(err)
  }
  return []
}

logseq.ready(main).catch(console.error)
