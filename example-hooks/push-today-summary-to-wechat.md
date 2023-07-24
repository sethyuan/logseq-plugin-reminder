# Push a summary of today's todos and WeRead notes to WeChat

The data for `bookNoteSummary` comes from the plugin WeRead Sync. You can remove this part if you don't use it.

````
```js
async function todaySummary(block, notification) {
  const title = "Today Summary"

  const today = await logseq.App.getStateFromStore("today")
  const totalNum = (await logseq.DB.q(`(and (page "${today}") (task LATER TODO NOW DOING DONE WAITING CANCELED))`)).length
  const doneNum = (await logseq.DB.q(`(and (page "${today}") (task DONE))`)).length
  const taskSummary = doneNum < totalNum
  	? `Today you have ${totalNum} todos, you have accomplished ${doneNum}, there is still **${totalNum - doneNum}** left. 💪`
    : `Today you have ${totalNum} todos, you have accomplished them all! 🥳`

  const bookNoteCount = (await logseq.DB.q(`(and (property :创建日期 [[${today}]]) (property :划线id))`)).length
  const bookNoteSummary = `Today you have written ${bookNoteCount} book notes.`

  const body = `${taskSummary}\n\n${bookNoteSummary}`

  // Push notification to WeChat.
  await pushWeChat("here is your Server酱 key", title, body)
}
```
#.fn
````
