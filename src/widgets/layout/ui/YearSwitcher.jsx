'use client';
import {useEffect, useRef, useState} from 'react';
import classNames from 'classnames';
import {mutate} from 'swr';
import {Check, ChevronsUpDown} from 'lucide-react';
import {useEditionStore} from '@/shared/store/edition.store';
import {EDITION_STATUS} from '@/shared/ui/Badge';

const DOT = {draft: 'bg-zinc-400', active: 'bg-emerald-500', closed: 'bg-amber-500'};
const PILL = {
    draft: 'bg-white/10 text-zinc-300',
    active: 'bg-emerald-400/15 text-emerald-300',
    closed: 'bg-amber-400/15 text-amber-300',
};

export const StatusDot = ({status, pulse}) => (
    <span className="relative flex h-2 w-2">
        {pulse && status === 'active' && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60"/>}
        <span className={classNames('relative inline-flex h-2 w-2 rounded-full', DOT[status] ?? 'bg-zinc-400')}/>
    </span>
);

const YearSwitcher = ({collapsed}) => {
    const {year, editions, setYear} = useEditionStore();
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const current = editions.find(e => e.year === year);

    useEffect(() => {
        if (!open) return;
        const onDoc = e => { if (!ref.current?.contains(e.target)) setOpen(false); };
        const onKey = e => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', onDoc);
        document.addEventListener('keydown', onKey);
        return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
    }, [open]);

    const choose = y => {
        setOpen(false);
        if (y === year) return;
        setYear(y);
        mutate(() => true, undefined, {revalidate: true});
    };

    if (!editions.length) return <div className={classNames('skeleton !bg-white/10', collapsed ? 'mx-auto h-11 w-11 rounded-xl' : 'h-[58px] rounded-xl')}/>;

    return (
        <div ref={ref} className="relative">
            <button type="button" onClick={() => setOpen(o => !o)} title={collapsed ? `Год ${year}` : undefined}
                    data-testid="year-switcher"
                    className={classNames('group flex w-full items-center gap-3 rounded-xl bg-white/[.06] text-left ring-1 ring-white/10 transition hover:bg-white/10',
                        collapsed ? 'h-11 justify-center px-0' : 'px-3 py-2.5')}>
                {collapsed ? (
                    <span className="flex flex-col items-center text-[11px] font-semibold leading-none text-white">
                        {String(year).slice(2)}
                        <span className="mt-1"><StatusDot status={current?.status} pulse/></span>
                    </span>
                ) : (
                    <>
                        <div className="min-w-0 flex-1">
                            <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Год рейтинга</div>
                            <div className="mt-0.5 flex items-center gap-2">
                                <span className="text-lg font-semibold leading-none text-white tabular">{year}</span>
                                {current && (
                                    <span className={classNames('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium', PILL[current.status])}>
                                        <StatusDot status={current.status} pulse/>
                                        {EDITION_STATUS[current.status]?.short ?? EDITION_STATUS[current.status]?.label}
                                    </span>
                                )}
                            </div>
                        </div>
                        <ChevronsUpDown size={16} className="text-zinc-500 group-hover:text-zinc-300"/>
                    </>
                )}
            </button>
            {open && (
                <div className={classNames('absolute z-50 mt-2 w-60 animate-scale-in overflow-hidden rounded-xl border border-zinc-200 bg-white p-1 shadow-pop',
                    collapsed ? 'left-0' : 'left-0 right-0 w-auto')}>
                    {[...editions].sort((a, b) => b.year - a.year).map(ed => (
                        <button key={ed.year} type="button" onClick={() => choose(ed.year)}
                                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-zinc-100">
                            <span className="font-semibold tabular text-zinc-900">{ed.year}</span>
                            <span className="flex flex-1 items-center gap-1.5 text-xs text-zinc-500">
                                <StatusDot status={ed.status}/>{EDITION_STATUS[ed.status]?.label ?? ed.status}
                            </span>
                            {ed.year === year && <Check size={16} className="text-brand-blue"/>}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default YearSwitcher;
