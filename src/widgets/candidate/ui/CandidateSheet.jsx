'use client';
import {useState} from 'react';
import useSWR from 'swr';
import NextLink from 'next/link';
import classNames from 'classnames';
import {ExternalLink, Newspaper, Trash2, UserRound, UserRoundPlus, X} from 'lucide-react';
import Sheet from '@/shared/ui/Sheet';
import Tabs from '@/shared/ui/Tabs';
import Button from '@/shared/ui/Button';
import Badge from '@/shared/ui/Badge';
import {Skeleton} from '@/shared/ui/Card';
import {toast} from '@/shared/ui/toast';
import {confirmAction} from '@/shared/ui/confirm';
import {deleteCandidate, fetchOneCandidate} from '@/shared/api/candidates.api';
import {useYear} from '@/shared/store/edition.store';
import {fmtNum, photoUrl, voteStats} from '@/shared/lib/format';
import CandidateForm from '@/features/candidate/ui/candidate-form';
import CandidateNews from '@/features/news/ui/candidate-news';

export const Avatar = ({src, name, size = 40, className}) => (
    <span className={classNames('relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-zinc-100 to-zinc-200 text-zinc-500 ring-1 ring-black/5', className)}
          style={{width: size, height: size, borderRadius: size >= 56 ? 18 : 12}}>
        {src
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={src} alt="" loading="lazy" className="h-full w-full object-cover"/>
            : <span className="text-sm font-semibold">{(name || '?').slice(0, 1)}</span>}
    </span>
);

const Stat = ({label, value, tone}) => (
    <div className="min-w-0 rounded-xl bg-zinc-50 px-3 py-2 ring-1 ring-inset ring-zinc-200/70">
        <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</div>
        <div className={classNames('mt-0.5 text-base font-semibold tabular', tone)}>{value}</div>
    </div>
);

const SheetHeader = ({icon, title, subtitle, onClose, extra, children}) => (
    <div className="border-b border-zinc-100 px-5 pb-0 pt-5 sm:px-6">
        <div className="flex items-start gap-4">
            {icon}
            <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-semibold leading-tight text-zinc-900">{title}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-zinc-500">{subtitle}</div>
            </div>
            <div className="flex items-center gap-1">
                {extra}
                <Button variant="ghost" size="icon-sm" icon={X} onClick={onClose} aria-label="Закрыть"/>
            </div>
        </div>
        {children}
    </div>
);

/**
 * mode: {type:'edit', id} | {type:'create', nomination}
 */
