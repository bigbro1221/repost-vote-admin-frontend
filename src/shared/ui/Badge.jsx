import classNames from 'classnames';

const TONES = {
    neutral: 'bg-zinc-100 text-zinc-700 ring-zinc-200/60',
    blue: 'bg-sky-50 text-sky-700 ring-sky-200/70',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-200/70',
    red: 'bg-red-50 text-red-700 ring-red-200/70',
    amber: 'bg-amber-50 text-amber-800 ring-amber-200/70',
    yellow: 'bg-[#FFF6D6] text-amber-900 ring-[#FFD12F]/50',
    dark: 'bg-zinc-900 text-white ring-zinc-900',
};

const Badge = ({tone = 'neutral', dot, icon: Icon, className, children, title}) => (
    <span title={title} className={classNames('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset tabular', TONES[tone], className)}>
        {dot && <span className={classNames('h-1.5 w-1.5 rounded-full', {
            neutral: 'bg-zinc-400', blue: 'bg-sky-500', green: 'bg-emerald-500', red: 'bg-red-500', amber: 'bg-amber-500', yellow: 'bg-amber-400', dark: 'bg-white',
        }[tone])}/>}
        {Icon && <Icon size={12} strokeWidth={2.2}/>}
        {children}
    </span>
);

export const EDITION_STATUS = {
    draft: {label: 'Черновик', tone: 'neutral'},
    active: {label: 'Идёт голосование', short: 'Активен', tone: 'green'},
    closed: {label: 'Закрыт', tone: 'amber'},
};

export default Badge;
