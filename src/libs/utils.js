import { format } from "date-fns"
import { parse } from "./marked-renderer.js"

export async function parseContent(content) {
  // Remove front matter.
  content = content.replace(/---\n(-(?!--)|[^-])*\n---\n?/g, "")

  // Use only the first line.
  content = content.match(/.*/)[0]

  // Remove macro renderers.
  content = content.replace(/ \{\{renderer (?:\}[^\}]|[^\}])+\}\}/g, "")

  // Remove properties.
  content = content.replace(/^.+:: .+$/gm, "")

  // Remove logbook
  content = content.replace(/:LOGBOOK:(.|\n)+:END:/g, "")

  // Handle markdown.
  content = parse(content)

  // Remove tags.
  content = content.replace(
    /(^|\s)#(?!#)((\[\[([^\]]|\](?!\]))+\]\])|\S+)/g,
    "",
  )

  // Replace block refs with their content.
  let match
  while ((match = /\(\(([^\)]+)\)\)/g.exec(content)) != null) {
    const start = match.index
    const end = start + match[0].length
    const refUUID = match[1]
    const refBlock = await logseq.Editor.getBlock(refUUID)
    const refContent = await parseContent(refBlock.content)
    content = `${content.substring(0, start)}${refContent}${content.substring(
      end,
    )}`
  }

  // Remove page refs
  content = content.replace(/\[\[([^\]]+)\]\]/g, "$1")

  // Remove task prefix
  content = content.replace(
    /^(TODO|DOING|LATER|NOW|DONE|CANCEL{1,2}ED|WAITING) /,
    "",
  )

  return content.trim()
}

export async function parseRemindings(id) {
  const block = await logseq.Editor.getBlock(id)
  if (block == null) return []
  const remindingsStr =
    block.properties?.remindings ?? logseq.settings?.remindings
  if (!remindingsStr) return []

  const remindings = remindingsStr
    .split(/,\s*/)
    .map((s) => [+s.substring(0, s.length - 1), s.substring(s.length - 1)])
    .filter(
      ([quantity, unit]) => quantity > 0 && ["m", "h", "d"].includes(unit),
    )
  return remindings
}

export async function getDisplayedMessage(msg, dt, noTime) {
  const content = await parseContent(msg)
  let ret = noTime
    ? content
    : `${content}\n${
        logseq.settings?.dateTimeFormat
          ? format(dt, logseq.settings?.dateTimeFormat)
          : dt.toLocaleString()
      }`
  if (logseq.settings?.showGraphName) {
    const graphInfo = await logseq.App.getCurrentGraph()
    ret = `${graphInfo.name}\n${ret}`
  }
  return ret
}
