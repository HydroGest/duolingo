import { Context , Schema } from 'koishi';
import { Duolingo, XpSummariesResponse, UserResponse, XpSummary } from './interfaces';
import { convertTimestampToChineseDate, getDelayToNext, getWeekday } from './utils'

export const name = 'duolingo';
export interface Config {}
export const Config: Schema<Config> = Schema.object({});
export const inject = ['database'];

declare module 'koishi' {
    interface Tables {
        duolingo: Duolingo;
    }
}


// 判断时间戳是否为今天
function isTimestampToday(timestamp: number): boolean {
    const targetDate = new Date(timestamp * 1000);
    const currentDate = new Date();

    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth();
    const targetDay = targetDate.getDate();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    const currentDay = currentDate.getDate();

    return targetYear === currentYear && targetMonth === currentMonth && targetDay === currentDay;
}

async function getXpSummariesByUserId(userId: number): Promise<XpSummariesResponse | null> {
    try {
        const response = await fetch(`https://www.duolingo.com/2017-06-30/users/${userId}/xp_summaries`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: XpSummariesResponse = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching data:', error);
        return null;
    }
}

// 根据 ID 获取用户信息
async function getUserInfoById(id: number): Promise<UserResponse | null> {
    try {
        const url = `https://www.duolingo.com/2017-06-30/users/${id}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: UserResponse = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching user info:', error);
        return null;
    }
}

// 根据用户名获取用户 ID
async function getUserId(username: string): Promise<number | null> {
    const url = `https://www.duolingo.com/2017-06-30/users?username=${encodeURIComponent(username)}`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.users.length > 0 && 'id' in data.users[0]) {
            return data.users[0].id;
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error fetching user data:', error);
        return null;
    }
}

// 更新用户经验数据
async function updateUserExperience(ctx: Context) {
    const now = new Date();
    const isSunday = now.getDay() === 0; // 0 表示星期日

    // 获取所有绑定用户
    const users = await ctx.database.get('duolingo', {});

    for (const user of users) {
        try {
            // 获取最新用户数据
            const data = await getUserInfoById(user.user_did);
            if (!data) continue;

            // 更新每日经验
            await ctx.database.set('duolingo',
                { user_qid: user.user_qid },
                {
                    yesterday_exp: data.totalXp,
                    ...(isSunday && { lastweek_exp: data.totalXp })
                });

            ctx.logger.info(`用户 ${user.user_qid} 经验更新成功`);
        } catch (error) {
            ctx.logger.warn(`用户 ${user.user_qid} 更新失败: ${error.message}`);
        }
    }
}

// 通用函数，用于获取指定天数前的数据
function getDaysAgoData(response: XpSummariesResponse, daysAgo: number): XpSummary {
    const now = new Date();
    const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo);
    const startOfTargetDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()).getTime();
    const endOfTargetDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1).getTime() - 1;

    console.log(startOfTargetDate, endOfTargetDate);

    const res = response.summaries.filter(summary => {
        // 处理 summary.date 可能为 null 或 undefined 的情况
        return summary.date !== null && summary.date !== undefined && summary.date >= startOfTargetDate / 1000 && summary.date <= endOfTargetDate / 1000;
    });

    if (res.length > 0) return res[0];
    else return {
        gainedXp: 0,
        frozen: false,
        streakExtended: false,
        date: 0,
        userId: 0,
        repaired: false,
        dailyGoalXp: 0,
        numSessions: 0,
        totalSessionTime: 0
    };
}

function getSevenDaysXpSum(response: XpSummariesResponse): number {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    const startOfSevenDaysAgo = new Date(sevenDaysAgo.getFullYear(), sevenDaysAgo.getMonth(), sevenDaysAgo.getDate()).getTime();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - 1;

    let totalXp = 0;
    for (const summary of response.summaries) {
        if (summary.date !== null && summary.date !== undefined &&
            summary.date >= startOfSevenDaysAgo / 1000 && summary.date <= endOfToday / 1000) {
            totalXp += summary.gainedXp;
        }
    }

    return totalXp;
}

// 获取七天前的数据
function getSevenDaysAgoData(response: XpSummariesResponse): XpSummary {
    return getDaysAgoData(response, 7);
}

