'use client';
import {useEffect, useState} from "react";
import classNames from "classnames";
import {CalendarClock, CalendarPlus, Copy, Newspaper, RefreshCw, Save, Settings2} from "lucide-react";
import {useEditionStore} from "@/shared/store/edition.store";
import {cloneEdition, createEdition, fetchEditions, updateEdition} from "@/shared/api/editions.api";
import {fetchNews} from "@/shared/api/news.api";
import Button from "@/shared/ui/Button";
import Badge, {EDITION_STATUS} from "@/shared/ui/Badge";
import {Card, CardBody, CardHeader, EmptyState, PageHeader, Skeleton} from "@/shared/ui/Card";
import {Input, Label, NativeSelect, Switch} from "@/shared/ui/Field";
import {toast} from "@/shared/ui/toast";
import {confirmAction} from "@/shared/ui/confirm";
import {fmtNum, pl} from "@/shared/lib/format";

// datetime-local <-> ISO, always in Asia/Tashkent (UTC+5, no DST)
const TZ_MS = 5 * 3600 * 1000;
const toInput = iso => iso ? new Date(new Date(iso).getTime() + TZ_MS).toISOString().slice(0, 16) : '';
const fromInput = v => v ? new Date(`${v}:00+05:00`).toISOString() : null;

const DATE_GROUPS = [
    {title: 'Голосование', hint: 'Сервер принимает голоса только в этом окне и при статусе «активен»', fields: [['votingStartAt', 'Начало'], ['votingEndAt', 'Конец']]},
    {title: 'Период новостей', hint: 'Автопоиск новостей и подпись «Новости за год» на сайте', fields: [['newsFrom', 'С'], ['newsTo', 'По']]},
];
const DATE_KEYS = DATE_GROUPS.flatMap(g => g.fields.map(([k]) => k));

const STATUS_OPTIONS = [
    {value: 'draft', label: 'Черновик', desc: 'Не виден, голосование закрыто', dot: 'bg-zinc-400'},
    {value: 'active', label: 'Активен', desc: 'Идёт голосование', dot: 'bg-emerald-500'},
    {value: 'closed', label: 'Закрыт', desc: 'Итоги, голосовать нельзя', dot: 'bg-amber-500'},
];

