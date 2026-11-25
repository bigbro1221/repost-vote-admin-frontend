'use client';
import {useRef, useState} from "react";
import useSWR from "swr";
import classNames from "classnames";
import {
    Ban, CheckCircle2, Trash2, Copy, FilePlus2, FlaskConical, History, Inbox, Keyboard, Loader2, Save, Send, ShieldCheck, X, XCircle,
} from "lucide-react";
import Editor from "./Editor";
import Preview from "./Preview";
import SendAllFlow from "./SendAllFlow";
import RecallFlow from "./RecallFlow";
import {makeModel, toApiEntities} from "../lib/tg-entities.mjs";
import {
    cancelBroadcast, createBroadcast, getBroadcast, listBroadcasts, recallBroadcast, sendBroadcast, sendTestBroadcast, updateBroadcast,
} from "@/shared/api/broadcast.api";
import Button from "@/shared/ui/Button";
import Badge from "@/shared/ui/Badge";
import {Card, CardHeader, EmptyState, PageHeader, Skeleton} from "@/shared/ui/Card";
import {Input, Switch} from "@/shared/ui/Field";
import {toast} from "@/shared/ui/toast";
import {confirmAction} from "@/shared/ui/confirm";
import {fmtDateTime, fmtNum} from "@/shared/lib/format";

const STATUS = {
    draft: ['Черновик', 'neutral'],
    queued: ['В очереди', 'amber'],
    sending: ['Отправляется', 'blue'],
    done: ['Отправлено', 'green'],
    failed: ['Ошибка', 'red'],
    cancelled: ['Отменено', 'neutral'],
};
const LIVE = ['queued', 'sending'];
const RECALL_LIVE = ['queued', 'running'];
const WINDOW_MS = (47 * 60 + 50) * 60 * 1000; // server-side safe window (47h50m of Telegram's 48h)

// hours left to delete a sent broadcast (null = not recallable / window closed)
const recallHoursLeft = b => {
    if (!b || !['done', 'cancelled', 'failed'].includes(b.status) || !(b.stats?.sent > 0)) return null;
    if (b.recall?.status && b.recall.status !== 'failed') return null;
    const last = b.finishedAt || b.sentAt || b.startedAt;
    if (!last) return null;
    const ms = new Date(last).getTime() + WINDOW_MS - Date.now();
    return ms > 0 ? Math.max(1, Math.ceil(ms / 3600000)) : null;
};

const RecallBadge = ({b}) => {
    const r = b?.recall;
    if (!r?.status) return null;
    if (r.status === 'done') return <Badge tone="neutral" dot>Удалено у всех</Badge>;
    if (r.status === 'failed') return <Badge tone="red" dot>Удаление не удалось</Badge>;
    return <Badge tone="amber" dot>Удаляется…</Badge>;
};

const RecallCard = ({b}) => {
    const r = b.recall;
    if (!r?.status) return null;
    const st = r.stats ?? {};
    const total = st.total || 0;
    const done = (st.deleted || 0) + (st.failed || 0) + (st.expired || 0);
    const pct = r.status === 'done' ? 100 : total ? Math.min(100, Math.round(done / total * 100)) : 0;
    const live = RECALL_LIVE.includes(r.status);
    return (
        <div className="border-t border-zinc-100 px-5 pb-5 pt-4" data-testid="recall-progress">
            <div className="flex flex-wrap items-center gap-2">
                {live ? <Loader2 size={16} className="animate-spin text-brand-red"/> : <Trash2 size={16} className="text-zinc-400"/>}
                <span className="text-sm font-semibold text-zinc-900">
                    {r.status === 'done' ? 'Удалено у всех' : r.status === 'failed' ? 'Удаление прервано' : 'Удаление у получателей'}
                </span>
                <RecallBadge b={b}/>
                <span className="ml-auto text-xs text-zinc-500 tabular">{fmtNum(done)} из {fmtNum(total)} · {pct}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100">
                <div className={classNames('h-full rounded-full transition-all duration-700', live ? 'bg-gradient-to-r from-brand-red to-orange-400' : 'bg-zinc-400')} style={{width: `${pct}%`}}/>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
                {[['Удалено', st.deleted ?? 0, 'text-brand-green'], ['Ошибки', st.failed ?? 0, 'text-brand-red'], ['Истёк срок', st.expired ?? 0, 'text-amber-600']].map(([l, v, c]) => (
                    <div key={l} className="rounded-xl bg-zinc-50 px-3 py-2 ring-1 ring-inset ring-zinc-200/70">
                        <div className="text-[11px] font-medium text-zinc-500">{l}</div>
                        <div className={classNames('text-lg font-semibold tabular', c)}>{fmtNum(v)}</div>
                    </div>
                ))}
            </div>
            {r.error && <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{r.error}</div>}
        </div>
    );
};

