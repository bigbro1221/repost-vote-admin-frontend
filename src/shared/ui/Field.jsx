'use client';
import {forwardRef} from 'react';
import classNames from 'classnames';

export const inputBase = 'block w-full rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 placeholder:text-zinc-400 shadow-soft transition focus:border-brand-blue focus:outline-none focus:ring-4 focus:ring-brand-blue/15 disabled:bg-zinc-50 disabled:text-zinc-500';

export const Label = ({children, hint, className, htmlFor}) => (
    <label htmlFor={htmlFor} className={classNames('mb-1.5 flex items-baseline justify-between gap-2 text-[13px] font-medium text-zinc-700', className)}>
        <span>{children}</span>
        {hint && <span className="text-xs font-normal text-zinc-400">{hint}</span>}
    </label>
);

export const FieldError = ({error}) => error
    ? <p className="mt-1.5 text-xs font-medium text-red-600">{error.message || 'Обязательное поле'}</p>
    : null;

export const Input = forwardRef(function Input({className, icon: Icon, invalid, ...rest}, ref) {
    const input = (
        <input ref={ref} className={classNames(inputBase, 'h-10 px-3', Icon && 'pl-9', invalid && '!border-red-400 focus:!ring-red-100', className)} {...rest}/>
    );
    if (!Icon) return input;
    return (
        <div className="relative">
            <Icon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"/>
            {input}
        </div>
    );
});

export const Textarea = forwardRef(function Textarea({className, invalid, ...rest}, ref) {
    return <textarea ref={ref} className={classNames(inputBase, 'px-3 py-2.5 leading-relaxed', invalid && '!border-red-400', className)} {...rest}/>;
});

export const NativeSelect = forwardRef(function NativeSelect({className, children, ...rest}, ref) {
    return (
        <select ref={ref} className={classNames(inputBase, 'h-10 appearance-none bg-[length:16px] bg-[right_10px_center] bg-no-repeat pl-3 pr-9', className)}
                style={{backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")"}}
                {...rest}>
            {children}
        </select>
    );
});

export const Switch = ({checked, onChange, label, description, disabled, id}) => (
    <label htmlFor={id} className={classNames('flex cursor-pointer items-start gap-3 select-none', disabled && 'opacity-50 cursor-not-allowed')}>
        <button id={id} type="button" role="switch" aria-checked={!!checked} disabled={disabled}
                onClick={() => onChange?.(!checked)}
                className={classNames('relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
                    checked ? 'bg-brand-blue' : 'bg-zinc-300')}>
            <span className={classNames('inline-block h-4 w-4 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-[18px]' : 'translate-x-0.5')}/>
        </button>
        {(label || description) && (
            <span className="min-w-0">
                {label && <span className="block text-sm font-medium text-zinc-800">{label}</span>}
                {description && <span className="block text-xs text-zinc-500">{description}</span>}
            </span>
        )}
    </label>
);
