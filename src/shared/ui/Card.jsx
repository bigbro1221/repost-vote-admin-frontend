import classNames from 'classnames';

export const Card = ({className, children, ...rest}) => (
    <div className={classNames('rounded-2xl border border-zinc-200/80 bg-white shadow-card', className)} {...rest}>{children}</div>
);

export const CardHeader = ({title, description, icon: Icon, actions, className}) => (
    <div className={classNames('flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4', className)}>
        <div className="flex min-w-0 items-start gap-3">
            {Icon && (
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700">
                    <Icon size={18}/>
                </span>
            )}
            <div className="min-w-0">
                <h3 className="text-[15px] font-semibold text-zinc-900">{title}</h3>
                {description && <p className="mt-0.5 text-[13px] text-zinc-500">{description}</p>}
            </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
);

export const CardBody = ({className, children}) => <div className={classNames('px-5 py-5', className)}>{children}</div>;

export const PageHeader = ({title, description, actions, eyebrow}) => (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
            {eyebrow && <div className="mb-1 text-xs font-medium uppercase tracking-wider text-zinc-400">{eyebrow}</div>}
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-[28px]">{title}</h1>
            {description && <p className="mt-1 text-sm text-zinc-500">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
);

export const Skeleton = ({className}) => <div className={classNames('skeleton', className)}/>;

export const EmptyState = ({icon: Icon, title, description, action, className}) => (
    <div className={classNames('flex flex-col items-center justify-center px-6 py-10 text-center', className)}>
        {Icon && (
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-b from-zinc-50 to-zinc-100 text-zinc-400 ring-1 ring-zinc-200">
                <Icon size={22}/>
            </div>
        )}
        <div className="text-sm font-semibold text-zinc-800">{title}</div>
        {description && <div className="mt-1 max-w-sm text-[13px] text-zinc-500">{description}</div>}
        {action && <div className="mt-4">{action}</div>}
    </div>
);