const CandidateSheet = ({mode, tab = 'profile', onTabChange, onClose, nominations = [], wilson, onChanged, onCreated, nextOrder}) => {
    const year = useYear();
    const open = !!mode;
    const editId = mode?.type === 'edit' ? mode.id : null;
    const {data: candidate, error, mutate} = useSWR(editId && year ? ['candidate', editId, year] : null, () => fetchOneCandidate(editId, year));
    const [busy, setBusy] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const requestClose = async () => {
        if (dirty && !(await confirmAction({title: 'Закрыть без сохранения?', description: 'Изменения в профиле будут потеряны.', confirmText: 'Закрыть', tone: 'danger'}))) return;
        setDirty(false);
        onClose();
    };

    const remove = async () => {
        const ok = await confirmAction({
            tone: 'danger', title: `Удалить кандидата?`, confirmText: 'Удалить кандидата', icon: Trash2,
            description: `«${candidate?.ru?.name}» будет удалён вместе с его новостями. Действие необратимо.`,
        });
        if (!ok) return;
        setDeleting(true);
        try {
            await deleteCandidate(editId);
            toast.success('Кандидат удалён', candidate?.ru?.name);
            setDirty(false);
            await onChanged?.();
            onClose();
        } catch (e) { toast.fromError(e, 'Не удалось удалить кандидата'); }
        setDeleting(false);
    };

    const nominationName = id => nominations.find(n => n._id === id)?.ru?.name;

    let content;
    if (mode?.type === 'create') {
        content = (
            <>
                <SheetHeader onClose={requestClose}
                             icon={<span className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-brand-yellow/90 text-zinc-900"><UserRoundPlus size={24}/></span>}
                             title="Новый кандидат"
                             subtitle={<>в номинации <span className="font-medium text-zinc-700">{nominationName(mode.nomination) ?? '—'}</span></>}>
                    <div className="h-4"/>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto px-5 py-5 scrollbar-thin sm:px-6">
                    <CandidateForm key={`new-${mode.nomination}`} type="create" formId="candidate-sheet-form" nominations={nominations}
                                   defaultNomination={mode.nomination} nextOrder={nextOrder} onBusy={setBusy} onDirty={setDirty}
                                   onSaved={async res => { setDirty(false); await onChanged?.(); onCreated?.(res?._id); }}/>
                </div>
                <div className="flex items-center justify-end gap-2 border-t border-zinc-100 bg-white px-5 py-3 sm:px-6">
                    <Button variant="secondary" onClick={requestClose}>Отмена</Button>
                    <Button type="submit" form="candidate-sheet-form" variant="primary" loading={busy}>Создать кандидата</Button>
                </div>
            </>
        );
    } else if (editId) {
        const s = voteStats(candidate);
        content = (
            <>
                <SheetHeader onClose={requestClose}
                             icon={candidate ? <Avatar src={photoUrl(candidate.photo)} name={candidate.ru?.name} size={56}/> : <Skeleton className="h-14 w-14 rounded-[18px]"/>}
                             title={candidate ? candidate.ru?.name : <Skeleton className="h-5 w-56"/>}
                             subtitle={candidate && <>
                                 <span className="truncate">{candidate.ru?.description}</span>
                                 {candidate.isCompany && <Badge tone="blue">компания</Badge>}
                             </>}
                             extra={<Button variant="ghost" size="icon-sm" icon={ExternalLink} href={`/candidate/edit/${editId}`} title="Открыть отдельной страницей" aria-label="Открыть отдельной страницей"/>}>
                    {candidate && (
                        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                            <Stat label="За" value={fmtNum(s.pro)} tone="text-brand-green"/>
                            <Stat label="Против" value={fmtNum(s.con)} tone="text-brand-red"/>
                            <Stat label="Поддержка" value={s.n ? `${s.support}%` : '—'}/>
                            {wilson ? <Stat label="Балл" value={s.n ? Number(s.score).toFixed(2) : '—'}/> : <Stat label="Рейтинг" value={s.rating ?? '—'}/>}
                        </div>
                    )}
                    <Tabs className="mt-4 border-b-0" value={tab} onChange={onTabChange}
                          items={[
                              {value: 'profile', label: 'Профиль', icon: UserRound},
                              {value: 'news', label: 'Новости', icon: Newspaper, count: candidate?.newsCount},
                          ]}/>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto bg-white px-5 py-5 scrollbar-thin sm:px-6">
                    {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">Не удалось загрузить кандидата</div>}
                    {!candidate && !error && <div className="grid gap-4"><Skeleton className="h-28 w-28 rounded-2xl"/><Skeleton className="h-40 rounded-2xl"/><Skeleton className="h-24 rounded-2xl"/></div>}
                    {candidate && (
                        <div className={tab === 'profile' ? '' : 'hidden'}>
                            <CandidateForm key={candidate._id + (candidate.updatedAt ?? '')} type="update" formId="candidate-sheet-form"
                                           candidate={candidate} nominations={nominations} onBusy={setBusy} onDirty={setDirty}
                                           onSaved={async () => { setDirty(false); await Promise.all([mutate(), onChanged?.()]); }}/>
                        </div>
                    )}
                    {candidate && tab === 'news' && (
                        <CandidateNews id={editId} candidate={candidate} onChanged={() => { mutate(); onChanged?.(); }}/>
                    )}
                </div>
                {tab === 'profile' && candidate && (
                    <div className="flex items-center justify-between gap-2 border-t border-zinc-100 bg-white px-5 py-3 sm:px-6">
                        <Button variant="danger-ghost" icon={Trash2} loading={deleting} onClick={remove}>
                            <span className="hidden sm:inline">Удалить</span>
                        </Button>
                        <div className="flex items-center gap-2">
                            {dirty && <span className="hidden text-xs text-amber-600 sm:inline">Есть несохранённые изменения</span>}
                            <Button type="submit" form="candidate-sheet-form" variant="primary" loading={busy} disabled={!dirty}>Сохранить</Button>
                        </div>
                    </div>
                )}
            </>
        );
    }

    return <Sheet open={open} onClose={requestClose}>{content}</Sheet>;
};

export default CandidateSheet;
