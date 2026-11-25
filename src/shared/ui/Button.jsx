'use client';
import {forwardRef} from 'react';
import NextLink from 'next/link';
import classNames from 'classnames';
import {Loader2} from 'lucide-react';

const VARIANTS = {
    primary: 'bg-brand-yellow text-zinc-900 hover:bg-brand-yellow-hover shadow-[inset_0_-1px_0_rgba(0,0,0,.08)] shadow-soft',
    dark: 'bg-zinc-900 text-white hover:bg-zinc-800 shadow-soft',
    secondary: 'bg-white text-zinc-800 border border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 shadow-soft',
    ghost: 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
    danger: 'bg-brand-red text-white hover:bg-red-600 shadow-soft',
    'danger-ghost': 'text-red-600 hover:bg-red-50',
    success: 'bg-brand-green text-white hover:bg-emerald-600 shadow-soft',
    link: 'text-brand-blue hover:underline px-0 h-auto',
};
const SIZES = {
    xs: 'h-7 px-2 text-xs gap-1 rounded-lg',
    sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-lg',
    md: 'h-10 px-4 text-sm gap-2 rounded-xl',
    lg: 'h-12 px-5 text-[15px] gap-2 rounded-xl',
    icon: 'h-9 w-9 rounded-lg',
    'icon-sm': 'h-8 w-8 rounded-lg',
    'icon-xs': 'h-7 w-7 rounded-md',
};

export const buttonClass = ({variant = 'secondary', size = 'md', className} = {}) => classNames(
    'inline-flex items-center justify-center font-medium whitespace-nowrap select-none transition-all duration-150',
    'active:scale-[.98] disabled:opacity-50 disabled:pointer-events-none',
    VARIANTS[variant], variant === 'link' ? '' : SIZES[size], className,
);

const Button = forwardRef(function Button(
    {variant, size, className, loading, icon: Icon, iconRight: IconRight, children, href, type = 'button', disabled, ...rest}, ref,
) {
    const cls = buttonClass({variant, size, className});
    const iconSize = size === 'xs' || size === 'icon-xs' ? 14 : 16;
    const content = (
        <>
            {loading ? <Loader2 size={iconSize} className="animate-spin"/> : Icon ? <Icon size={iconSize} strokeWidth={2}/> : null}
            {children}
            {IconRight && <IconRight size={iconSize} strokeWidth={2}/>}
        </>
    );
    if (href) return <NextLink ref={ref} href={href} className={cls} {...rest}>{content}</NextLink>;
    return (
        <button ref={ref} type={type} className={cls} disabled={disabled || loading} {...rest}>
            {content}
        </button>
    );
});

export default Button;
