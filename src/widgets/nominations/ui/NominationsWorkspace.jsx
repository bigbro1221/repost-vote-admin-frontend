'use client';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import useSWR from 'swr';
import {usePathname, useRouter, useSearchParams} from 'next/navigation';
import {DragDropContext, Droppable} from 'react-beautiful-dnd';
import {
    CalendarClock, ChevronsDownUp, ChevronsUpDown, Plus, Search, SearchX, Trophy, Users, Vote, X,
} from 'lucide-react';
import {deleteNomination, fetchNominationsFull, updateNominationOrder} from '@/shared/api/nominations.api';
import {updateCandidateOrder} from '@/shared/api/candidates.api';
import {useEditionStore} from '@/shared/store/edition.store';
import {useUiStore} from '@/shared/store/ui.store';
import Button from '@/shared/ui/Button';
import Badge, {EDITION_STATUS} from '@/shared/ui/Badge';
import {Card, EmptyState, PageHeader, Skeleton} from '@/shared/ui/Card';
import {toast} from '@/shared/ui/toast';
import {confirmAction} from '@/shared/ui/confirm';
import {errorCode, errorMessage} from '@/shared/api/errors';
import {byOrder, fmtNum, fmtShort, pl, plural} from '@/shared/lib/format';
import NominationDialog from '@/features/nomination/ui/nomination-form';
import CandidateSheet from '@/widgets/candidate/ui/CandidateSheet';
import NominationSection from './NominationSection';

const norm = s => String(s ?? '').toLowerCase().replace(/ё/g, 'е');

const StatTile = ({icon: Icon, label, value, hint, accent}) => (
    <Card className="relative overflow-hidden px-4 py-4">
        <div className="flex items-center gap-2 text-[13px] font-medium text-zinc-500">
            <Icon size={15} className="text-zinc-400"/>{label}
        </div>
        <div className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 tabular">{value}</div>
        {hint && <div className="mt-0.5 truncate text-xs text-zinc-500">{hint}</div>}
        {accent && <div className={`absolute inset-x-0 bottom-0 h-0.5 ${accent}`}/>}
    </Card>
);

const reorder = (list, from, to) => {
    const copy = list.slice();
    const [item] = copy.splice(from, 1);
    copy.splice(to, 0, item);
    return copy.map((x, i) => ({...x, order: i}));
};

