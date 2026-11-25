'use client';
import {useState} from "react";
import useSWR from "swr";
import classNames from "classnames";
import {
    ChevronDown, Clock, EyeOff, ExternalLink, Link2, MoreHorizontal, Newspaper, Plus, RefreshCw, Search, Trash2, Undo2,
} from "lucide-react";
import {addNews, deleteNews, fetchAdminNews, fetchNews, patchNews} from "@/shared/api/news.api";
import {errorCode} from "@/shared/api/errors";
import Button from "@/shared/ui/Button";
import Badge from "@/shared/ui/Badge";
import {Input} from "@/shared/ui/Field";
import {EmptyState, Skeleton} from "@/shared/ui/Card";
import {toast} from "@/shared/ui/toast";
import {confirmAction} from "@/shared/ui/confirm";
import {fmtDate, fmtDateTime, pl, timeAgo} from "@/shared/lib/format";

const Thumb = ({src}) => (
    <div className="hidden h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-zinc-100 ring-1 ring-zinc-200/70 sm:block">
        {src
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={src} alt="" loading="lazy" className="h-full w-full object-cover"/>
            : <div className="flex h-full items-center justify-center text-zinc-300"><Newspaper size={16}/></div>}
    </div>
);

const RowMenu = ({children}) => {
    const [open, setOpen] = useState(false);
    return (
        <div className="relative" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}>
            <Button variant="ghost" size="icon-sm" icon={MoreHorizontal} aria-label="Ещё" onClick={() => setOpen(o => !o)}/>
            {open && (
                <div className="absolute right-0 z-20 mt-1 w-52 animate-scale-in rounded-xl border border-zinc-200 bg-white p-1 shadow-pop" onClick={() => setOpen(false)}>
                    {children}
                </div>
            )}
        </div>
    );
};

const NewsRow = ({n, muted, children}) => (
    <li data-news-id={n._id}
        className={classNames('group flex items-center gap-3 rounded-xl border bg-white px-3 py-2.5 transition hover:border-zinc-300 hover:shadow-soft',
            muted ? 'border-dashed border-zinc-200 bg-zinc-50/60' : 'border-zinc-200/80')}>
        <Thumb src={n.image}/>
        <div className="min-w-0 flex-1">
            <a href={n.url} target="_blank" rel="noreferrer"
               className={classNames('line-clamp-2 text-sm font-medium leading-snug hover:text-brand-blue', muted ? 'text-zinc-500' : 'text-zinc-900')}>
                {n.title || n.slug}
                <ExternalLink size={12} className="ml-1 inline-block -translate-y-px opacity-0 transition group-hover:opacity-60"/>
            </a>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
                <span className="tabular">{fmtDate(n.publishedAt)}</span>
                <Badge tone="neutral" title={n.lang ? `Показывается на ${n.lang === 'uz' ? 'узбекской' : 'русской'} версии сайта` : 'Язык не определён — показывается на обеих версиях'}>{n.lang ? n.lang.toUpperCase() : 'RU+UZ'}</Badge>
                <Badge tone={n.source === 'manual' ? 'blue' : 'neutral'}>{n.source === 'manual' ? 'вручную' : 'авто'}</Badge>
                {n.status === 'pending' && <Badge tone="amber">на проверке</Badge>}
            </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">{children}</div>
    </li>
);

