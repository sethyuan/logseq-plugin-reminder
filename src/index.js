import "@logseq/libs"
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

  logseq.beforeunload(() => {
    worker.terminate()
  })

  // TODO: listen for transactions.

  console.log("#reminder loaded")
}

logseq.ready(main).catch(console.error)
