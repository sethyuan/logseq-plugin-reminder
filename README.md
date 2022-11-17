# logseq-plugin-reminder

Scheduled 与 Deadline 的系统级通知。

System notification for Scheduled and Deadline.

## 功能展示

- 支持 Logseq 内置的 `Scheduled` 和 `Deadline`。
- 支持 `Scheduled` 和 `Deadline` 上的重复。
- 没有设置时间的 `Scheduled` 或 `Deadline` 不会收到通知。
- 支持点击通知后设置再次提醒。

## Feature Highlights

- Support Logseq's builtin `Scheduled` and `Deadline`.
- Support the repeater on `Scheduled` and `Deadline`.
- No notification will be received for `Scheduled` and `Deadline` that has no time set.
- Support for reminding again when clicked on the notification.

## 注意（Note）

鉴于技术原因，如果 Logseq 长期置于后台，提醒可能会存在～ 1 分的延迟，建议重要提醒不要只依赖于该插件，适当将提醒时间设置成提前几分钟。

For technical reasons, there may be a delay of ~1 minute in reminding if Logseq is left in the background for a long time. It is recommended to not depend only on this plugin for reminding important events, and that the alert time be set to a few minutes earlier.