const StatusBadge = ({status}) => (
    <Badge tone={STATUS[status]?.[1]} dot>{STATUS[status]?.[0] ?? status}</Badge>
);

const progressOf = b => {
    const st = b?.stats ?? {};
    const total = st.total || 0;
    const done = (st.sent || 0) + (st.blocked || 0) + (st.failed || 0);
    return {st, total, done, pct: total ? Math.min(100, Math.round(done / total * 100)) : 0};
};

const ProgressCard = ({b, onCancel, onClose, busy, onRecall}) => {
    const hoursLeft = recallHoursLeft(b);
    const {st, total, done, pct} = progressOf(b);
    const live = LIVE.includes(b.status);
    return (
        <Card className="mb-6 overflow-hidden" data-testid="broadcast-progress">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
                <div className="flex items-center gap-2">
                    {live ? <Loader2 size={18} className="animate-spin text-brand-blue"/> : <CheckCircle2 size={18} className="text-zinc-400"/>}
                    <span className="text-[15px] font-semibold text-zinc-900">Рассылка от {fmtDateTime(b.createdAt)}</span>
                    <StatusBadge status={b.status}/>
                    {b.dryRun && <Badge tone="amber" title="BROADCAST_DRY_RUN: сообщения не отправляются в Telegram">тестовый режим</Badge>}
                </div>
                <div className="flex gap-2">
                    {live && <Button size="sm" variant="danger-ghost" icon={Ban} disabled={busy} onClick={() => onCancel(b._id)}>Остановить</Button>}
                    {hoursLeft != null && <Button size="sm" variant="danger-ghost" icon={Trash2} onClick={() => onRecall(b)}>Удалить у всех · ещё {hoursLeft} ч</Button>}
                    <Button size="icon-sm" variant="ghost" icon={X} onClick={onClose} aria-label="Скрыть"/>
                </div>
            </div>
            <div className="px-5 pb-5 pt-4">
                <div className="flex items-end justify-between text-sm">
                    <span className="text-3xl font-semibold tracking-tight text-zinc-900 tabular">{pct}%</span>
                    <span className="text-zinc-500 tabular">{fmtNum(done)} из {fmtNum(total)}</span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-zinc-100">
                    <div className={classNames('h-full rounded-full transition-all duration-700', live ? 'bg-gradient-to-r from-brand-blue to-[#00d4ae]' : 'bg-zinc-400')} style={{width: `${pct}%`}}/>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                        ['Доставлено', st.sent ?? 0, 'text-brand-green'],
                        ['Заблокировали бота', st.blocked ?? 0, 'text-amber-600'],
                        ['Ошибки', st.failed ?? 0, 'text-brand-red'],
                        ['Осталось', Math.max(0, total - done), 'text-zinc-900'],
                    ].map(([l, v, c]) => (
                        <div key={l} className="rounded-xl bg-zinc-50 px-3 py-2 ring-1 ring-inset ring-zinc-200/70">
                            <div className="text-[11px] font-medium text-zinc-500">{l}</div>
                            <div className={classNames('text-lg font-semibold tabular', c)}>{fmtNum(v)}</div>
                        </div>
                    ))}
                </div>
                {b.error && <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{b.error}</div>}
            </div>
            <RecallCard b={b}/>
        </Card>
    );
};

