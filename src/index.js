import "@logseq/libs"
import { format } from "date-fns"
import { setup, t } from "logseq-l10n"
import "./libs/fns"
import zhCN from "./translations/zh-CN.json"
import {
  handleReminder,
  off,
  onClose,
  onCloseAndOpenBlock,
  onRemind10,
  onRemind15,
  onRemind30,
  onRemind5,
  reinit,
} from "./worker"

const evaluate = eval

async function main() {
  await setup({ builtinTranslations: { "zh-CN": zhCN } })

  logseq.useSettingsSchema([
    {
      key: "remindings",
      type: "string",
      default: "15m, 5m",
      description: t(
        "Comma separated times for remindings before the event. Units m (minutes), h (hours) and d (days) are supported.",
      ),
    },
    {
      key: "dateTimeFormat",
      type: "string",
      default: "",
      description: t(
        "You can provide a customized date time format. Refer to: https://date-fns.org/v2.29.2/docs/format",
      ),
    },
    {
      key: "hasDefaultReminding",
      type: "boolean",
      default: false,
      description: t(
        "Enable a default reminding time for SCHEDULED and DEADLINE without time.",
      ),
    },
    {
      key: "defaultRemindingTime",
      type: "string",
      default: "08:00",
      description: t(
        "Default reminding time (in 24-hour format) for SCHEDULED and DEADLINE without time.",
      ),
    },
  ])

  const btn5 = document.getElementById("btn5")
  const btn10 = document.getElementById("btn10")
  const btn15 = document.getElementById("btn15")
  const btn30 = document.getElementById("btn30")
  const btnCloseAndOpenBlock = document.getElementById("btnCloseAndOpenBlock")
  const btnClose = document.getElementById("btnClose")
  btn5.textContent = t("Remind me in 5 minutes")
  btn10.textContent = t("Remind me in 10 minutes")
  btn15.textContent = t("Remind me in 15 minutes")
  btn30.textContent = t("Remind me in 30 minutes")
  btnCloseAndOpenBlock.textContent = t(
    "Close dialog and open the triggering block",
  )
  btnClose.textContent = t("Close dialog")
  btn5.addEventListener("click", onRemind5)
  btn10.addEventListener("click", onRemind10)
  btn15.addEventListener("click", onRemind15)
  btn30.addEventListener("click", onRemind30)
  btnCloseAndOpenBlock.addEventListener("click", onCloseAndOpenBlock)
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

  logseq.App.registerCommandPalette(
    {
      key: "reload-user-fns",
      label: t("Reload user functions"),
    },
    async () => {
      await reloadUserFns()
      await logseq.UI.showMsg(t("User defined functions reloaded."))
    },
  )

  await reloadUserFns()

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

async function reloadUserFns() {
  const fnStrings = (
    (await logseq.DB.datascriptQuery(
      `[:find (pull ?b [:block/content])
      :where
      [?t :block/name ".fn"]
      [?b :block/refs ?t]]`,
    )) ?? []
  ).map((item) => item[0].content.match(/```.+\n((?:.|\n)+)\n```/)[1])

  for (const fnStr of fnStrings) {
    evaluate(fnStr)
  }
}

logseq.ready(main).catch(console.error)
