'use client';

import {useEffect, useState} from 'react';
import {useForm} from 'react-hook-form';
import {ArrowRight, Eye, EyeOff, Loader2, Lock, Send, User, X} from 'lucide-react';
import {useAuthStore} from "@/shared/store/auth.store";
import {setAuthToken} from "@/shared/utils/auth.utils";
import {signInCancel, signInStatus, signInTicket} from "@/shared/api/auth.api";
import {useUiStore} from "@/shared/store/ui.store";
import {FieldError, Input, Label} from "@/shared/ui/Field";
import Button from "@/shared/ui/Button";
import {Logo} from "@/widgets/layout/ui/AppShell";

const required = 'Заполните поле';

const POLL_MS = 2000;
const TICKET_KEY = 'admin-signin-ticket';
const MSG_DENIED = 'Вход отклонён в Telegram';
const MSG_TIMEOUT = 'Время подтверждения истекло, попробуйте снова';

const storage = {
    read() {
        try {
            const t = JSON.parse(sessionStorage.getItem(TICKET_KEY) || 'null');
            return t?.ticket && t.expiresAt > Date.now() ? t : null;
        } catch { return null; }
    },
    write(t) { try { sessionStorage.setItem(TICKET_KEY, JSON.stringify(t)); } catch { /* private mode */ } },
    clear() { try { sessionStorage.removeItem(TICKET_KEY); } catch { /* ignore */ } },
};

// sign-in error → message (Telegram 2FA aware)
const signInError = e => {
    const status = e?.response?.status;
    const d = e?.response?.data ?? {};
    const code = d.code || d.message;
    if (!e?.response) return 'Сервер недоступен, попробуйте ещё раз';
    if (status === 429 || code === 'TOO_MANY_ATTEMPTS') {
        const min = Math.max(1, Math.ceil((Number(d.retryAfter) || 60) / 60));
        return `Слишком много попыток, попробуйте через ${min} мин`;
    }
    if (code === '2FA_NOT_CONFIGURED') return 'Для аккаунта не привязан Telegram — обратитесь к администратору';
    if (code === 'LOGIN_DENIED') return MSG_DENIED;
    if (status === 408 || code === 'APPROVAL_TIMEOUT') return MSG_TIMEOUT;
    if (status === 503 || code === 'TELEGRAM_UNREACHABLE') return 'Не удалось отправить сообщение в Telegram — откройте бота и нажмите Start';
    // only an explicit 401 / INVALID_CREDENTIALS means wrong login or password
    if (status === 401 || code === 'INVALID_CREDENTIALS') return 'Неверный логин или пароль';
    if (status >= 500) return 'Сервер недоступен, попробуйте ещё раз';
    return 'Не удалось войти, попробуйте ещё раз';
};

