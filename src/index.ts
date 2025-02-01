import { Context, Schema } from 'koishi'

export const name = 'duolingo'

export interface Config { }

export const Config: Schema<Config> = Schema.object({})

export const inject = ['database']

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
    schedule: Schedule
  }
}

// 这里是新增表的接口类型
export interface Duolingo {
  id: number
  user_qid: number
  user_did: string
  yesterday_exp: number
  lastweek_exp: number
}

ctx.model.extend('duolingo', {
  // 各字段的类型声明
  id: 'unsigned',
  user_qid: 'unsigned',
  user_did: 'string',
  yesterday_exp: 'unsigned',
  lastweek_exp: 'unsigned'
})

function isTimestampToday(timestamp: number): boolean {
    // 将传入的时间戳转换为 Date 对象，注意时间戳通常以秒为单位，而 Date 构造函数需要毫秒，所以要乘以 1000
    const targetDate = new Date(timestamp * 1000);
    // 获取当前日期的 Date 对象
    const currentDate = new Date();

    // 分别获取目标日期和当前日期的年、月、日
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth();
    const targetDay = targetDate.getDate();

    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    const currentDay = currentDate.getDate();

    // 比较年、月、日是否都相同，如果都相同则表示是今天
    return targetYear === currentYear && targetMonth === currentMonth && targetDay === currentDay;
}

// 定义函数，使用 async/await 处理异步请求
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

function convertTimestampToChineseDate(timestamp: number): string {
    // 由于 JavaScript 的 Date 对象接受的时间戳是以毫秒为单位，所以这里要把秒转换为毫秒
    const date = new Date(timestamp * 1000);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    // 拼接成中文日期格式
    return `${year}年${month}月${day}日`;
}

export function apply(ctx: Context) {
    ctx.command('duolingo/info <username:string>')
        .action(async ({ session }, username) => {
            // await session?.send("正在搜索...");
            const userId = await getUserId(username);
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
${isTimestampToday(data.streakData.updatedTimestamp) ? "Ta 今天续杯成功！" : "Ta 今天还没有刷题呢，赶紧去续杯吧~"}
---
输入"streak ${username}"获取详细连胜信息。`;
            return template;
        });
    ctx.command('duolingo/streak <username:string>')
        .action(async ({ session }, username) => {
            // session?.send("正在搜索...");
            const userId = await getUserId(username);
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
}
