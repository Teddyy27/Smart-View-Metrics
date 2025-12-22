export const isCurrentMonthKey = (ts: string) => {
    if (!ts || ts.length < 7) return false;

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    return ts.startsWith(`${year}-${month}`);
};

export const calculateMonthlyDevicePower = (
    power_log?: Record<string, number>
) => {
    if (!power_log) return { latest: 0, total: 0 };

    const entries = Object.entries(power_log);
    if (entries.length === 0) return { latest: 0, total: 0 };

    // latest (string timestamp safe)
    entries.sort(([a], [b]) => b.localeCompare(a));
    const latest = Number(entries[0][1]) || 0;

    // monthly total (watts-minute)
    const totalWattsMinutes = entries.reduce((sum, [ts, val]) => {
        if (!isCurrentMonthKey(ts)) return sum;
        return sum + (Number(val) || 0);
    }, 0);

    return {
        latest,                         // watts
        total: totalWattsMinutes / 1000 / 60 // kWh
    };
};