const Newsletter = () => {
    const editorRef = useRef(null);
    const [model, setModel] = useState(makeModel());
    const [disablePreview, setDisablePreview] = useState(false);
    const [draftId, setDraftId] = useState(null);
    const [testTo, setTestTo] = useState('');
    const [busy, setBusy] = useState(null); // 'save' | 'test' | 'cancel'
    const [activeId, setActiveId] = useState(null);
    const [flowOpen, setFlowOpen] = useState(false);
    const [recallTarget, setRecallTarget] = useState(null);
    const [showKeys, setShowKeys] = useState(false);

    const {data: list, mutate: mutateList, isLoading: listLoading} = useSWR(['broadcasts'], listBroadcasts, {
        refreshInterval: data => (data?.some?.(b => LIVE.includes(b.status) || RECALL_LIVE.includes(b.recall?.status)) ? 3000 : 0),
    });
    const {data: active, mutate: mutateActive} = useSWR(activeId ? ['broadcast', activeId] : null, () => getBroadcast(activeId), {
        refreshInterval: data => (!data || LIVE.includes(data.status) || RECALL_LIVE.includes(data.recall?.status) ? 2000 : 0),
    });

    const payload = () => ({
        text: model.text,
        entities: toApiEntities(model.entities),
        disablePreview,
        target: 'all',
    });
    const tooLong = model.text.length > 4096;
    const tooMany = model.entities.length > 100;
    const empty = !model.text.trim();

    const save = async () => {
        const res = draftId ? await updateBroadcast(draftId, payload()) : await createBroadcast(payload());
        setDraftId(res._id);
        await mutateList();
        return res;
    };

    const onSave = async () => {
        setBusy('save');
        try { await save(); toast.success('Черновик сохранён'); } catch (e) { toast.fromError(e, 'Не удалось сохранить черновик'); }
        setBusy(null);
    };

    const onTest = async e => {
        e?.preventDefault();
        const to = testTo.trim();
        if (!to) return toast.error('Кому отправить тест?', 'Укажите @username, ссылку t.me/… или tg id');
        setBusy('test');
        try {
            const r = await sendTestBroadcast({text: model.text, entities: toApiEntities(model.entities), disablePreview, to});
            toast.success('Тестовое сообщение отправлено', `${r?.to?.username ? '@' + String(r.to.username).replace(/^@/, '') : to}${r?.dryRun ? ' · тестовый режим (без отправки)' : ''}`);
        } catch (err) {
            toast.fromError(err, 'Тест не отправлен');
        }
        setBusy(null);
    };

    // called by the 2-step flow with the confirmed recipient count; errors propagate to the flow
    const sendAll = async total => {
        const b = await save();
        const sent = await sendBroadcast(b._id, total);
        setActiveId(sent?._id ?? b._id);
        setDraftId(null);
        toast.success('Рассылка запущена', `${fmtNum(total)} получателей`);
        await mutateList();
    };

    const doRecall = async total => {
        const b = recallTarget;
        await recallBroadcast(b._id, total);
        setActiveId(b._id);
        toast.success('Удаление запущено', `${fmtNum(total)} сообщений`);
        await Promise.all([mutateList(), mutateActive()]);
    };

    const onCancel = async id => {
        const ok = await confirmAction({
            tone: 'danger', title: 'Остановить рассылку?', confirmText: 'Остановить',
            description: 'Уже отправленные сообщения останутся у получателей. Оставшиеся не будут отправлены.',
        });
        if (!ok) return;
        setBusy('cancel');
        try {
            await cancelBroadcast(id);
            toast.success('Рассылка остановлена');
            await Promise.all([mutateList(), activeId && mutateActive()]);
        } catch (e) { toast.fromError(e, 'Не удалось остановить'); }
        setBusy(null);
    };

    const load = b => {
        editorRef.current.setModel({text: b.text, entities: b.entities ?? []});
        setDisablePreview(!!b.disablePreview);
        setDraftId(b.status === 'draft' ? b._id : null);
        toast.info(b.status === 'draft' ? 'Черновик открыт' : 'Скопировано в новый черновик');
        window.scrollTo({top: 0, behavior: 'smooth'});
    };

    const newDraft = async () => {
        if (!empty && !(await confirmAction({title: 'Начать новое сообщение?', description: 'Несохранённый текст будет очищен.', confirmText: 'Очистить'}))) return;
        editorRef.current.setModel({text: '', entities: []});
        setDisablePreview(false);
        setDraftId(null);
    };

    return (
        <>
            <PageHeader title="Рассылка"
                        description="Сообщение от бота всем зарегистрированным пользователям. Форматирование 1:1 как в Telegram."
                        actions={<Button icon={FilePlus2} onClick={newDraft}>Новое сообщение</Button>}/>

            {active && <ProgressCard b={active} busy={busy === 'cancel'} onRecall={setRecallTarget} onCancel={onCancel} onClose={() => setActiveId(null)}/>}

            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
                <div className="grid min-w-0 gap-6">
                    <Card className="overflow-visible">
                        <CardHeader title="Сообщение"
                                    description={draftId ? `Черновик #${draftId.slice(-6)}` : 'Новый черновик'}
                                    actions={<Button size="sm" variant="ghost" icon={Keyboard} onClick={() => setShowKeys(v => !v)}>Горячие клавиши</Button>}/>
                        <div className="p-4 sm:p-5">
                            {showKeys && (
                                <div className="mb-3 animate-fade-in rounded-xl bg-zinc-50 px-3 py-2 text-xs leading-relaxed text-zinc-600 ring-1 ring-inset ring-zinc-200">
                                    <b>Ctrl+B</b> жирный · <b>Ctrl+I</b> курсив · <b>Ctrl+U</b> подчёркнутый · <b>Ctrl+Shift+X</b> зачёркнутый · <b>Ctrl+Shift+P</b> спойлер ·{' '}
                                    <b>Ctrl+Shift+M</b> моноширинный · <b>Ctrl+K</b> ссылка · <b>Ctrl+Shift+N</b> очистить формат
                                </div>
                            )}
                            <Editor ref={editorRef} onChange={setModel}/>
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                                <Switch checked={!disablePreview} onChange={v => setDisablePreview(!v)} label="Превью ссылок" description="Telegram покажет карточку первой ссылки"/>
                                <span className={classNames('rounded-full px-2.5 py-1 text-xs font-medium tabular ring-1 ring-inset',
                                    tooLong || tooMany ? 'bg-red-50 text-red-700 ring-red-200' : 'bg-zinc-50 text-zinc-500 ring-zinc-200')}>
                                    {fmtNum(model.text.length)} / 4096 · форматов {model.entities.length}{tooMany ? ' (макс. 100)' : ''}
                                </span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-3 border-t border-zinc-100 bg-zinc-50/50 px-4 py-4 sm:px-5 xl:flex-row xl:items-center">
                            <Button icon={Save} loading={busy === 'save'} disabled={!!busy || empty} onClick={onSave}>Сохранить черновик</Button>
                            <form onSubmit={onTest} className="flex min-w-0 flex-1 gap-2">
                                <div className="min-w-0 flex-1">
                                    <Input icon={FlaskConical} value={testTo} onChange={e => setTestTo(e.target.value)} aria-label="Получатель теста"
                                           placeholder="@username, t.me/… или tg id"/>
                                </div>
                                <Button type="submit" variant="secondary" loading={busy === 'test'} disabled={!!busy || empty || tooLong}>Тест</Button>
                            </form>
                        </div>
                    </Card>

                    <Card className="relative overflow-hidden">
                        <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-brand-red to-orange-400"/>
                        <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-brand-red ring-1 ring-red-100">
                                <ShieldCheck size={20}/>
                            </span>
                            <div className="min-w-0 flex-1">
                                <div className="text-[15px] font-semibold text-zinc-900">Отправить всем пользователям</div>
                                <div className="text-[13px] text-zinc-500">Отменить отправку будет нельзя.</div>
                            </div>
                            <Button data-testid="send-all" variant="danger" icon={Send} disabled={!!busy || empty || tooLong || tooMany} onClick={() => setFlowOpen(true)}>
                                Отправить всем…
                            </Button>
                        </div>
                    </Card>
                </div>

                <div className="lg:sticky lg:top-8">
                    <Card className="overflow-hidden">
                        <div className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-yellow">
                                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden><path fill="#111" d="M12 2.5l2.7 6.1 6.6.6-5 4.4 1.5 6.5L12 16.7 6.2 20.1l1.5-6.5-5-4.4 6.6-.6z"/></svg>
                            </span>
                            <div className="leading-tight">
                                <div className="text-sm font-semibold text-zinc-900">Народный рейтинг</div>
                                <div className="text-xs text-zinc-500">бот · предпросмотр</div>
                            </div>
                        </div>
                        <Preview model={model} disablePreview={disablePreview}/>
                    </Card>
                </div>
            </div>

            <Card className="mt-8">
                <CardHeader icon={History} title="История рассылок" description="Черновики и отправленные сообщения"/>
                {listLoading && <div className="grid gap-2 p-4">{[0, 1, 2].map(i => <Skeleton key={i} className="h-14 rounded-xl"/>)}</div>}
                {list && !list.length && <EmptyState icon={Inbox} title="Пока пусто" description="Сохранённые черновики и рассылки появятся здесь."/>}
                <ul className="divide-y divide-zinc-100">
                    {(list ?? []).map(b => {
                        const {total, pct, st} = progressOf(b);
                        return (
                            <li key={b._id} className="flex flex-col gap-3 px-5 py-3.5 transition hover:bg-zinc-50/70 sm:flex-row sm:items-center">
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                                        <StatusBadge status={b.status}/>
                                        <RecallBadge b={b}/>
                                        <span className="tabular">{fmtDateTime(b.createdAt)}</span>
                                        {b.createdBy && <span className="text-zinc-400">· {String(b.createdBy).replace(/^admin:/, '')}</span>}
                                        {b.dryRun && <Badge tone="amber">тест</Badge>}
                                    </div>
                                    <div className="mt-1 line-clamp-2 text-sm text-zinc-800">{b.text}</div>
                                    {total > 0 && (
                                        <div className="mt-2 flex items-center gap-3 text-xs text-zinc-500 tabular">
                                            <span className="h-1.5 w-28 overflow-hidden rounded-full bg-zinc-100">
                                                <span className="block h-full rounded-full bg-brand-blue" style={{width: `${pct}%`}}/>
                                            </span>
                                            <span><CheckCircle2 size={12} className="mr-0.5 inline text-brand-green"/>{fmtNum(st.sent ?? 0)}/{fmtNum(total)}</span>
                                            <span>блок {fmtNum(st.blocked ?? 0)}</span>
                                            <span><XCircle size={12} className="mr-0.5 inline text-brand-red"/>{fmtNum(st.failed ?? 0)}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex shrink-0 flex-wrap gap-1">
                                    {b.status !== 'draft' && <Button size="sm" variant="ghost" onClick={() => setActiveId(b._id)}>Статистика</Button>}
                                    <Button size="sm" variant="ghost" icon={b.status === 'draft' ? undefined : Copy} onClick={() => load(b)}>
                                        {b.status === 'draft' ? 'Открыть' : 'Копировать'}
                                    </Button>
                                    {LIVE.includes(b.status) && <Button size="sm" variant="danger-ghost" onClick={() => onCancel(b._id)}>Остановить</Button>}
                                    {recallHoursLeft(b) != null && (
                                        <Button size="sm" variant="danger-ghost" icon={Trash2} data-testid="recall-open" onClick={() => setRecallTarget(b)}>
                                            Удалить у всех · ещё {recallHoursLeft(b)} ч
                                        </Button>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </Card>

            <RecallFlow open={!!recallTarget} onClose={() => setRecallTarget(null)} broadcast={recallTarget}
                        hoursLeft={recallHoursLeft(recallTarget) ?? 0} onRecall={doRecall}/>
            <SendAllFlow open={flowOpen} onClose={() => setFlowOpen(false)} model={model} disablePreview={disablePreview} onSend={sendAll}/>
        </>
    );
};

export default Newsletter;
