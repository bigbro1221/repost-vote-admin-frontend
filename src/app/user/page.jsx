'use client';
export const dynamic = 'force-dynamic';

import {useEffect, useMemo, useRef, useState} from 'react';
import useSWR from 'swr';
import classNames from 'classnames';
import {CalendarRange, ChevronLeft, ChevronRight, Download, Search, Users, X} from 'lucide-react';
import {fetchUsersInRange} from '@/shared/api/users.api';
import DatePickerClient from '@/shared/ui/DatePickerClient';
import Button from '@/shared/ui/Button';
import {Card, EmptyState, PageHeader, Skeleton} from '@/shared/ui/Card';
import {errorMessage} from '@/shared/api/errors';
import {fmtDate, fmtNum, plural} from '@/shared/lib/format';

const PAGE = 50;
const ymd = d => d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : undefined;
const rangeLabel = r => !r ? 'За всё время'
    : ymd(r.startDate) === ymd(r.endDate) ? fmtDate(r.startDate) : `${fmtDate(r.startDate)} — ${fmtDate(r.endDate)}`;

// registrations per day for the mini chart
const histogram = users => {
    const m = new Map();
    users.forEach(u => { const k = (u.createdAt ?? '').slice(0, 10); if (k) m.set(k, (m.get(k) ?? 0) + 1); });
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
};

const Sparkbars = ({data}) => {
    const days = data.slice(-90);
    const max = Math.max(1, ...days.map(([, v]) => v));
    if (days.length < 2) return null;
    return (
        <div className="flex h-12 items-end gap-[2px]" aria-hidden>
            {days.map(([d, v]) => (
                <div key={d} title={`${fmtDate(d)}: ${v}`} className="max-w-[14px] flex-1 rounded-t-sm bg-brand-blue/70 transition hover:bg-brand-blue" style={{height: `${Math.max(6, (v / max) * 100)}%`}}/>
            ))}
        </div>
    );
};

