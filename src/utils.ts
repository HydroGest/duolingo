// 将时间戳转换为中文日期格式
export function convertTimestampToChineseDate(timestamp: number): string {
    const date = new Date(timestamp * 1000);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}年${month}月${day}日`;
}

// 计算到下一个目标时间的延迟
export function getDelayToNext(hour: number) {
    const now = new Date();
    const target = new Date(now);
    target.setHours(hour, 0, 0, 0);

    if (now > target) {
        target.setDate(target.getDate() + 1);
    }

    return target.getTime() - now.getTime();
}

export function getWeekday(timestrap: number): string {
    const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const date = new Date(timestrap * 1000);
    const weekDayIndex = date.getUTCDay();
    const weekDay = weekDays[weekDayIndex];
    return weekDay;
}