export function apply(ctx: Context) {
    // 首次延迟执行
    ctx.setTimeout(() => {
        updateUserExperience(ctx);
        ctx.setInterval(() => {
            updateUserExperience(ctx);
        }, 24 * 60 * 60 * 1000); // 24 小时间隔
    }, getDelayToNext(0)); // 凌晨 0 点执行

    // 扩展数据库模型
    ctx.model.extend('duolingo', {
        // 各字段的类型声明
        id: 'unsigned',
        user_qid: 'integer',
        user_did: 'integer',
        yesterday_exp: 'unsigned',
        lastweek_exp: 'unsigned'
    }, {
        primary: "id", // 主键名 
        autoInc: true // 使用自增主键 
    });

    ctx.command('duolingo/ranking [type:string]', '获取EXP排行榜')
  .alias('rk')
  .usage("type 可选: daily, weekly, total")
  .action(async ({ session }, type = 'daily') => {
    const users = await ctx.database.get('duolingo', {});
    session?.send("少女祈祷中...");

    // 并行获取所有用户的数据
    const userPromises = users.map(async (user) => {
      try {
        const [userInfo, xpInfo] = await Promise.all([
          getUserInfoById(user.user_did),
          getXpSummariesByUserId(user.user_did)
        ]);
        return { user, userInfo, xpInfo };
      } catch (error) {
        console.error(`用户 ${user.user_did} 数据获取失败:`, error);
        return null;
      }
    });

    // 等待所有请求完成并过滤无效结果
    const userResults = await Promise.all(userPromises);
    const validUserResults = userResults.filter(
      (result): result is NonNullable<typeof result> => 
        result !== null && 
        result.userInfo !== null && 
        result.xpInfo !== null
    );

    // 二次过滤（根据XP数值）
    const filteredResults = validUserResults.filter(({ xpInfo }) => {
      if (type === 'daily') {
        return getDaysAgoData(xpInfo, 0).gainedXp > 0;
      } else if (type === 'weekly') {
        return getSevenDaysXpSum(xpInfo) > 0;
      }
      return true; // total 类型不需要过滤
    });

    // 排序处理
    const sortedResults = filteredResults.sort((a, b) => {
      let xpA: number, xpB: number;
      if (type === 'daily') {
        xpA = getDaysAgoData(a.xpInfo, 0).gainedXp;
        xpB = getDaysAgoData(b.xpInfo, 0).gainedXp;
      } else if (type === 'weekly') {
        xpA = getSevenDaysXpSum(a.xpInfo);
        xpB = getSevenDaysXpSum(b.xpInfo);
      } else {
        xpA = a.userInfo.totalXp;
        xpB = b.userInfo.totalXp;
      }
      return xpB - xpA;
    });

    // 生成排行榜信息
    if (sortedResults.length === 0) {
      return '没有符合条件的用户数据';
    }

    const rankInfo = sortedResults.map((result, index) => {
      const xp = type === 'daily'
        ? getDaysAgoData(result.xpInfo, 0).gainedXp
        : type === 'weekly'
        ? getSevenDaysXpSum(result.xpInfo)
        : result.userInfo.totalXp;
      
      return `#${index + 1}. ${result.userInfo.username}: ${xp}`;
    }).join('\n');

    return `EXP 排行榜（${type === 'daily' ? '今日' : type === 'weekly' ? '本周' : '总榜'}）：\n${rankInfo}`;
  });

    // 定义 duolingo/info 命令
    ctx.command('duolingo/info <username:string>')
      .action(async ({ session }, username) => {
            let userId: number;

            if (!username) {
                const userQid = Number(session.event.user.id);
                const existing = await ctx.database.get('duolingo', { user_qid: userQid });

                if (existing.length > 0) {
                    userId = existing[0].user_did;
                } else {
                    return "未指定用户";
                }
            } else {
                userId = await getUserId(username);
            }

            const data = await getUserInfoById(userId);

            if (!data) {
                return "未找到该用户信息。";
            }

            const template = `用户名：${data.username}
ID：${data.id}
注册日期：${convertTimestampToChineseDate(data.creationDate)}
当前连胜：${data.streak}
连胜纪录：${data.streakData.longestStreak.length} 天（从 ${data.streakData.longestStreak.startDate} 到 ${data.streakData.longestStreak.endDate}）
总 EXP：${data.totalXp}
当前正在学习：${data.courses.map(course => course.title).join(', ')}
最近刷题：${convertTimestampToChineseDate(data.streakData.updatedTimestamp)} ${(data.hasPlus ? "\n 是尊贵的 Plus 用户。" : "")}
---
${isTimestampToday(data.streakData.updatedTimestamp) ? "Ta 今天续杯成功！(≧∇≦)ﾉ" : "Ta 今天还没有刷题呢，赶紧去续杯吧～(´･ω･)ﾉ(._.`)"}
---
输入"streak${username? " " + username : ""}"获取详细连胜信息。`;

            return template;
        });

    // 定义 duolingo/streak 命令
    ctx.command('duolingo/streak <username:string>')
      .action(async ({ session }, username) => {
            let userId: number;

            if (!username) {
                const userQid = Number(session.event.user.id);
                const existing = await ctx.database.get('duolingo', { user_qid: userQid });

                if (existing.length > 0) {
                    userId = existing[0].user_did;
                } else {
                    return "未指定用户";
                }
            } else {
                userId = await getUserId(username);
            }

            const data = await getUserInfoById(userId);

            if (!data) {
                return "未找到该用户信息。";
            }

            const streakData = data.streakData;
            const template = `用户名：${data.username}
当前连胜信息：
  - 开始日期：${streakData.currentStreak.startDate}
  - 结束日期：${streakData.currentStreak.endDate}
  - 连胜长度：${streakData.currentStreak.length} 天
  - 最后延长日期：${streakData.currentStreak.lastExtendedDate}
最长连胜信息：
  - 开始日期：${streakData.longestStreak.startDate}
  - 结束日期：${streakData.longestStreak.endDate}
  - 连胜长度：${streakData.longestStreak.length} 天
  - 达成日期：${streakData.longestStreak.achieveDate}
EXP 目标：${streakData.xpGoal}，向着目标冲呀！(ง・̀_・́)ง`;

            return template;
        });

    // 定义 duolingo/bind 命令
    ctx.command('duolingo/bind <username:string>')
      .action(async ({ session }, username) => {
            // 获取用户 QQ ID
            const userId = Number(session.event.user.id);

            // 查询是否已绑定
            const existing = await ctx.database.get('duolingo', { user_qid: userId });

            if (existing.length > 0) {
                return `你已经绑定过 Duolingo 账号啦！（绑定 ID：${existing[0].user_did}）`;
            }

            // 获取 Duolingo 用户 ID
            const duolingoId = await getUserId(username);

            if (!duolingoId) {
                return "找不到该 Duolingo 用户，请检查用户名是否正确。";
            }

            // 写入数据库
            await ctx.database.create('duolingo', {
                user_qid: userId,
                user_did: duolingoId,
                yesterday_exp: 0, // 初始化昨日经验
                lastweek_exp: 0 // 初始化上周经验
            });

            return `绑定成功！🎉
QQ 号：${userId}
Duolingo 用户名：${username}
对应 ID：${duolingoId}`;
        });

    ctx.command('duolingo/update', { authority: 3 })
      .action(async ({ session }) => {
            updateUserExperience(ctx);
            return "更新操作成功";
      });
    
    ctx.command('duolingo/calendar [username:string]')
        .alias('cal', 'cld', 'exp')
        .action(async ({ session }, username) => {

            session?.send("少女祈祷中...")

            let userId: number;
            if (!username) {
                const userQid = Number(session.event.user.id);
                const existing = await ctx.database.get('duolingo', { user_qid: userQid });

                if (existing.length > 0) {
                    userId = existing[0].user_did;
                } else {
                    return "未指定用户";
                }
            } else {
                userId = await getUserId(username);
            }

            let name: string;
            if (username) name = username;
            else name = (await getUserInfoById(userId)).username;

            const XpSummaries = await getXpSummariesByUserId(userId);
            if (!XpSummaries) {
                return "获取数据失败";
            }
            XpSummaries.summaries.sort((a, b) => a.date - b.date);

            let template: string = `<message>${name} 的经验值日历：</message>`;
            XpSummaries.summaries.forEach(summary => {
                const date = convertTimestampToChineseDate(summary.date);
                template += `<message>日期: ${date} (${getWeekday(summary.date)})\n`;
                template += `  - 获得经验值: ${summary.gainedXp ? summary.gainedXp : '无'}\n`;
                template += `  - 内卷次数: ${summary.numSessions ? summary.numSessions : '无'}\n`;
                template += `  - 总内卷时间: ${summary.totalSessionTime ? summary.totalSessionTime : '无'}</message>`;
            });
            template += `<message>今天也不要忘记内卷哦 ～(ง・̀_・́)ง</message>`
            return `<message forward>${template}</message>`;

        });
}