const EditionSettings = () => {
    const {year, editions, setEditions, setYear} = useEditionStore();
    const edition = editions.find(e => e.year === year);
    const [form, setForm] = useState(null);
    const [busy, setBusy] = useState(null);
    const [sourceYear, setSourceYear] = useState('');
    const [force, setForce] = useState(false);
    const [newYear, setNewYear] = useState('');
    const [fetchRes, setFetchRes] = useState(null);

    const initial = ed => ({
        status: ed.status,
        ratingFormula: ed.ratingFormula,
        titleRu: ed.title?.ru ?? '',
        titleUz: ed.title?.uz ?? '',
        ...Object.fromEntries(DATE_KEYS.map(k => [k, toInput(ed[k])])),
    });

    useEffect(() => {
        if (!edition) return setForm(null);
        setForm(initial(edition));
        setSourceYear(String(editions.find(e => e.year !== edition.year)?.year ?? ''));
        setFetchRes(null);
    }, [edition?.year, edition?.updatedAt, editions.length]);

    const reload = async () => setEditions(await fetchEditions());
    const set = (k, v) => setForm(f => ({...f, [k]: v}));
    const dirty = form && edition && JSON.stringify(form) !== JSON.stringify(initial(edition));

    if (!year || (!editions.length)) return <div className="grid gap-4"><Skeleton className="h-10 w-72"/><Skeleton className="h-80 rounded-2xl"/></div>;
    if (!edition || !form) return <Card><EmptyState icon={CalendarClock} title={`Издание ${year} не найдено`}/></Card>;

    const save = async e => {
        e.preventDefault();
        if (form.status !== edition.status && form.status === 'active') {
            const ok = await confirmAction({title: `Открыть голосование ${year}?`, confirmText: 'Сделать активным',
                description: 'Голоса будут приниматься в заданном окне дат. Активным может быть только один год.'});
            if (!ok) return;
        }
        if (form.status !== edition.status && edition.status === 'active') {
            const ok = await confirmAction({tone: 'danger', title: 'Остановить голосование?', confirmText: 'Изменить статус',
                description: `Статус «${EDITION_STATUS[form.status]?.label}» — бот и сайт перестанут принимать голоса.`});
            if (!ok) return;
        }
        setBusy('save');
        try {
            await updateEdition(year, {
                status: form.status,
                ratingFormula: form.ratingFormula,
                title: {ru: form.titleRu, uz: form.titleUz},
                ...Object.fromEntries(DATE_KEYS.map(k => [k, fromInput(form[k])])),
            });
            await reload();
            toast.success('Настройки сохранены', `Издание ${year}`);
        } catch (err) { toast.fromError(err, 'Не удалось сохранить'); }
        setBusy(null);
    };

    const clone = async () => {
        if (!sourceYear) return;
        const ok = await confirmAction({
            tone: force ? 'danger' : 'default', icon: Copy, confirmText: 'Скопировать',
            title: `Скопировать номинации из ${sourceYear} в ${year}?`,
            description: `Номинации и кандидаты (без голосов и новостей) будут скопированы в ${year}.${force ? ' Режим «перезаписать»: уже существующие данные года будут затронуты.' : ''}`,
        });
        if (!ok) return;
        setBusy('clone');
        try {
            const r = await cloneEdition(year, sourceYear, force);
            toast.success('Скопировано', r?.nominations != null ? `${pl(r.nominations, 'номинация', 'номинации', 'номинаций')}, ${pl(r.candidates, 'кандидат', 'кандидата', 'кандидатов')}` : undefined);
        } catch (err) { toast.fromError(err, 'Копирование не удалось'); }
        setBusy(null);
    };

    const fetchAll = async () => {
        const ok = await confirmAction({icon: Newspaper, confirmText: 'Запустить поиск', title: `Найти новости для всех кандидатов ${year}?`,
            description: 'Поиск на repost.uz может занять несколько минут. Скрытые новости не вернутся.'});
        if (!ok) return;
        setBusy('fetch');
        try {
            const r = await fetchNews({year});
            setFetchRes(r);
            const list = Array.isArray(r) ? r : r?.results ?? [];
            const added = list.reduce((s, x) => s + (x.added ?? 0), 0);
            toast.success('Поиск завершён', `Новых материалов: ${fmtNum(added)}`);
        } catch (err) { toast.fromError(err, 'Поиск не удался'); }
        setBusy(null);
    };

    const create = async () => {
        const y = Number(newYear);
        if (!y) return;
        setBusy('create');
        try {
            await createEdition({year: y, status: 'draft', ratingFormula: 'wilson'});
            await reload();
            setYear(y);
            setNewYear('');
            toast.success(`Издание ${y} создано`, 'Переключено на новый год');
        } catch (err) { toast.fromError(err, 'Не удалось создать'); }
        setBusy(null);
    };

    const fetchList = fetchRes ? (Array.isArray(fetchRes) ? fetchRes : fetchRes.results ?? []) : [];

    return (
        <>
            <PageHeader eyebrow="Настройки года" title={edition.title?.ru || `Издание ${year}`}
                        description="Даты голосования, статус, копирование номинаций и поиск новостей."
                        actions={<Badge tone={EDITION_STATUS[edition.status]?.tone} dot className="!px-3 !py-1 !text-[13px]">{EDITION_STATUS[edition.status]?.label}</Badge>}/>

            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <Card>
                    <CardHeader icon={Settings2} title={`Издание ${year}`} description="Время указывается по Ташкенту (UTC+5)"/>
                    <form onSubmit={save}>
                        <CardBody className="grid gap-6">
                            <div>
                                <Label>Статус</Label>
                                <div className="grid gap-2 sm:grid-cols-3" role="radiogroup">
                                    {STATUS_OPTIONS.map(o => (
                                        <button key={o.value} type="button" role="radio" aria-checked={form.status === o.value} onClick={() => set('status', o.value)}
                                                className={classNames('rounded-xl border px-3 py-2.5 text-left transition',
                                                    form.status === o.value ? 'border-zinc-900 bg-zinc-900 text-white shadow-card' : 'border-zinc-200 bg-white hover:border-zinc-300')}>
                                            <span className="flex items-center gap-2 text-sm font-semibold"><span className={classNames('h-2 w-2 rounded-full', o.dot)}/>{o.label}</span>
                                            <span className={classNames('mt-0.5 block text-xs', form.status === o.value ? 'text-zinc-400' : 'text-zinc-500')}>{o.desc}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {DATE_GROUPS.map(g => (
                                <div key={g.title}>
                                    <div className="mb-2 flex items-baseline justify-between gap-2">
                                        <span className="text-sm font-semibold text-zinc-900">{g.title}</span>
                                        <span className="hidden text-xs text-zinc-400 sm:block">{g.hint}</span>
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        {g.fields.map(([k, label]) => (
                                            <div key={k}>
                                                <Label htmlFor={k}>{label}</Label>
                                                <Input id={k} type="datetime-local" value={form[k]} onChange={e => set(k, e.target.value)}/>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            <div className="grid gap-3 sm:grid-cols-3">
                                <div>
                                    <Label htmlFor="formula">Формула рейтинга</Label>
                                    <NativeSelect id="formula" value={form.ratingFormula} onChange={e => set('ratingFormula', e.target.value)}>
                                        <option value="wilson">Уилсон (2026+)</option>
                                        <option value="legacy">Классическая (2025)</option>
                                    </NativeSelect>
                                </div>
                                <div>
                                    <Label htmlFor="titleRu">Название (ru)</Label>
                                    <Input id="titleRu" value={form.titleRu} onChange={e => set('titleRu', e.target.value)} placeholder={`Народный рейтинг ${year}`}/>
                                </div>
                                <div>
                                    <Label htmlFor="titleUz">Название (uz)</Label>
                                    <Input id="titleUz" value={form.titleUz} onChange={e => set('titleUz', e.target.value)} placeholder={`Xalq reytingi ${year}`}/>
                                </div>
                            </div>
                        </CardBody>
                        <div className="flex items-center justify-end gap-3 border-t border-zinc-100 bg-zinc-50/60 px-5 py-3">
                            {dirty && <span className="text-xs text-amber-600">Есть несохранённые изменения</span>}
                            {dirty && <Button variant="ghost" onClick={() => setForm(initial(edition))}>Сбросить</Button>}
                            <Button type="submit" variant="primary" icon={Save} loading={busy === 'save'} disabled={!dirty}>Сохранить</Button>
                        </div>
                    </form>
                </Card>

                <div className="grid gap-6">
                    <Card>
                        <CardHeader icon={Newspaper} title="Новости" description="Автопоиск по всем кандидатам года"/>
                        <CardBody className="grid gap-3">
                            <Button variant="dark" icon={RefreshCw} loading={busy === 'fetch'} disabled={!!busy} onClick={fetchAll}>
                                Найти новости для всех
                            </Button>
                            {fetchList.length > 0 && (
                                <div className="max-h-64 overflow-y-auto rounded-xl ring-1 ring-zinc-200 scrollbar-thin">
                                    <table className="w-full text-xs">
                                        <thead className="sticky top-0 bg-zinc-50 text-zinc-500"><tr><th className="px-3 py-1.5 text-left font-medium">Кандидат</th><th className="px-2 font-medium">+</th><th className="px-3 font-medium">пропущено</th></tr></thead>
                                        <tbody className="divide-y divide-zinc-100">
                                            {fetchList.map((r, i) => (
                                                <tr key={r.candidate ?? i}>
                                                    <td className="max-w-[160px] truncate px-3 py-1.5 text-zinc-700">{r.name ?? r.candidateName ?? String(r.candidate ?? '').slice(-6)}</td>
                                                    <td className={classNames('px-2 text-center tabular', r.added ? 'font-semibold text-brand-green' : 'text-zinc-400')}>{r.error ? '!' : r.added ?? 0}</td>
                                                    <td className="px-3 text-center text-zinc-400 tabular">{r.skipped ?? 0}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader icon={Copy} title="Копировать из года" description="Номинации и кандидаты, без голосов и новостей"/>
                        <CardBody className="grid gap-3">
                            <div className="flex gap-2">
                                <NativeSelect value={sourceYear} onChange={e => setSourceYear(e.target.value)} aria-label="Исходный год">
                                    {editions.filter(e => e.year !== year).map(e => <option key={e.year} value={e.year}>из {e.year}</option>)}
                                </NativeSelect>
                                <Button disabled={!!busy || !sourceYear} loading={busy === 'clone'} onClick={clone}>Копировать</Button>
                            </div>
                            <Switch checked={force} onChange={setForce} label="Перезаписать" description="Даже если в году уже есть номинации"/>
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader icon={CalendarPlus} title="Новый год" description="Создаётся как черновик с формулой Уилсона"/>
                        <CardBody className="flex gap-2">
                            <Input type="number" placeholder={String((Math.max(...editions.map(e => e.year)) || 2026) + 1)} value={newYear} onChange={e => setNewYear(e.target.value)} aria-label="Год"/>
                            <Button variant="dark" disabled={!!busy || !newYear} loading={busy === 'create'} onClick={create}>Создать</Button>
                        </CardBody>
                    </Card>
                </div>
            </div>
        </>
    );
};

export default EditionSettings;
