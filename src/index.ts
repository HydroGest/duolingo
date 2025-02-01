import {
    Context,
    Schema
} from 'koishi';

export const name = 'duolingo';

export interface Config {}

export const Config: Schema<Config> = Schema.object({});

export const inject = ['database'];

// 定义响应数据的类型
interface UserResponse {
    achievements: any[];
    hasFacebookId: boolean;
    totalXp: number;
    id: number;
    acquisitionSurveyReason: string;
    fromLanguage: string;
    picture: string;
    canUseModerationTools: boolean;
    emailVerified: boolean;
    currentCourseId: string;
    joinedClassroomIds: number[];
    hasPhoneNumber: boolean;
    hasRecentActivity15: boolean;
    courses: Course[];
    streak: number;
    creationDate: number;
    name: string;
    _achievements: any[];
    globalAmbassadorStatus: Record<string, unknown>;
    roles: string[];
    motivation: string;
    hasPlus: boolean;
    observedClassroomIds: number[];
    hasGoogleId: boolean;
    privacySettings: string[];
    streakData: StreakData;
    learningLanguage: string;
    subscriberLevel: string;
    username: string;
}

interface Course {
    preload: boolean;
    placementTestAvailable: boolean;
    authorId: string;
    title: string;
    learningLanguage: string;
    xp: number;
    healthEnabled: boolean;
    fromLanguage: string;
    id: string;
    crowns: number;
}

interface StreakData {
    currentStreak: {
        endDate: string;
        length: number;
        lastExtendedDate: string;
        startDate: string;
    };
    previousStreak: null | {
        endDate: string;
        length: number;
        lastExtendedDate: string;
        startDate: string;
    };
    length: number;
    xpGoal: number;
    longestStreak: {
        endDate: string;
        length: number;
        achieveDate: string;
        startDate: string;
    };
    churnedStreakTimestamp: number;
    updatedTimeZone: string;
    updatedTimestamp: number;
    startTimestamp: number;
}

declare module 'koishi' {
    interface Tables {
        duolingo: Duolingo;
    }
}

// 这里是新增表的接口类型
export interface Duolingo {
    id: number;
    user_qid: number;
    user_did: number;
    yesterday_exp: number;
    lastweek_exp: number;
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

// 将时间戳转换为中文日期格式
function convertTimestampToChineseDate(timestamp: number): string {
    const date = new Date(timestamp * 1000);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}年${month}月${day}日`;
}

// 计算到下一个目标时间的延迟
function getDelayToNext(hour: number) {
    const now = new Date();
    const target = new Date(now);
    target.setHours(hour, 0, 0, 0);

    if (now > target) {
        target.setDate(target.getDate() + 1);
    }

    return target.getTime() - now.getTime();
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

export function apply(ctx: Context) {
    // 首次延迟执行
    ctx.setTimeout(() => {
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
      .action(async ({ session }, type = 'total') => {
        const users = await ctx.database.get('duolingo', {});
        if (type === "total") session?.send("请稍候，数据获取中...")
        // 过滤掉数据为0的用户
        const validUsers = users.filter(user => {
            if (type === 'daily') {
                return user.yesterday_exp > 0;
            } else if (type === 'weekly') {
                return user.lastweek_exp > 0;
            }
            return true;
        });

        // 根据不同类型计算XP值并排序
        const sortedUsers = validUsers.sort((a, b) => {
            let xpA: number, xpB: number;
            if (type === 'daily') {
                xpA = a.yesterday_exp;
                xpB = b.yesterday_exp;
            } else if (type === 'weekly') {
                xpA = a.lastweek_exp;
                xpB = b.lastweek_exp;
            } else {
                xpA = await getUserInfoById(a.user_did);
                xpB = await getUserInfoById(b.user_did);
            }
            return xpB - xpA;
        });

        // 生成排行榜信息
        let rankInfo = '';
        for (let i = 0; i < sortedUsers.length; i++) {
            const user = sortedUsers[i];
            const userId = user.user_did;
            const xp = type === 'daily' ? user.yesterday_exp : user.lastweek_exp;
            rankInfo += `#${i + 1}. ${await getUserInfoById(userId).username}: ${xp}\n`;
        }

        if (rankInfo === '') {
            return '没有符合条件的用户数据';
        }

        return `EXP 排行榜（${type === 'daily' ? '今日' : (type === 'weekly' ? "本周" : "总榜")}）：\n${rankInfo}`;
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
最近刷题：${convertTimestampToChineseDate(data.streakData.updatedTimestamp)}
---
${isTimestampToday(data.streakData.updatedTimestamp)? "Ta 今天续杯成功！" : "Ta 今天还没有刷题呢，赶紧去续杯吧~"}
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
EXP 目标：${streakData.xpGoal}`;

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
}