export default function Page() {
    const [range, setRange] = useState(null); // null = all time
    const [draft, setDraft] = useState([{startDate: new Date(), endDate: new Date(), key: 'selection'}]);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(0);
    const popRef = useRef(null);

    const params = range ? {startDate: ymd(range.startDate), endDate: ymd(range.endDate)} : {};
    const {data: users, isLoading, error} = useSWR(['users', params.startDate ?? '', params.endDate ?? ''], () => fetchUsersInRange(params));

    useEffect(() => {
        if (!pickerOpen) return;
        const onDoc = e => { if (!popRef.current?.contains(e.target)) setPickerOpen(false); };
        const onKey = e => e.key === 'Escape' && setPickerOpen(false);
        document.addEventListener('mousedown', onDoc);
        document.addEventListener('keydown', onKey);
        return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
    }, [pickerOpen]);

    const q = query.trim().toLowerCase().replace(/^@/, '');
    const filtered = useMemo(() => {
        const list = [...(users ?? [])].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
        if (!q) return list;
        return list.filter(u => [u.tg_id, u.username, u.phone].some(v => String(v ?? '').toLowerCase().replace(/^@/, '').includes(q)));
    }, [users, q]);
    useEffect(() => setPage(0), [q, range]);
    const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
    const rows = filtered.slice(page * PAGE, page * PAGE + PAGE);
    const hist = useMemo(() => histogram(users ?? []), [users]);

    const exportCsv = () => {
        const lines = [['tg_id', 'username', 'phone', 'createdAt'].join(',')]
            .concat(filtered.map(u => [u.tg_id, u.username ?? '', u.phone ?? '', u.createdAt ?? ''].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')));
        const url = URL.createObjectURL(new Blob(['﻿' + lines.join('\n')], {type: 'text/csv;charset=utf-8'}));
        const a = Object.assign(document.createElement('a'), {href: url, download: `users-${params.startDate ?? 'all'}-${params.endDate ?? ''}.csv`});
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <>
            <PageHeader title="Пользователи" description="Зарегистрированные в боте пользователи (общие для всех лет)."
                        actions={<Button icon={Download} disabled={!filtered.length} onClick={exportCsv}>CSV</Button>}/>

            <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                <Card className="px-5 py-4">
                    <div className="flex items-center gap-2 text-[13px] font-medium text-zinc-500"><Users size={15} className="text-zinc-400"/>{range ? 'Зарегистрировались' : 'Всего пользователей'}</div>
                    <div className="mt-2 text-3xl font-semibold tracking-tight tabular" data-testid="users-count">
                        {users ? fmtNum(users.length) : <Skeleton className="h-9 w-24"/>}
                    </div>
                    <div className="mt-0.5 text-xs text-zinc-500">{rangeLabel(range)}</div>
                </Card>
                <Card className="flex flex-col justify-between px-5 py-4">
                    <div className="text-[13px] font-medium text-zinc-500">Регистрации по дням {hist.length > 90 ? '(последние 90 дней с регистрациями)' : ''}</div>
                    <div className="mt-2">{users ? (hist.length > 1 ? <Sparkbars data={hist}/> : <div className="text-sm text-zinc-400">Недостаточно данных</div>) : <Skeleton className="h-12"/>}</div>
                </Card>
            </div>

            <Card>
                <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 p-3">
                    <div className="relative min-w-[220px] flex-1">
                        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"/>
                        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Поиск: tg id, @username, телефон"
                               className="h-10 w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-3 text-sm placeholder:text-zinc-400 focus:border-brand-blue focus:outline-none focus:ring-4 focus:ring-brand-blue/15"/>
                    </div>
                    <div className="relative" ref={popRef}>
                        <Button icon={CalendarRange} onClick={() => setPickerOpen(o => !o)} className={classNames(range && '!border-sky-300 !bg-sky-50 !text-sky-800')}>
                            {rangeLabel(range)}
                        </Button>
                        {pickerOpen && (
                            <div className="absolute right-0 z-30 mt-2 max-w-[calc(100vw-2rem)] animate-scale-in overflow-x-auto rounded-2xl border border-zinc-200 bg-white p-2 shadow-pop">
                                <DatePickerClient value={draft} onChange={d => setDraft([d.selection])}/>
                                <div className="flex justify-end gap-2 border-t border-zinc-100 px-2 pt-2">
                                    <Button size="sm" variant="ghost" onClick={() => { setRange(null); setPickerOpen(false); }}>За всё время</Button>
                                    <Button size="sm" variant="dark" onClick={() => { setRange(draft[0]); setPickerOpen(false); }}>Применить</Button>
                                </div>
                            </div>
                        )}
                    </div>
                    {range && <Button variant="ghost" size="icon" icon={X} onClick={() => setRange(null)} aria-label="Сбросить период"/>}
                </div>

                {error && <EmptyState icon={Users} title="Не удалось загрузить пользователей" description={errorMessage(error)}/>}
                {isLoading && <div className="grid gap-2 p-4">{Array.from({length: 8}, (_, i) => <Skeleton key={i} className="h-10"/>)}</div>}
                {users && !filtered.length && <EmptyState icon={Search} title="Никого не найдено" description="Измените период или поисковый запрос."/>}

                {rows.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px] text-sm">
                            <thead>
                                <tr className="border-b border-zinc-100 text-left text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                                    <th className="px-5 py-2.5 font-medium">#</th>
                                    <th className="px-3 py-2.5 font-medium">Telegram ID</th>
                                    <th className="px-3 py-2.5 font-medium">Username</th>
                                    <th className="px-3 py-2.5 font-medium">Телефон</th>
                                    <th className="px-5 py-2.5 text-right font-medium">Регистрация</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {rows.map((u, i) => (
                                    <tr key={u._id} className="transition hover:bg-zinc-50/70">
                                        <td className="px-5 py-2.5 text-zinc-400 tabular">{page * PAGE + i + 1}</td>
                                        <td className="px-3 py-2.5 text-zinc-700 tabular">{u.tg_id}</td>
                                        <td className="px-3 py-2.5">
                                            {u.username
                                                ? <a href={`https://t.me/${String(u.username).replace(/^@/, '')}`} target="_blank" rel="noreferrer" className="font-medium text-brand-blue hover:underline">@{String(u.username).replace(/^@/, '')}</a>
                                                : <span className="text-zinc-300">—</span>}
                                        </td>
                                        <td className="px-3 py-2.5 text-zinc-700 tabular">{u.phone ? (String(u.phone).startsWith('+') ? u.phone : `+${u.phone}`) : '—'}</td>
                                        <td className="px-5 py-2.5 text-right text-zinc-500 tabular">{fmtDate(u.createdAt)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {filtered.length > 0 && (
                    <div className="flex items-center justify-between border-t border-zinc-100 px-5 py-3 text-[13px] text-zinc-500">
                        <span className="tabular">{fmtNum(page * PAGE + 1)}–{fmtNum(Math.min(filtered.length, (page + 1) * PAGE))} из {fmtNum(filtered.length)} {plural(filtered.length, 'пользователя', 'пользователей', 'пользователей')}</span>
                        <div className="flex items-center gap-1">
                            <Button size="icon-sm" variant="secondary" icon={ChevronLeft} disabled={page === 0} onClick={() => setPage(p => p - 1)} aria-label="Назад"/>
                            <span className="px-2 tabular">{page + 1} / {pages}</span>
                            <Button size="icon-sm" variant="secondary" icon={ChevronRight} disabled={page >= pages - 1} onClick={() => setPage(p => p + 1)} aria-label="Вперёд"/>
                        </div>
                    </div>
                )}
            </Card>
        </>
    );
}
