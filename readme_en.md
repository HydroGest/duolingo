# Duolingo for Koishi

[![npm](https://img.shields.io/npm/v/koishi-plugin-duolingo?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-duolingo)

[简体中文](/readme.md) | [English](/readme_en.md) | [日本語](/readme_jp.md)

## Introduction

This plugin is developed based on the Koishi framework and is used to interact with the Duolingo platform. It enables functions such as user information querying, binding, experience data updating, and leaderboard display.

### Features

1. **User Binding**: Users can bind their QQ accounts to their Duolingo accounts through the command `duolingo bind <username>`.
2. **User Information Querying**:
    - `duolingo info <username>`: Query detailed information of a specified Duolingo username, including registration date, current streak, total EXP, etc. If no username is specified, the information of the bound user will be queried.
    - `duolingo streak <username>`: View detailed streak information of a specified user, including the start, end dates, and lengths of the current streak and the longest streak. If no username is specified, the information of the bound user will be queried.
3. **Leaderboard Display**: The `duolingo ranking [type:string]` command supports viewing the daily (daily), weekly (weekly), or total (total) EXP leaderboards, showing the ranking of users' experience points.
4. **Experience Data Update**: The plugin automatically updates users' experience data at 0:00 am every day. Administrators can also manually update the data through the command `duolingo/update`.
5. **Experience Value Calendar**: The `duolingo calendar [username]` command allows users to view the experience value calendar, displaying the experience points gained, the number of study sessions, and the total study time each day.

### Usage

1. **Account Binding**: Enter `duolingo bind <username>` in the chat window, where `<username>` is your Duolingo username, and complete the binding according to the prompts.
2. **Information Querying**: Enter the corresponding commands and parameters in the chat window according to the above feature description to obtain the required information.
3. **Viewing the Leaderboard**: Enter `duolingo ranking [type]`, where `type` can be `daily`, `weekly`, or `total`, to view different types of leaderboards.
4. **Data Update**: Administrators can enter `duolingo update` to manually update the user experience data.

### Precautions

1. Ensure a normal network connection so that the plugin can smoothly obtain data from the Duolingo platform.
2. If the API of the Duolingo platform changes, corresponding adjustments may be required to the plugin code.
3. Some functions in the plugin rely on users having bound their Duolingo accounts. If not bound, these functions may not work properly.