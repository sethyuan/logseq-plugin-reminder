import "@logseq/libs"
import { format } from "date-fns"
import { setup } from "logseq-l10n"
import zhCN from "./translations/zh-CN.json"
import { handleReminder, off } from "./worker"

async function main() {
  await setup({ builtinTranslations: { "zh-CN": zhCN } })

  // NOTE: Not sure if this default time is a good idea.
  // logseq.useSettingsSchema([
  //   {
  //     key: "defaultTime",
  //     type: "string",
  //     default: "09:00",
  //     description: t(
  //       "The default time (in 24 hours format) for notification when only a date is given.",
  //     ),
  //   },
  // ])

  const futureReminders = await fetchFutureReminders()
  for (const reminder of futureReminders) {
    await handleReminder(reminder.id, null, reminder.content)
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
        handleReminder(id, contentOld, contentNew)
      }
    }

    cache.clear()
  })

  logseq.beforeunload(() => {
    off()
    dbOff()
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
        (or [?b :block/repeated? true] [(>= ?d ?now)])]`,
        format(new Date(), "yyyyMMdd"),
      )
    ).flat()
  } catch (err) {
    console.error(err)
  }
  return []
}

logseq.ready(main).catch(console.error)
