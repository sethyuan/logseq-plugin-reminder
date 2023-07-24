# Push the scheduled block to WeChat

````
```js
async function blockToWeChat(block, notification) {
  const title = getBlockTitle(block)
  const body = await getBlockContent(block)

  // Push notification to WeChat.
  await pushWeChat("here is your Server酱 key", title, body)
}
```
#.fn
````
