'use client';
import classNames from 'classnames';
import {Draggable, Droppable} from 'react-beautiful-dnd';
import {ChevronRight, Crown, GripVertical, Newspaper, Pencil, Plus, Trash2, UserPlus, Users, Vote} from 'lucide-react';
import Button from '@/shared/ui/Button';
import {fmtNum, photoUrl, plural, voteStats} from '@/shared/lib/format';
import {Avatar} from '@/widgets/candidate/ui/CandidateSheet';

const VoteBar = ({pro, con}) => {
    const n = pro + con;
    const p = n ? (pro / n) * 100 : 0;
    return (
        <div className="w-full">
            <div className="mb-1 flex items-center justify-between text-[11px] font-medium tabular">
                <span className="text-brand-green">▲ {fmtNum(pro)}</span>
                <span className="text-brand-red">{fmtNum(con)} ▼</span>
            </div>
            <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                {n > 0 && <>
                    <div className="h-full bg-brand-green transition-all duration-500" style={{width: `${p}%`}}/>
                    <div className="h-full bg-brand-red transition-all duration-500" style={{width: `${100 - p}%`}}/>
                </>}
            </div>
        </div>
    );
};

const Highlight = ({text, query}) => {
    if (!query || !text) return text ?? null;
    const i = text.toLowerCase().replace(/ё/g, 'е').indexOf(query);
    if (i < 0) return text;
    return <>{text.slice(0, i)}<mark className="rounded bg-brand-yellow/50 px-0.5 text-inherit">{text.slice(i, i + query.length)}</mark>{text.slice(i + query.length)}</>;
};

const GRID = 'grid grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-3 md:grid-cols-[20px_minmax(0,1fr)_180px_76px_64px_72px]';

const CandidateRow = ({c, index, wilson, leader, dragDisabled, query, onOpen, active}) => {
    const s = voteStats(c);
    return (
        <Draggable draggableId={`cand:${c._id}`} index={index} isDragDisabled={dragDisabled}>
            {(provided, snapshot) => (
                <div ref={provided.innerRef} {...provided.draggableProps}
                     data-candidate-id={c._id}
                     className={classNames(GRID, 'group relative cursor-pointer rounded-xl px-2 py-2 transition-colors',
                         snapshot.isDragging ? 'bg-white shadow-pop ring-1 ring-zinc-200' : active ? 'bg-sky-50 ring-1 ring-sky-200' : 'hover:bg-zinc-50')}
                     onClick={() => onOpen(c._id)}
                     role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && onOpen(c._id)}>
                    <span {...provided.dragHandleProps} onClick={e => e.stopPropagation()} title={dragDisabled ? undefined : 'Перетащите, чтобы изменить порядок'}
                          className={classNames('flex h-8 items-center justify-center rounded text-zinc-300', dragDisabled ? 'opacity-0' : 'cursor-grab hover:text-zinc-500 active:cursor-grabbing md:opacity-0 md:group-hover:opacity-100')}>
                        <GripVertical size={16}/>
                    </span>
                    <div className="flex min-w-0 items-center gap-3">
                        <span className="relative">
                            <Avatar src={photoUrl(c.photo)} name={c.ru?.name} size={40}/>
                            {leader && (
                                <span title="Лидер номинации" className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-yellow text-zinc-900 ring-2 ring-white">
                                    <Crown size={11} strokeWidth={2.5}/>
                                </span>
                            )}
                        </span>
                        <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-zinc-900"><Highlight text={c.ru?.name} query={query}/></div>
                            <div className="truncate text-[13px] text-zinc-500"><Highlight text={c.ru?.description} query={query}/></div>
                            {/* mobile stats line */}
                            <div className="mt-0.5 flex items-center gap-2 text-[11px] font-medium tabular md:hidden">
                                <span className="text-brand-green">▲ {fmtNum(s.pro)}</span>
                                <span className="text-brand-red">▼ {fmtNum(s.con)}</span>
                                {s.n > 0 && <span className="text-zinc-500">{s.support}%</span>}
                                {s.n > 0 && wilson && <span className="text-zinc-500">· {Number(s.score).toFixed(1)}</span>}
                            </div>
                        </div>
                    </div>
                    <div className="hidden md:block"><VoteBar pro={s.pro} con={s.con}/></div>
                    <div className="hidden text-right text-sm font-semibold text-zinc-800 tabular md:block">{s.n ? `${s.support}%` : <span className="text-zinc-300">—</span>}</div>
                    <div className="hidden text-right text-sm text-zinc-600 tabular md:block">
                        {wilson ? (s.n ? Number(s.score).toFixed(2) : <span className="text-zinc-300">—</span>) : (s.rating ?? '—')}
                    </div>
                    <div className="flex justify-end">
                        <button type="button" data-testid="news-chip"
                                onClick={e => { e.stopPropagation(); onOpen(c._id, 'news'); }}
                                title="Новости кандидата"
                                className={classNames('inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset transition tabular',
                                    c.newsCount ? 'bg-sky-50 text-sky-700 ring-sky-200 hover:bg-sky-100' : 'bg-zinc-50 text-zinc-400 ring-zinc-200 hover:bg-zinc-100 hover:text-zinc-600')}>
                            <Newspaper size={12}/>{c.newsCount ?? 0}
                        </button>
                    </div>
                </div>
            )}
        </Draggable>
    );
};

const AvatarStack = ({candidates}) => (
    <div className="hidden items-center -space-x-2 sm:flex">
        {candidates.slice(0, 4).map(c => (
            <Avatar key={c._id} src={photoUrl(c.photo)} name={c.ru?.name} size={26} className="!rounded-full ring-2 ring-white"/>
        ))}
        {candidates.length > 4 && (
            <span className="flex h-[26px] min-w-[26px] items-center justify-center rounded-full bg-zinc-100 px-1 text-[10px] font-semibold text-zinc-600 ring-2 ring-white">
                +{candidates.length - 4}
            </span>
        )}
    </div>
);

