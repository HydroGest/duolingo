// 定义响应数据的类型
export interface UserResponse {
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

export interface Course {
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

export interface StreakData {
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


export interface XpSummary {
    gainedXp: number | null;
    frozen: boolean;
    streakExtended: boolean;
    date: number;
    userId: number;
    repaired: boolean;
    dailyGoalXp: number | null;
    numSessions: number | null;
    totalSessionTime: number | null;
}

// 定义XpSummariesResponse接口
export interface XpSummariesResponse {
    summaries: XpSummary[];
}

// 这里是新增表的接口类型
export interface Duolingo {
    id: number;
    user_qid: number;
    user_did: number;
    yesterday_exp: number;
    lastweek_exp: number;
}
