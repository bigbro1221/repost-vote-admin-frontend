'use client';
import {useRef} from 'react';
import {createPortal} from 'react-dom';
import classNames from 'classnames';
import {X} from 'lucide-react';
import {useOverlay} from './overlay';

const SIZES = {sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl'};

const Modal = ({open, onClose, title, description, icon: Icon, tone = 'default', size = 'md', children, footer, dismissible = true}) => {
    const panelRef = useRef(null);
    const close = () => dismissible && onClose?.();
    useOverlay(open, close, panelRef);
    if (!open || typeof document === 'undefined') return null;
    return createPortal(
        <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4" role="presentation">
            <div className="absolute inset-0 animate-fade-in bg-zinc-950/40 backdrop-blur-[3px]" onClick={close}/>
            <div ref={panelRef} role="dialog" aria-modal="true" tabIndex={-1}
                 className={classNames('relative w-full animate-scale-in overflow-hidden rounded-t-2xl bg-white shadow-pop outline-none sm:rounded-2xl',
                     SIZES[size], tone === 'danger' && 'ring-1 ring-red-200')}>
                {tone === 'danger' && <div className="h-1 w-full bg-gradient-to-r from-brand-red via-red-500 to-orange-400"/>}
                {(title || Icon) && (
                    <div className="flex items-start gap-3 px-6 pt-5">
                        {Icon && (
                            <span className={classNames('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                                tone === 'danger' ? 'bg-red-50 text-brand-red ring-1 ring-red-100' : 'bg-zinc-100 text-zinc-700')}>
                                <Icon size={20}/>
                            </span>
                        )}
                        <div className="min-w-0 flex-1 pt-0.5">
                            {title && <h2 className="text-[17px] font-semibold leading-snug text-zinc-900">{title}</h2>}
                            {description && <p className="mt-1 text-sm text-zinc-500">{description}</p>}
                        </div>
                        {dismissible && (
                            <button onClick={close} aria-label="Закрыть"
                                    className="-mr-2 -mt-1 rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700">
                                <X size={18}/>
                            </button>
                        )}
                    </div>
                )}
                <div className={children ? "px-6 py-5" : "pb-5"}>{children}</div>
                {footer && (
                    <div className="flex flex-col-reverse gap-2 border-t border-zinc-100 bg-zinc-50/70 px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body,
    );
};

export default Modal;
