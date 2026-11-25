'use client';
import {useEffect, useState} from 'react';
import classNames from 'classnames';
import {AlertTriangle, ArrowLeft, ArrowRight, Link2, Link2Off, Send, ShieldAlert, Type, Users} from 'lucide-react';
import Modal from '@/shared/ui/Modal';
import Button from '@/shared/ui/Button';
import {Skeleton} from '@/shared/ui/Card';
import {countRecipients} from '@/shared/api/broadcast.api';
import {errorCode, errorMessage} from '@/shared/api/errors';
import {fmtNum, plural} from '@/shared/lib/format';
import Preview from './Preview';

const COUNTDOWN = 5;
const digits = s => String(s ?? '').replace(/[\s  ]/g, '');

/**
 * Two separate confirmation steps before a broadcast to ALL users.
 *  1) summary: recipients (GET /broadcast/audience), message preview, link-preview setting → «Далее»
 *  2) danger: type the exact recipient count + 5 s countdown → final send
 * onSend(total) must save the draft and POST /broadcast/:id/send {confirmTotal: total}; may throw.
 */
export default function SendAllFlow({open, onClose, model, disablePreview, onSend}) {
    const [step, setStep] = useState(1);
    const [total, setTotal] = useState(null);
    const [loadError, setLoadError] = useState(null);
    const [typed, setTyped] = useState('');
    const [left, setLeft] = useState(COUNTDOWN);
    const [sending, setSending] = useState(false);
    const [stepError, setStepError] = useState(null);

    // reset + load audience each time the flow opens
    useEffect(() => {
        if (!open) return;
        setStep(1); setTotal(null); setLoadError(null); setTyped(''); setStepError(null); setSending(false);
        let alive = true;
        countRecipients().then(n => alive && setTotal(n)).catch(e => alive && setLoadError(errorMessage(e)));
        return () => { alive = false; };
    }, [open]);

    // step 2 countdown (restarts whenever step 2 is (re)entered or the total changes)
    useEffect(() => {
        if (!open || step !== 2) return;
        setLeft(COUNTDOWN);
        const t = setInterval(() => setLeft(v => (v <= 1 ? (clearInterval(t), 0) : v - 1)), 1000);
        return () => clearInterval(t);
    }, [open, step, total]);

    const cancel = () => { if (!sending) onClose(); };
    const matches = total != null && digits(typed) === String(total);
    const canSend = matches && left === 0 && !sending && total > 0;

    const send = async () => {
        if (!canSend) return;
        setSending(true);
        setStepError(null);
        try {
            await onSend(total);
            onClose();
        } catch (e) {
            if (errorCode(e) === 'CONFIRMATION_MISMATCH' && typeof e?.response?.data?.total === 'number') {
                setTotal(e.response.data.total);
                setTyped('');
                setStepError(`Число получателей изменилось — теперь ${fmtNum(e.response.data.total)}. Введите новое число.`);
            } else {
                setStepError(errorMessage(e));
            }
        } finally {
            setSending(false);
        }
    };

    const people = n => plural(n, 'пользователь', 'пользователя', 'пользователей');
    const peopleDat = n => plural(n, 'пользователю', 'пользователям', 'пользователям');

    return (
        <>
            {/* ---------- Step 1: summary ---------- */}
            <Modal open={open && step === 1} onClose={cancel} size="lg" icon={Send}
                   title="Рассылка всем пользователям"
                   description="Шаг 1 из 2 · проверьте сообщение и получателей"
                   footer={<>
                       <Button variant="secondary" onClick={cancel}>Отмена</Button>
                       <Button data-testid="send-all-next" variant="dark" iconRight={ArrowRight} disabled={total == null || !total}
                               onClick={() => { setTyped(''); setStepError(null); setStep(2); }}>
                           Далее
                       </Button>
                   </>}>
                <div className="grid gap-4" data-testid="send-all-step1">
                    <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl bg-zinc-900 px-4 py-3 text-white sm:col-span-1">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-400"><Users size={14}/>Получатели</div>
                            <div className="mt-1 text-2xl font-semibold tabular" data-testid="send-all-total">
                                {total != null ? fmtNum(total) : loadError ? '—' : <Skeleton className="mt-1 h-7 w-20 !bg-white/15"/>}
                            </div>
                            <div className="text-xs text-zinc-400">все зарегистрированные</div>
                        </div>
                        <div className="rounded-2xl border border-zinc-200 px-4 py-3">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
                                {disablePreview ? <Link2Off size={14}/> : <Link2 size={14}/>}Превью ссылок
                            </div>
                            <div className="mt-1 text-base font-semibold text-zinc-900">{disablePreview ? 'Выключено' : 'Включено'}</div>
                        </div>
                        <div className="rounded-2xl border border-zinc-200 px-4 py-3">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500"><Type size={14}/>Текст</div>
                            <div className="mt-1 text-base font-semibold text-zinc-900 tabular">{fmtNum(model.text.length)} симв.</div>
                            <div className="text-xs text-zinc-500 tabular">форматов: {model.entities.length}</div>
                        </div>
                    </div>
                    {loadError && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                            Не удалось получить число получателей: {loadError}
                        </div>
                    )}
                    {total === 0 && <div className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">Нет получателей — отправлять некому.</div>}
                    <div className="overflow-hidden rounded-2xl border border-zinc-200">
                        <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-2 text-xs font-medium text-zinc-500">Так сообщение увидят в Telegram</div>
                        <div className="max-h-[320px] overflow-y-auto scrollbar-thin">
                            <Preview model={model} disablePreview={disablePreview}/>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* ---------- Step 2: danger confirmation ---------- */}
            <Modal open={open && step === 2} onClose={cancel} size="md" tone="danger" icon={ShieldAlert} dismissible={!sending}
                   title="Подтвердите отправку"
                   description="Шаг 2 из 2 · последнее подтверждение"
                   footer={<>
                       <Button variant="secondary" icon={ArrowLeft} disabled={sending} onClick={() => setStep(1)}>Назад</Button>
                       <Button data-testid="send-all-confirm" variant="danger" icon={Send} loading={sending} disabled={!canSend} onClick={send}
                               className="sm:min-w-[240px]">
                           {left > 0
                               ? `Отправить через ${left} с`
                               : `Отправить ${fmtNum(total ?? 0)} ${peopleDat(total ?? 0)}`}
                       </Button>
                   </>}>
                <form data-testid="send-all-step2" onSubmit={e => { e.preventDefault(); send(); }} className="grid gap-4">
                    <div className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
                        <AlertTriangle size={18} className="mt-0.5 shrink-0"/>
                        <p className="text-sm leading-relaxed">
                            Сообщение получат <b className="tabular">{fmtNum(total ?? 0)}</b> {people(total ?? 0)}.{' '}
                            <b>Это действие нельзя отменить</b> — доставленные сообщения останутся у получателей.
                        </p>
                    </div>
                    <div>
                        <label htmlFor="confirm-total" className="mb-1.5 block text-[13px] font-medium text-zinc-700">
                            Чтобы подтвердить, введите число получателей: <span className="rounded-md bg-zinc-900 px-1.5 py-0.5 font-mono text-[13px] text-white">{total}</span>
                        </label>
                        <input id="confirm-total" data-autofocus data-testid="send-all-input" inputMode="numeric" autoComplete="off" value={typed}
                               onChange={e => setTyped(e.target.value)} placeholder={String(total ?? '')} disabled={sending}
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
                    {stepError && <div role="alert" className="rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700">{stepError}</div>}
                </form>
            </Modal>
        </>
    );
}
