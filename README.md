中文 | [English](README.en.md)

# logseq-plugin-reminder

Scheduled 与 Deadline 的系统级通知。

## 功能展示

- 支持 Logseq 内置的 `Scheduled` 和 `Deadline`。
- 支持 `Scheduled` 和 `Deadline` 上的重复。
- 可为没有设置时间的 `Scheduled` 或 `Deadline` 设置默认通知时间。
- 支持点击通知后设置再次提醒。
- 可设置多次提前提醒，块级设置（通过 `remindings` 属性）会优先于插件级设置。
- 可设置 hook，提醒时间到时会自动触发 hook 函数的调用。
- 修改插件配置后请重启 Logseq。

## 如何使用 Hook

在 Logseq 中编写一个自定义函数，给它一个 `#.fn` 的标签。在 Scheduled/Deadline 块中设置一个`reminder-hook`属性来告诉插件调用这个函数，见如下示例：

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

```
Test block content.
SCHEDULED: <2023-07-24 Mon 15:44>
reminder-hook:: blockToWeChat
```

通过上面的块我们设置了一个 hook，它会在时间到时触发 `blockToWeChat` 自定义函数的调用。自定义函数接受两个参数：

- `block` 是定义 hook 的块对象。
- `notification` 是一个含有提醒信息的对象。

此外，插件内置提供了以下辅助函数：

- `getBlockTitle(block)`，用于获取块标题。
- `getBlockContent(block)`，用于获取块内容。
- `pushWeChat(key, title, body)`，使用 Server 酱向微信做推送，你需要去[Server 酱](https://sct.ftqq.com/)开个自己的账号，把自己的 key 传进来。`title` 是标题，最长 32 个字符，`body` 是正文内容，支持普通 markdown，最长 32KB。

插件每次启动时会自动识别用户自定义函数，如果是新写的或者有改动，可以通过在命令栏查找并执行“重新加载用户函数”来重新加载函数。

更多的 hook 函数示例请参看 `example-hooks` 文件夹。

## ⚠️ 注意

- 鉴于技术原因，如果 Logseq 长期置于后台，提醒可能会存在～ 1 分的延迟，建议重要提醒不要只依赖于该插件，适当将提醒时间设置成提前几分钟。
- 请确认您使用的用户自定义函数的来源，确保您信任它们。外来的不安全代码可能有隐私泄漏等风险！

## Buy me a coffee

如果您认为我所开发的软件对您有所帮助，并且愿意给予肯定和支持，不妨扫描下方的二维码进行打赏。感谢您的支持与关注。

![wx](https://user-images.githubusercontent.com/3410293/236807219-cf21180a-e7f8-44a9-abde-86e1e6df999b.jpg) ![ap](https://user-images.githubusercontent.com/3410293/236807256-f79768a7-16e0-4cbf-a9f3-93f230feee30.jpg)
