const STATIC_URL = process.env.NEXT_PUBLIC_STATIC_URL;

export const photoUrl = photo => {
    if (!photo || typeof photo !== 'string') return null;
    if (/^(https?:|blob:|data:)/.test(photo)) return photo;
    return `${STATIC_URL}/${photo}`;
};

export const fmtNum = n => (Number(n) || 0).toLocaleString('ru-RU');

// plural('кандидат', 'кандидата', 'кандидатов')
export const plural = (n, one, few, many) => {
    const a = Math.abs(n) % 100, b = a % 10;
    if (a > 10 && a < 20) return many;
    if (b > 1 && b < 5) return few;
    if (b === 1) return one;
    return many;
};
export const pl = (n, one, few, many) => `${fmtNum(n)} ${plural(n, one, few, many)}`;

export const fmtDate = d => d ? new Date(d).toLocaleDateString('ru-RU', {day: 'numeric', month: 'short', year: 'numeric'}) : '';
export const fmtDateTime = d => d ? new Date(d).toLocaleString('ru-RU', {day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'}) : '';
export const fmtShort = d => d ? new Date(d).toLocaleDateString('ru-RU', {day: 'numeric', month: 'short'}) : '';

export const timeAgo = d => {
    if (!d) return '';
    const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
    if (s < 60) return 'только что';
    const m = Math.round(s / 60);
    if (m < 60) return `${m} мин назад`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h} ${plural(h, 'час', 'часа', 'часов')} назад`;
    const days = Math.round(h / 24);
    if (days < 30) return `${days} ${plural(days, 'день', 'дня', 'дней')} назад`;
    return fmtDate(d);
};

// vote stats of a candidate from /nomination/full or /candidate/rating
export const voteStats = c => {
    const pro = c?.for?.count ?? 0;
    const con = c?.against?.count ?? 0;
    const n = pro + con;
    const support = c?.support ?? (n ? Math.round(100 * pro / n) : 0);
    return {pro, con, n, support, score: c?.score ?? 0, rating: c?.rating};
};

export const byOrder = (a, b) => ((a.order ?? 0) - (b.order ?? 0)) || String(a._id).localeCompare(String(b._id));
