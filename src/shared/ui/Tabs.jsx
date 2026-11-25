'use client';
import classNames from 'classnames';

const Tabs = ({value, onChange, items, className}) => (
    <div role="tablist" className={classNames('flex gap-1 border-b border-zinc-200', className)}>
        {items.map(({value: v, label, icon: Icon, count, disabled}) => {
            const active = v === value;
            return (
                <button key={v} role="tab" aria-selected={active} disabled={disabled} type="button"
                        onClick={() => onChange(v)}
                        className={classNames('relative -mb-px flex items-center gap-2 px-3 pb-3 pt-1 text-sm font-medium transition-colors disabled:opacity-40',
                            active ? 'text-zinc-900' : 'text-zinc-500 hover:text-zinc-800')}>
                    {Icon && <Icon size={16}/>}
                    {label}
                    {count != null && (
                        <span className={classNames('rounded-full px-1.5 text-[11px] font-semibold tabular',
                            active ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600')}>{count}</span>
                    )}
                    <span className={classNames('absolute inset-x-2 bottom-0 h-0.5 rounded-full transition-all',
                        active ? 'bg-zinc-900' : 'bg-transparent')}/>
                </button>
            );
        })}
    </div>
);

export default Tabs;
