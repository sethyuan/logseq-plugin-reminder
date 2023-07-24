# Push the scheduled block to WeChat

````
```js
async function blockToWeChat(block, notification) {
  const body = await getBlockContent(block)
  const title = content.substring(0, 32)

  // Push notification to WeChat.
  await pushWeChat("here is your Server酱 key", title, body)
}
```
#.fn
````
