[中文](README.md) | English

# logseq-plugin-reminder

System notification for Scheduled and Deadline.

## Feature Highlights

- Support Logseq's builtin `Scheduled` and `Deadline`.
- Support the repeater on `Scheduled` and `Deadline`.
- You can set a default reminding time for `Scheduled` and `Deadline` that has no time set.
- Support for reminding again when clicked on the notification.
- You can setup multiple remindings prior the event, block level setting (via `remindings` property) has priority over the plugin level setting.
- A hook function can be set on the block, it gets called on the scheduled time.
- You need to restart Logseq after changing the settings.

## Linux

For Linux users, please refer to [this](https://github.com/sethyuan/logseq-plugin-reminder/issues/2#issuecomment-1613315698) for how to setup for system level notifications.

## How to use Hooks

Write an user function in Logseq, give it a `#.fn` tag. Set a `reminder-hook` attribute in the Scheduled/Deadline block to tell the plugin to call this function, see the following example:

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

With the above block we set up a hook that will call the `blockToWeChat` user function on the scheduled time. The user function takes two arguments:

- `block` is the block object that sets up the hook.
- `notification` is an object containing the reminding information.

In addition, the plugin provides the following built-in helper functions:

- `getBlockTitle(block)` for getting the block title.
- `getBlockContent(block)` for getting the block content.
- `pushWeChat(key, title, body)`, to use Server 酱 to do push to WeChat, you need to go to [Server 酱](https://sct.ftqq.com/) to open your own account, and pass in your own key. `title` is the title, 32 characters maximum, `body` is the body content, supports normal markdown, max 32KB.

The plugin will automatically recognize user functions every time it starts, if they are newly written or changed, you can reload them in the command bar and executing "Reload user functions".

For more examples of hook functions, see the `example-hooks` folder.

## ⚠️ Caution

- For technical reasons, there may be a delay of ~1 minute in reminding if Logseq is left in the background for a long time. It is recommended to not depend only on this plugin for reminding important events, and that the alert time be set to a few minutes earlier.
- Please check the source of the user-defined functions you use and make sure you trust them. Insecure code from outside sources may have risks such as privacy leaks!

## Buy me a coffee

If you think the software I have developed is helpful to you and would like to give recognition and support, you may buy me a coffee using following link. Thank you for your support and attention.

<a href="https://www.buymeacoffee.com/sethyuan" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-blue.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>