export default function SignIn() {
    const [submitting, setSubmitting] = useState(false);
    const [pending, setPending] = useState(null);     // {ticket, expiresAt, total, login} while waiting for the Telegram tap
    const [left, setLeft] = useState(0);
    const [cancelling, setCancelling] = useState(false);
    const [showPass, setShowPass] = useState(false);
    const [failed, setFailed] = useState(null);
    const setLogin = useUiStore(s => s.setLogin);
    const waiting = !!pending;

    const {register, formState: {errors}, handleSubmit} = useForm({defaultValues: {login: '', password: ''}});

    const finish = (token, login) => {
        storage.clear();
        if (login) setLogin(login);
        setAuthToken(token);
        useAuthStore.setState({isAuth: true, token}); // SignInController redirects
    };

    const stopWaiting = message => {
        storage.clear();
        setPending(null);
        if (message) setFailed(message);
    };

    // resume a pending ticket after reload / bfcache return
    useEffect(() => {
        const t = storage.read();
        if (t) setPending(t);
        else storage.clear();
    }, []);

    // poll the ticket every 2 s; resume immediately when the page becomes visible again (iOS app switch)
    useEffect(() => {
        if (!pending) return;
        let alive = true;
        let inFlight = false;
        let timer = null;
        const schedule = () => { clearTimeout(timer); if (alive) timer = setTimeout(poll, POLL_MS); };
        async function poll() {
            if (!alive || inFlight) return;
            if (Date.now() > pending.expiresAt + 5000) return stopWaiting(MSG_TIMEOUT);
            inFlight = true;
            try {
                const r = await signInStatus(pending.ticket);
                if (!alive) return;
                if (r?.token) return finish(r.token, pending.login);
                if (r?.status === 'approved') return stopWaiting('Не удалось войти, попробуйте ещё раз');
                if (r?.status === 'denied') return stopWaiting(MSG_DENIED);
                if (r?.status === 'timeout' || r?.status === 'expired') return stopWaiting(MSG_TIMEOUT);
                if (r?.status === 'cancelled') return stopWaiting(null);
            } catch (e) {
                if (!alive) return;
                const st = e?.response?.status;
                if (st === 404) return stopWaiting(MSG_TIMEOUT);
                // network errors / 5xx / suspended page: retry silently
            } finally {
                inFlight = false;
            }
            schedule();
        }
        const wake = () => { if (document.visibilityState !== 'hidden') { clearTimeout(timer); poll(); } };
        const tick = setInterval(() => setLeft(Math.max(0, Math.ceil((pending.expiresAt - Date.now()) / 1000))), 500);
        setLeft(Math.max(0, Math.ceil((pending.expiresAt - Date.now()) / 1000)));
        document.addEventListener('visibilitychange', wake);
        window.addEventListener('focus', wake);
        window.addEventListener('pageshow', wake);
        poll();
        return () => {
            alive = false;
            clearTimeout(timer);
            clearInterval(tick);
            document.removeEventListener('visibilitychange', wake);
            window.removeEventListener('focus', wake);
            window.removeEventListener('pageshow', wake);
        };
    }, [pending]);

    const onSubmit = async (data) => {
        setSubmitting(true);
        setFailed(null);
        try {
            const r = await signInTicket(data);
            if (r?.token) finish(r.token, data.login);                 // 2FA bypass → logged in directly
            else if (r?.ticket) {
                const expiresIn = Number(r.expiresIn) || 120;
                const t = {ticket: r.ticket, expiresAt: Date.now() + expiresIn * 1000, total: expiresIn, login: data.login};
                storage.write(t);
                setPending(t);
            } else setFailed('Не удалось войти, попробуйте ещё раз');
        } catch (e) {
            setFailed(signInError(e));
        }
        setSubmitting(false);
    };

    const onCancel = async () => {
        if (!pending) return;
        setCancelling(true);
        try { await signInCancel(pending.ticket); } catch { /* the ticket expires anyway */ }
        setCancelling(false);
        stopWaiting(null);
    };

    return (
        <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
            <div className="relative hidden overflow-hidden bg-brand-navy lg:block">
                <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-brand-blue/30 blur-3xl"/>
                <div className="absolute -bottom-48 right-0 h-[480px] w-[480px] rounded-full bg-[#00d4ae]/20 blur-3xl"/>
                <div className="absolute inset-0 opacity-[.07]"
                     style={{backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '22px 22px'}}/>
                <div className="relative flex h-full flex-col justify-between p-12">
                    <Logo/>
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80 ring-1 ring-white/15">
                            <span className="h-1.5 w-1.5 rounded-full bg-brand-yellow"/> Панель управления
                        </div>
                        <h1 className="mt-5 max-w-md text-5xl font-bold leading-[1.05] tracking-tight text-white">
                            Народный<br/>рейтинг
                        </h1>
                        <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-white/60">
                            Номинации, кандидаты, новости и рассылки — всё для ежегодного голосования Repost.uz.
                        </p>
                    </div>
                    <div className="text-xs text-white/40">© Repost.uz</div>
                </div>
            </div>

            <div className="flex items-center justify-center bg-white px-6 py-12">
                <form className="w-full max-w-sm" onSubmit={handleSubmit(onSubmit)} noValidate>
                    <div className="mb-8 lg:hidden"><Logo dark={false}/></div>
                    <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">Вход в админку</h2>
                    <p className="mt-1 text-sm text-zinc-500">Введите логин и пароль администратора</p>

                    {failed && (
                        <div role="alert" className="mt-6 animate-shake rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
                            {failed}
                        </div>
                    )}

                    {waiting && (
                        <div role="status" data-testid="tg-approval" className="mt-6 animate-scale-in rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-white p-5">
                            <div className="flex items-start gap-3">
                                <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-blue text-white">
                                    <Send size={20}/>
                                    <span className="absolute -right-1 -top-1 flex h-4 w-4"><span className="absolute h-full w-full animate-ping rounded-full bg-sky-400 opacity-60"/><span className="relative h-4 w-4 rounded-full bg-sky-500 ring-2 ring-white"/></span>
                                </span>
                                <div className="min-w-0">
                                    <div className="text-[15px] font-semibold text-zinc-900">Подтвердите вход в Telegram</div>
                                    <div className="mt-0.5 text-sm leading-relaxed text-zinc-600">Мы отправили сообщение боту. Откройте Telegram, нажмите «Подтвердить вход», затем вернитесь сюда.</div>
                                </div>
                            </div>
                            <div className="mt-4 flex items-center gap-3 text-xs text-zinc-500 tabular">
                                <Loader2 size={14} className="animate-spin text-brand-blue"/>
                                <span className="h-1 flex-1 overflow-hidden rounded-full bg-sky-100">
                                    <span className="block h-full rounded-full bg-brand-blue transition-[width] duration-500 ease-linear" style={{width: `${(left / (pending.total || 120)) * 100}%`}}/>
                                </span>
                                <span>{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</span>
                            </div>
                        </div>
                    )}

                    <div className={waiting ? 'hidden' : ''}>
                    <div className="mt-6">
                        <Label htmlFor="login">Логин</Label>
                        <Input id="login" icon={User} autoComplete="username" autoFocus invalid={!!errors.login}
                               placeholder="admin" {...register('login', {required})}/>
                        <FieldError error={errors.login}/>
                    </div>
                    <div className="mt-4">
                        <Label htmlFor="password">Пароль</Label>
                        <div className="relative">
                            <Input id="password" icon={Lock} type={showPass ? 'text' : 'password'} autoComplete="current-password"
                                   invalid={!!errors.password} className="pr-10" placeholder="••••••••"
                                   {...register('password', {required})}/>
                            <button type="button" onClick={() => setShowPass(v => !v)} tabIndex={-1}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-zinc-400 hover:text-zinc-700"
                                    aria-label={showPass ? 'Скрыть пароль' : 'Показать пароль'}>
                                {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                            </button>
                        </div>
                        <FieldError error={errors.password}/>
                    </div>
                    </div>

                    {waiting ? (
                        <Button data-testid="tg-cancel" variant="secondary" size="lg" className="mt-4 w-full" icon={X} loading={cancelling} onClick={onCancel}>
                            Отмена
                        </Button>
                    ) : (
                        <Button type="submit" variant="primary" size="lg" className="mt-6 w-full" loading={submitting} iconRight={submitting ? undefined : ArrowRight}>
                            {submitting ? 'Входим…' : 'Войти'}
                        </Button>
                    )}
                </form>
            </div>
        </div>
    );
}