const CandidateNews = ({id, candidate, onChanged}) => {
    const [input, setInput] = useState('');
    const [busy, setBusy] = useState(null); // 'add' | 'fetch' | news id
    const [showHidden, setShowHidden] = useState(false);

    const {data, mutate, isLoading, error} = useSWR(['news-admin', id], () => fetchAdminNews(id, ''));
    const [fetchedAt, setFetchedAt] = useState(candidate?.newsFetchedAt ?? null);

    const items = data?.items ?? [];
    const visible = items.filter(n => n.status !== 'hidden');
    const hidden = items.filter(n => n.status === 'hidden');

    const setStatus = async (n, status) => {
        setBusy(n._id);
        try {
            await mutate(async cur => {
                await patchNews(n._id, {status});
                return {...cur, items: (cur?.items ?? []).map(x => x._id === n._id ? {...x, status} : x)};
            }, {
                optimisticData: cur => ({...cur, items: (cur?.items ?? []).map(x => x._id === n._id ? {...x, status} : x)}),
                rollbackOnError: true, revalidate: false,
            });
            toast.success(status === 'hidden' ? 'Новость скрыта' : 'Новость возвращена',
                status === 'hidden' ? 'Перемещена в «Игнорируемые» и больше не будет добавлена' : n.title);
            onChanged?.();
        } catch (e) {
            toast.fromError(e, 'Не удалось изменить новость');
        }
        setBusy(null);
    };

    const remove = async n => {
        const ok = await confirmAction({
            tone: 'danger', title: 'Удалить новость навсегда?', confirmText: 'Удалить',
            description: 'Ручная новость будет удалена. Если её снова найдёт автопоиск — она добавится заново.',
        });
        if (!ok) return;
        setBusy(n._id);
        try {
            await deleteNews(n._id);
            await mutate();
            toast.success('Новость удалена');
            onChanged?.();
        } catch (e) { toast.fromError(e, 'Не удалось удалить'); }
        setBusy(null);
    };

    const onAdd = async e => {
        e.preventDefault();
        const v = input.trim();
        if (!v) return;
        setBusy('add');
        try {
            const created = await addNews(id, v);
            setInput('');
            await mutate();
            toast.success('Новость добавлена', created?.title);
            onChanged?.();
        } catch (err) {
            if (err?.response?.status === 409 || errorCode(err) === 'NEWS_ALREADY_EXISTS') {
                toast.error('Уже есть', 'Эта новость уже добавлена (возможно, в «Игнорируемых»)');
            } else toast.fromError(err, 'Не удалось добавить');
        }
        setBusy(null);
    };

    const onFetch = async () => {
        setBusy('fetch');
        try {
            const res = await fetchNews({candidate: id});
            const r = Array.isArray(res) ? res[0] : (res?.results?.[0] ?? res);
            if (r?.error) throw new Error(r.error);
            setFetchedAt(r?.newsFetchedAt ?? new Date().toISOString());
            await mutate();
            toast.success('Поиск завершён', r?.added ? `Найдено новых: ${r.added}` : 'Новых материалов нет');
            onChanged?.();
        } catch (e) { toast.fromError(e, 'Поиск не удался'); }
        setBusy(null);
    };

    return (
        <div className="grid gap-5" data-testid="candidate-news">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200/80 bg-gradient-to-br from-zinc-50 to-white px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-zinc-600 ring-1 ring-zinc-200"><Clock size={16}/></span>
                    <div className="min-w-0 text-[13px] leading-tight">
                        <div className="font-medium text-zinc-800">{fetchedAt ? `Последний поиск ${timeAgo(fetchedAt)}` : 'Поиск ещё не выполнялся'}</div>
                        <div className="text-zinc-500">{fetchedAt ? fmtDateTime(fetchedAt) : 'Нажмите «Искать заново», чтобы найти материалы на repost.uz'}</div>
                    </div>
                </div>
                <Button size="sm" icon={RefreshCw} loading={busy === 'fetch'} disabled={!!busy} onClick={onFetch}>Искать заново</Button>
            </div>

            <form onSubmit={onAdd} className="flex gap-2">
                <div className="flex-1">
                    <Input icon={Link2} value={input} onChange={e => setInput(e.target.value)} aria-label="Ссылка или slug новости"
                           placeholder="https://repost.uz/… или slug"/>
                </div>
                <Button type="submit" variant="dark" icon={Plus} loading={busy === 'add'} disabled={!!busy || !input.trim()}>Добавить</Button>
            </form>

            <section>
                <div className="mb-2 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-zinc-900">На сайте <span className="ml-1 text-zinc-400 tabular">{visible.length}</span></h4>
                    <span className="text-xs text-zinc-400">Скрытые не будут добавлены повторно</span>
                </div>
                {isLoading && <div className="grid gap-2">{[0, 1, 2].map(i => <Skeleton key={i} className="h-[68px] rounded-xl"/>)}</div>}
                {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">Не удалось загрузить новости</div>}
                {!isLoading && !error && !visible.length && (
                    <div className="rounded-2xl border border-dashed border-zinc-200">
                        <EmptyState icon={Search} title="Новостей пока нет" description="Запустите поиск или добавьте материал по ссылке."/>
                    </div>
                )}
                <ul className="grid gap-2">
                    {visible.map(n => (
                        <NewsRow key={n._id} n={n}>
                            <Button size="sm" variant="ghost" icon={EyeOff} loading={busy === n._id} disabled={!!busy && busy !== n._id}
                                    onClick={() => setStatus(n, 'hidden')} title="Скрыть с сайта и не добавлять повторно"
                                    className="text-zinc-600 hover:text-zinc-900">
                                <span className="hidden sm:inline">Игнорировать</span>
                            </Button>
                            {n.source === 'manual' && (
                                <RowMenu>
                                    <button type="button" onClick={() => remove(n)}
                                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-red-600 hover:bg-red-50">
                                        <Trash2 size={15}/> Удалить навсегда
                                    </button>
                                </RowMenu>
                            )}
                        </NewsRow>
                    ))}
                </ul>
            </section>

            <section className="rounded-2xl border border-zinc-200/80">
                <button type="button" onClick={() => setShowHidden(v => !v)} aria-expanded={showHidden}
                        className="flex w-full items-center justify-between gap-2 rounded-2xl px-4 py-3 text-left hover:bg-zinc-50">
                    <span className="flex items-center gap-2 text-sm font-semibold text-zinc-800">
                        <EyeOff size={16} className="text-zinc-400"/>
                        Игнорируемые ({hidden.length})
                    </span>
                    <ChevronDown size={16} className={classNames('text-zinc-400 transition-transform', showHidden && 'rotate-180')}/>
                </button>
                {showHidden && (
                    <div className="border-t border-zinc-100 p-3">
                        {!hidden.length
                            ? <div className="px-1 py-2 text-sm text-zinc-500">Список пуст</div>
                            : <ul className="grid gap-2">
                                {hidden.map(n => (
                                    <NewsRow key={n._id} n={n} muted>
                                        <Button size="sm" variant="secondary" icon={Undo2} loading={busy === n._id} disabled={!!busy && busy !== n._id}
                                                onClick={() => setStatus(n, 'visible')}>Вернуть</Button>
                                    </NewsRow>
                                ))}
                            </ul>}
                    </div>
                )}
            </section>
            <p className="text-xs text-zinc-400">{pl(items.length, 'материал', 'материала', 'материалов')} всего, включая скрытые.</p>
        </div>
    );
};

export default CandidateNews;