export default function NominationsWorkspace() {
    const router = useRouter();
    const pathname = usePathname();
    const params = useSearchParams();
    const {year, editions} = useEditionStore();
    const edition = editions.find(e => e.year === year);
    const wilson = edition?.ratingFormula === 'wilson';

    const key = year ? ['nominations-full', year] : null;
    const {data, error, isLoading, mutate} = useSWR(key, () => fetchNominationsFull(year), {revalidateOnFocus: false});

    const {open, setOpen, setAllOpen} = useUiStore();
    const openMap = open[year] ?? {};
    const [query, setQuery] = useState('');
    const [dragType, setDragType] = useState(null);
    const [nomDialog, setNomDialog] = useState(null); // {} create | nomination edit
    const searchRef = useRef(null);

    const nominations = useMemo(() => (data?.result ?? [])
        .map(n => ({...n, candidates: [...(n.candidates ?? [])].sort(byOrder)}))
        .sort(byOrder), [data]);

    const totals = useMemo(() => {
        const candidates = nominations.reduce((s, n) => s + n.candidates.length, 0);
        const news = nominations.reduce((s, n) => s + n.candidates.reduce((a, c) => a + (c.newsCount ?? 0), 0), 0);
        const votes = data?.totalCount ?? nominations.reduce((s, n) => s + (n.votes ?? 0), 0);
        return {candidates, news, votes};
    }, [nominations, data]);

    // ---- URL state: ?c=<id>&tab=news | ?new=<nominationId> | ?n=<nominationId> | ?newNomination=1
    const setParams = useCallback(patch => {
        const p = new URLSearchParams(params.toString());
        Object.entries(patch).forEach(([k, v]) => (v == null ? p.delete(k) : p.set(k, v)));
        const qs = p.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname, {scroll: false});
    }, [params, pathname, router]);

    const cParam = params.get('c');
    const newParam = params.get('new');
    const tab = params.get('tab') === 'news' ? 'news' : 'profile';
    const sheetMode = cParam
        ? {type: 'edit', id: cParam}
        : newParam && nominations.length
            ? {type: 'create', nomination: nominations.some(n => n._id === newParam) ? newParam : nominations[0]._id}
            : null;

    useEffect(() => {
        if (params.get('newNomination')) { setNomDialog({}); setParams({newNomination: null}); }
    }, [params]);

    // ?n=<id>: expand + scroll into view once data is there
    useEffect(() => {
        const n = params.get('n');
        if (!n || !nominations.length || !year) return;
        setOpen(year, n, true);
        setTimeout(() => document.getElementById(`nom-${n}`)?.scrollIntoView({behavior: 'smooth', block: 'start'}), 80);
        setParams({n: null});
    }, [params, nominations.length, year]);

    // "/" focuses search
    useEffect(() => {
        const onKey = e => {
            if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) && !document.activeElement?.isContentEditable) {
                e.preventDefault();
                searchRef.current?.focus();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    // ---- search
    const q = norm(query.trim());
    const filtered = useMemo(() => {
        if (!q) return nominations;
        return nominations.map(n => {
            const nomHit = norm(n.ru?.name).includes(q) || norm(n.uz?.name).includes(q);
            const candidates = nomHit ? n.candidates : n.candidates.filter(c =>
                [c.ru?.name, c.uz?.name, c.ru?.description, c.uz?.description].some(v => norm(v).includes(q)));
            return {...n, candidates, _hits: candidates.length, _nomHit: nomHit};
        }).filter(n => n._nomHit || n._hits);
    }, [nominations, q]);
    const hitCount = q ? filtered.reduce((s, n) => s + n.candidates.length, 0) : 0;

    const allOpen = nominations.length > 0 && nominations.every(n => openMap[n._id]);
    const toggleAll = () => setAllOpen(year, nominations.map(n => n._id), !allOpen);

    // ---- drag & drop (disabled while searching)
    const onDragEnd = async ({type, source, destination, draggableId}) => {
        setDragType(null);
        if (!destination || destination.index === source.index && destination.droppableId === source.droppableId) return;
        if (type === 'NOMINATION') {
            const next = reorder(nominations, source.index, destination.index);
            mutate({...data, result: next}, {revalidate: false});
            try {
                await updateNominationOrder({ids: next.map(n => n._id)});
                toast.success('Порядок номинаций сохранён');
            } catch (e) {
                toast.fromError(e, 'Не удалось изменить порядок');
            }
            mutate();
            return;
        }
        // candidates: only within the same nomination
        if (source.droppableId !== destination.droppableId) {
            toast.info('Перенос между номинациями', 'Чтобы перенести кандидата, смените номинацию в его профиле');
            return;
        }
        const nomId = source.droppableId.replace('cands:', '');
        const nom = nominations.find(n => n._id === nomId);
        if (!nom) return;
        const nextCands = reorder(nom.candidates, source.index, destination.index);
        mutate({...data, result: nominations.map(n => n._id === nomId ? {...n, candidates: nextCands} : n)}, {revalidate: false});
        try {
            await updateCandidateOrder({nomination: nomId, ids: nextCands.map(c => c._id)});
            toast.success('Порядок кандидатов сохранён');
        } catch (e) {
            toast.fromError(e, 'Не удалось изменить порядок');
        }
        mutate();
    };

    const removeNomination = async n => {
        const count = n.candidates.length;
        const ok = await confirmAction({
            tone: 'danger', confirmText: count ? `Удалить вместе с ${pl(count, 'кандидатом', 'кандидатами', 'кандидатами')}` : 'Удалить номинацию',
            title: `Удалить номинацию «${n.ru?.name}»?`,
            description: count
                ? `Вместе с ней будут удалены ${pl(count, 'кандидат', 'кандидата', 'кандидатов')} и их новости. Номинацию с голосами удалить нельзя. Действие необратимо.`
                : 'В номинации нет кандидатов. Действие необратимо.',
        });
        if (!ok) return;
        try {
            await deleteNomination(n._id);
            toast.success('Номинация удалена', n.ru?.name);
        } catch (e) {
            if (errorCode(e) === 'NOMINATION_HAS_VOTES') toast.error('Удаление запрещено', errorMessage(e));
            else toast.fromError(e, 'Не удалось удалить номинацию');
        }
        mutate();
    };

    const openCandidate = (id, t = 'profile') => setParams({c: id, tab: t === 'news' ? 'news' : null, new: null});
    const closeSheet = () => setParams({c: null, tab: null, new: null});
    const addCandidate = nomId => setParams({new: nomId, c: null, tab: null});

    const nextOrder = sheetMode?.type === 'create'
        ? Math.max(-1, ...(nominations.find(n => n._id === sheetMode.nomination)?.candidates ?? []).map(c => c.order ?? 0)) + 1
        : undefined;

    const status = EDITION_STATUS[edition?.status];

    return (
        <>
            <PageHeader
                eyebrow={edition?.title?.ru ?? (year ? `Народный рейтинг ${year}` : ' ')}
                title="Номинации"
                description="Номинации и кандидаты года. Перетаскивайте, чтобы изменить порядок; нажмите на кандидата, чтобы открыть профиль и новости."
                actions={<Button variant="primary" icon={Plus} onClick={() => setNomDialog({})}>Номинация</Button>}
            />

            <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {isLoading || !data ? [0, 1, 2, 3].map(i => <Skeleton key={i} className="h-[104px] rounded-2xl"/>) : <>
                    <StatTile icon={Trophy} label="Номинации" value={fmtNum(nominations.length)} hint={`${year} год`}/>
                    <StatTile icon={Users} label="Кандидаты" value={fmtNum(totals.candidates)} hint={`${pl(totals.news, 'новость', 'новости', 'новостей')} на сайте`}/>
                    <StatTile icon={Vote} label="Голоса" value={fmtNum(totals.votes)} hint={wilson ? 'формула Уилсона' : 'классическая формула'}
                              accent="bg-gradient-to-r from-brand-blue to-[#00d4ae]"/>
                    <StatTile icon={CalendarClock} label="Голосование"
                              value={<span className="flex items-center gap-2 text-lg">
                                  {status ? <Badge tone={status.tone} dot>{status.short ?? status.label}</Badge> : '—'}
                              </span>}
                              hint={edition?.votingStartAt ? `${fmtShort(edition.votingStartAt)} — ${fmtShort(edition.votingEndAt)}` : 'даты не заданы'}/>
                </>}
            </div>

            <div className="sticky top-14 z-20 -mx-4 mb-4 flex flex-wrap items-center gap-2 bg-zinc-50/85 px-4 py-2 backdrop-blur lg:top-0 lg:-mx-2 lg:px-2">
                <div className="relative min-w-[220px] flex-1">
                    <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"/>
                    <input ref={searchRef} value={query} onChange={e => setQuery(e.target.value)} data-testid="search"
                           onKeyDown={e => e.key === 'Escape' && setQuery('')}
                           placeholder="Поиск по кандидатам и номинациям…"
                           className="h-10 w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-16 text-sm shadow-soft placeholder:text-zinc-400 focus:border-brand-blue focus:outline-none focus:ring-4 focus:ring-brand-blue/15"/>
                    {query
                        ? <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700" aria-label="Очистить"><X size={14}/></button>
                        : <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-zinc-200 bg-zinc-50 px-1.5 text-[11px] font-medium text-zinc-400 sm:block">/</kbd>}
                </div>
                {q
                    ? <span className="px-1 text-[13px] text-zinc-500">Найдено: <b className="text-zinc-800">{hitCount}</b> {plural(hitCount, 'кандидат', 'кандидата', 'кандидатов')}</span>
                    : <Button variant="secondary" icon={allOpen ? ChevronsDownUp : ChevronsUpDown} onClick={toggleAll} disabled={!nominations.length}>
                        {allOpen ? 'Свернуть все' : 'Развернуть все'}
                    </Button>}
            </div>

            {error && (
                <Card className="p-2"><EmptyState icon={SearchX} title="Не удалось загрузить номинации" description={errorMessage(error)}
                                                  action={<Button onClick={() => mutate()}>Повторить</Button>}/></Card>
            )}

            {(isLoading || (!data && !error)) && (
                <div className="grid gap-3">{[0, 1, 2, 3, 4].map(i => <Skeleton key={i} className="h-[76px] rounded-2xl"/>)}</div>
            )}

            {data && !nominations.length && (
                <Card>
                    <EmptyState icon={Trophy} title={`В ${year} году пока нет номинаций`}
                                description="Создайте первую номинацию или скопируйте номинации и кандидатов из прошлого года в «Настройках года»."
                                action={<div className="flex gap-2">
                                    <Button variant="primary" icon={Plus} onClick={() => setNomDialog({})}>Создать номинацию</Button>
                                    <Button href="/edition">Настройки года</Button>
                                </div>}/>
                </Card>
            )}

            {data && q && !filtered.length && (
                <Card><EmptyState icon={SearchX} title="Ничего не найдено" description={`По запросу «${query}» нет кандидатов и номинаций.`}
                                  action={<Button onClick={() => setQuery('')}>Сбросить поиск</Button>}/></Card>
            )}

            {data && filtered.length > 0 && (
                <DragDropContext onBeforeCapture={({draggableId}) => setDragType(draggableId.startsWith('nom:') ? 'NOMINATION' : 'CANDIDATE')}
                                 onDragEnd={onDragEnd}>
                    <Droppable droppableId="nominations" type="NOMINATION" isDropDisabled={!!q}>
                        {provided => (
                            <div ref={provided.innerRef} {...provided.droppableProps} className="flex flex-col" data-testid="nominations">
                                {filtered.map((n, index) => (
                                    <NominationSection
                                        key={n._id}
                                        nomination={n}
                                        index={index}
                                        open={(q ? true : !!openMap[n._id]) && dragType !== 'NOMINATION'}
                                        onToggle={() => setOpen(year, n._id, !openMap[n._id])}
                                        dragDisabled={!!q}
                                        wilson={wilson}
                                        query={q}
                                        onOpenCandidate={openCandidate}
                                        onAddCandidate={() => addCandidate(n._id)}
                                        onEdit={() => setNomDialog(n)}
                                        onDelete={() => removeNomination(n)}
                                        activeCandidate={cParam}
                                    />
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
            )}

            <NominationDialog open={!!nomDialog} nomination={nomDialog} onClose={() => setNomDialog(null)}
                              onSaved={async res => {
                                  await mutate();
                                  if (res?._id) setOpen(year, res._id, true);
                              }}/>

            <CandidateSheet
                mode={sheetMode}
                tab={tab}
                onTabChange={t => setParams({tab: t === 'news' ? 'news' : null})}
                onClose={closeSheet}
                nominations={nominations}
                wilson={wilson}
                nextOrder={nextOrder}
                onChanged={() => mutate()}
                onCreated={id => id ? setParams({c: id, new: null, tab: null}) : closeSheet()}
            />
        </>
    );
}
