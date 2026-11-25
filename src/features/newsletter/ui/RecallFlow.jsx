'use client';
import {useEffect, useState} from 'react';
import classNames from 'classnames';
import {AlertTriangle, ArrowLeft, ArrowRight, Clock, Trash2, Users} from 'lucide-react';
import Modal from '@/shared/ui/Modal';
import Button from '@/shared/ui/Button';
import {errorCode, errorMessage} from '@/shared/api/errors';
import {fmtNum, plural} from '@/shared/lib/format';

const COUNTDOWN = 5;
const digits = s => String(s ?? '').replace(/[\s  ]/g, '');

/**
 * Two confirmation steps before deleting a delivered newsletter from every recipient's chat.
 *  1) explanation: «Сообщение будет удалено у N получателей. Это нельзя отменить.» → «Далее»
 *  2) type N + 5 s countdown → onRecall(N) (POST /broadcast/:id/recall {confirmTotal}); may throw
 */
export default function RecallFlow({open, onClose, broadcast, hoursLeft, onRecall}) {
    const [step, setStep] = useState(1);
    const [total, setTotal] = useState(broadcast?.stats?.sent ?? 0);
    const [typed, setTyped] = useState('');
    const [left, setLeft] = useState(COUNTDOWN);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState(null);

    useEffect(() => {
        if (!open) return;
        setStep(1); setTotal(broadcast?.stats?.sent ?? 0); setTyped(''); setErr(null); setBusy(false);
    }, [open, broadcast?._id]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!open || step !== 2) return;
        setLeft(COUNTDOWN);
        const t = setInterval(() => setLeft(v => (v <= 1 ? (clearInterval(t), 0) : v - 1)), 1000);
        return () => clearInterval(t);
    }, [open, step, total]);

    const cancel = () => { if (!busy) onClose(); };
    const matches = digits(typed) === String(total);
    const canGo = matches && left === 0 && !busy && total > 0;
    const people = n => plural(n, 'получателя', 'получателей', 'получателей');

    const go = async () => {
        if (!canGo) return;
        setBusy(true); setErr(null);
        try {
            await onRecall(total);
            onClose();
        } catch (e) {
            if (errorCode(e) === 'CONFIRMATION_MISMATCH' && typeof e?.response?.data?.total === 'number') {
                setTotal(e.response.data.total); setTyped('');
                setErr(`Число сообщений изменилось — теперь ${fmtNum(e.response.data.total)}. Введите новое число.`);
            } else setErr(errorMessage(e));
        } finally { setBusy(false); }
    };

    return (
        <>
            <Modal open={open && step === 1} onClose={cancel} size="md" tone="danger" icon={Trash2}
                   title="Удалить рассылку у всех"
                   description="Шаг 1 из 2 · что произойдёт"
                   footer={<>
                       <Button variant="secondary" onClick={cancel}>Отмена</Button>
                       <Button data-testid="recall-next" variant="dark" iconRight={ArrowRight} disabled={!total}
                               onClick={() => { setTyped(''); setErr(null); setStep(2); }}>Далее</Button>
                   </>}>
                <div className="grid gap-4" data-testid="recall-step1">
                    <div className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
                        <AlertTriangle size={18} className="mt-0.5 shrink-0"/>
                        <p className="text-sm leading-relaxed">
                            Сообщение будет удалено у <b className="tabular">{fmtNum(total)}</b> {people(total)}. <b>Это нельзя отменить.</b>
                        </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl bg-zinc-900 px-4 py-3 text-white">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-400"><Users size={14}/>Будет удалено</div>
                            <div className="mt-1 text-2xl font-semibold tabular">{fmtNum(total)}</div>
                        </div>
                        <div className="rounded-2xl border border-zinc-200 px-4 py-3">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500"><Clock size={14}/>Окно удаления</div>
                            <div className="mt-1 text-base font-semibold text-zinc-900">ещё {hoursLeft} ч</div>
                            <div className="text-xs text-zinc-500">Telegram позволяет удалять сообщения бота в течение 48 часов</div>
                        </div>
                    </div>
                    <div className="rounded-xl bg-zinc-50 px-3 py-2 text-sm text-zinc-600 ring-1 ring-inset ring-zinc-200">
                        «{String(broadcast?.text ?? '').slice(0, 160)}{String(broadcast?.text ?? '').length > 160 ? '…' : ''}»
                    </div>
                </div>
            </Modal>

            <Modal open={open && step === 2} onClose={cancel} size="md" tone="danger" icon={Trash2} dismissible={!busy}
                   title="Подтвердите удаление"
                   description="Шаг 2 из 2 · последнее подтверждение"
                   footer={<>
                       <Button variant="secondary" icon={ArrowLeft} disabled={busy} onClick={() => setStep(1)}>Назад</Button>
                       <Button data-testid="recall-confirm" variant="danger" icon={Trash2} loading={busy} disabled={!canGo} onClick={go}
                               className="sm:min-w-[240px]">
                           {left > 0 ? `Удалить через ${left} с` : `Удалить у ${fmtNum(total)} ${people(total)}`}
                       </Button>
                   </>}>
                <form data-testid="recall-step2" onSubmit={e => { e.preventDefault(); go(); }} className="grid gap-4">
                    <div>
                        <label htmlFor="recall-total" className="mb-1.5 block text-[13px] font-medium text-zinc-700">
                            Чтобы подтвердить, введите число получателей: <span className="rounded-md bg-zinc-900 px-1.5 py-0.5 font-mono text-[13px] text-white">{total}</span>
                        </label>
                        <input id="recall-total" data-autofocus data-testid="recall-input" inputMode="numeric" autoComplete="off" value={typed}
                               onChange={e => setTyped(e.target.value)} placeholder={String(total)} disabled={busy}
                               className={classNames('h-12 w-full rounded-xl border bg-white px-4 text-center font-mono text-lg tracking-widest shadow-soft transition focus:outline-none focus:ring-4',
                                   typed && !matches ? 'border-red-300 focus:ring-red-100' : matches ? 'border-emerald-400 focus:ring-emerald-100' : 'border-zinc-200 focus:border-brand-blue focus:ring-brand-blue/15')}/>
                        <div className="mt-2 flex items-center justify-between text-xs">
                            <span className={classNames(matches ? 'text-emerald-600' : 'text-zinc-500')}>
                                {matches ? '✓ Число совпадает' : 'Число должно совпадать точно'}
                            </span>
                            <span className="flex items-center gap-2 text-zinc-500 tabular">
                                <span className="h-1 w-20 overflow-hidden rounded-full bg-zinc-200">
                                    <span className="block h-full bg-brand-red transition-[width] duration-1000 ease-linear" style={{width: `${((COUNTDOWN - left) / COUNTDOWN) * 100}%`}}/>
                                </span>
                                {left > 0 ? `${left} с` : 'готово'}
                            </span>
                        </div>
                    </div>
                    {err && <div role="alert" className="rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700">{err}</div>}
                </form>
            </Modal>
        </>
    );
}
