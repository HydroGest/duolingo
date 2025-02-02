# Duolingo for Koishi

[![npm](https://img.shields.io/npm/v/koishi-plugin-duolingo?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-duolingo)

[简体中文](/readme.md) | [English](/readme_en.md) | [日本語](/readme_jp.md)

## 简介

该插件是基于 Koishi 框架开发的，用于与 Duolingo 平台进行交互，实现用户信息查询、绑定，经验数据更新以及排行榜展示等功能。

## 功能

1. **用户绑定**：用户可以通过 `duolingo bind <username>` 命令将自己的 QQ 账号与 Duolingo 账号进行绑定。
2. **用户信息查询**：
    - `duolingo info <username>`：查询指定 Duolingo 用户名的详细信息，包括注册日期、当前连胜、总 EXP 等。若未指定用户名，则查询已绑定用户信息。
    - `duolingo streak <username>`：查看指定用户的连胜详细信息，包括当前连胜和最长连胜的开始、结束日期及长度等。若未指定用户名，则查询已绑定用户信息。
3. **排行榜展示**：`duolingo ranking [type:string]` 命令支持查看每日（daily）、每周（weekly）或总榜（total）的 EXP 排行榜，展示用户的经验值排名情况。
4. **经验数据更新**：插件会在每天凌晨 0 点自动更新用户的经验数据，管理员也可通过 `duolingo/update` 命令手动更新。
5. **经验值日历**：`duolingo calendar [username]` 命令可以查看用户的经验值日历，展示每天获得的经验值、学习次数及总学习时间等信息。

## 使用方法

1. **绑定账号**：在聊天窗口输入 `duolingo bind <username>`，其中 `<username>` 为你的 Duolingo 用户名，按照提示完成绑定。
2. **查询信息**：根据上述功能说明，在聊天窗口输入相应的命令及参数，获取所需信息。
3. **查看排行榜**：输入 `duolingo ranking [type]`，`type` 可选 `daily`、`weekly` 或 `total`，查看不同类型的排行榜。
4. **更新数据**：管理员可输入 `duolingo update` 手动更新用户经验数据。

## 注意事项

1. 确保网络连接正常，以便插件能够顺利从 Duolingo 平台获取数据。
2. 若 Duolingo 平台的 API 发生变化，可能需要对插件代码进行相应调整。
3. 插件中部分功能依赖于用户已绑定 Duolingo 账号，若未绑定，可能无法正常使用。
