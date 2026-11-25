'use client';
import classNames from 'classnames';
import {CheckCircle2, Info, X, XCircle} from 'lucide-react';
import {useToastStore} from './toast';

const ICON = {
    success: <CheckCircle2 size={18} className="text-brand-green"/>,
    error: <XCircle size={18} className="text-brand-red"/>,
    info: <Info size={18} className="text-brand-blue"/>,
};

export default function Toaster() {
    const {toasts, dismiss} = useToastStore();
    return (
        <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-0 z-[80] flex flex-col items-center gap-2 p-3 sm:p-4">
            {toasts.map(t => (
                <div key={t.id} role={t.type === 'error' ? 'alert' : 'status'} data-toast={t.type}
                     className={classNames('pointer-events-auto flex w-full max-w-sm animate-toast-in items-start gap-3 rounded-2xl border bg-white/95 px-4 py-3 shadow-pop backdrop-blur',
                         t.type === 'error' ? 'border-red-200' : 'border-zinc-200')}>
                    <span className="mt-0.5 shrink-0">{ICON[t.type]}</span>
                    <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-zinc-900">{t.title}</div>
                        {t.description && <div className="mt-0.5 break-words text-[13px] text-zinc-600">{t.description}</div>}
                    </div>
                    <button onClick={() => dismiss(t.id)} className="-mr-1 rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700" aria-label="Закрыть">
                        <X size={14}/>
                    </button>
                </div>
            ))}
        </div>
    );
}