const NominationSection = ({nomination: n, index, open, onToggle, dragDisabled, wilson, query, onOpenCandidate, onAddCandidate, onEdit, onDelete, activeCandidate}) => {
    const votes = n.votes ?? n.candidates.reduce((s, c) => s + voteStats(c).n, 0);
    // leader = best score (wilson) / support among candidates with votes
    let leaderId = null, best = -1;
    n.candidates.forEach(c => {
        const s = voteStats(c);
        const v = wilson ? s.score : (s.rating ?? s.support);
        if (s.n > 0 && v > best) { best = v; leaderId = c._id; }
    });

    return (
        <Draggable draggableId={`nom:${n._id}`} index={index} isDragDisabled={dragDisabled}>
            {(provided, snapshot) => (
                <section ref={provided.innerRef} {...provided.draggableProps} id={`nom-${n._id}`} data-nomination-id={n._id}
                         className={classNames('mb-3 scroll-mt-20 rounded-2xl border bg-white transition-shadow',
                             snapshot.isDragging ? 'border-zinc-300 shadow-pop' : open ? 'border-zinc-200 shadow-card' : 'border-zinc-200/80 shadow-soft hover:shadow-card')}>
                    <header className="flex items-center gap-1 py-2 pl-1.5 pr-2 sm:gap-2 sm:pr-3">
                        <span {...provided.dragHandleProps} title={dragDisabled ? undefined : 'Перетащите, чтобы изменить порядок'}
                              className={classNames('flex h-10 w-6 shrink-0 items-center justify-center rounded-lg text-zinc-300', dragDisabled ? 'invisible' : 'cursor-grab hover:bg-zinc-100 hover:text-zinc-500 active:cursor-grabbing')}>
                            <GripVertical size={16}/>
                        </span>
                        <button type="button" onClick={onToggle} aria-expanded={open} data-testid="nomination-toggle"
                                className="flex min-w-0 flex-1 items-center gap-3 rounded-xl py-1.5 pr-2 text-left">
                            <span className={classNames('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[13px] font-semibold tabular transition-colors',
                                open ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600')}>
                                {index + 1}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-[15px] font-semibold text-zinc-900"><Highlight text={n.ru?.name} query={query}/></span>
                                <span className="block truncate text-[13px] text-zinc-500">{n.uz?.name}</span>
                            </span>
                            {!open && <AvatarStack candidates={n.candidates}/>}
                            <span className="hidden shrink-0 items-center gap-3 text-[13px] text-zinc-500 tabular md:flex">
                                <span className="inline-flex items-center gap-1" title="Кандидатов"><Users size={14} className="text-zinc-400"/>{n.candidates.length}</span>
                                <span className="inline-flex items-center gap-1" title="Голосов"><Vote size={14} className="text-zinc-400"/>{fmtNum(votes)}</span>
                            </span>
                            <ChevronRight size={18} className={classNames('shrink-0 text-zinc-400 transition-transform duration-200', open && 'rotate-90')}/>
                        </button>
                        <div className="flex shrink-0 items-center">
                            <Button variant="ghost" size="icon-sm" icon={UserPlus} onClick={onAddCandidate} title="Добавить кандидата" aria-label="Добавить кандидата" className="hidden sm:inline-flex"/>
                            <Button variant="ghost" size="icon-sm" icon={Pencil} onClick={onEdit} title="Редактировать номинацию" aria-label="Редактировать номинацию"/>
                            <Button variant="ghost" size="icon-sm" icon={Trash2} onClick={onDelete} title="Удалить номинацию" aria-label="Удалить номинацию"
                                    className="hover:!bg-red-50 hover:!text-red-600"/>
                        </div>
                    </header>

                    {open && (
                        <div className="animate-fade-in border-t border-zinc-100 px-2 pb-2 pt-1 sm:px-3">
                            <div className={classNames(GRID, 'hidden px-2 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-zinc-400 md:grid')}>
                                <span/>
                                <span>{n.candidates.length} {plural(n.candidates.length, 'кандидат', 'кандидата', 'кандидатов')}</span>
                                <span className="flex justify-between"><span>За</span><span>Против</span></span>
                                <span className="text-right">Поддержка</span>
                                <span className="text-right">{wilson ? 'Балл' : 'Рейтинг'}</span>
                                <span className="text-right">Новости</span>
                            </div>
                            <Droppable droppableId={`cands:${n._id}`} type="CANDIDATE" isDropDisabled={dragDisabled}>
                                {prov => (
                                    <div ref={prov.innerRef} {...prov.droppableProps} className="flex flex-col">
                                        {n.candidates.map((c, i) => (
                                            <CandidateRow key={c._id} c={c} index={i} wilson={wilson} leader={c._id === leaderId}
                                                          dragDisabled={dragDisabled} query={query} onOpen={onOpenCandidate}
                                                          active={activeCandidate === c._id}/>
                                        ))}
                                        {prov.placeholder}
                                    </div>
                                )}
                            </Droppable>
                            {!n.candidates.length && (
                                <div className="px-2 py-4 text-center text-sm text-zinc-500">В номинации пока нет кандидатов</div>
                            )}
                            {!query && (
                                <button type="button" onClick={onAddCandidate}
                                        className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-200 py-2.5 text-[13px] font-medium text-zinc-500 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-800">
                                    <Plus size={15}/> Добавить кандидата
                                </button>
                            )}
                        </div>
                    )}
                </section>
            )}
        </Draggable>
    );
};

export default NominationSection;
