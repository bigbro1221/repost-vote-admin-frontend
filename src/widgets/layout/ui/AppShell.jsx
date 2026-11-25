'use client';
import {useEffect, useState} from 'react';
import NextLink from 'next/link';
import {usePathname} from 'next/navigation';
import classNames from 'classnames';
import {CalendarCog, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Send, Trophy, Users, X} from 'lucide-react';
import {useAuthStore} from '@/shared/store/auth.store';
import {useUiStore} from '@/shared/store/ui.store';
import {routeNames} from '@/shared/config/route-names';
import {confirmAction} from '@/shared/ui/confirm';
import YearSwitcher from './YearSwitcher';

const NAV = [
    {href: '/', label: 'Номинации', icon: Trophy, match: p => p === '/' || p.startsWith('/nomination') || p.startsWith('/candidate')},
    {href: '/user', label: 'Пользователи', icon: Users},
    {href: '/newsletter', label: 'Рассылка', icon: Send},
    {href: '/edition', label: 'Настройки года', icon: CalendarCog},
];

export const Logo = ({collapsed, dark = true}) => (
    <div className="flex items-center gap-2.5">
        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-yellow shadow-[inset_0_-2px_0_rgba(0,0,0,.12)]">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                <path fill="#111" d="M12 2.5l2.7 6.1 6.6.6-5 4.4 1.5 6.5L12 16.7 6.2 20.1l1.5-6.5-5-4.4 6.6-.6z"/>
            </svg>
        </span>
        {!collapsed && (
            <div className="min-w-0 leading-tight">
                <div className={classNames('text-[11px] font-semibold uppercase tracking-[.14em]', dark ? 'text-zinc-500' : 'text-zinc-400')}>Repost</div>
                <div className={classNames('truncate text-[15px] font-semibold', dark ? 'text-white' : 'text-zinc-900')}>Народный рейтинг</div>
            </div>
        )}
    </div>
);

const SidebarContent = ({collapsed, onNavigate, onToggle}) => {
    const pathname = usePathname();
    const {signOut} = useAuthStore();
    const login = useUiStore(s => s.login);

    const logout = async () => {
        if (await confirmAction({title: 'Выйти из админки?', confirmText: 'Выйти', icon: LogOut})) signOut();
    };

    return (
        <div className="flex h-full flex-col">
            <div className={classNames('flex items-center pt-5', collapsed ? 'justify-center px-3' : 'justify-between px-4')}>
                <Logo collapsed={collapsed}/>
                {onToggle && !collapsed && (
                    <button onClick={onToggle} title="Свернуть" className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/10 hover:text-zinc-200">
                        <PanelLeftClose size={18}/>
                    </button>
                )}
            </div>

            <div className={classNames('mt-6', collapsed ? 'px-3' : 'px-4')}>
                <YearSwitcher collapsed={collapsed}/>
            </div>

            <nav className={classNames('mt-6 flex flex-col gap-1', collapsed ? 'px-3' : 'px-3')}>
                {!collapsed && <div className="mb-1 px-3 text-[11px] font-medium uppercase tracking-wider text-zinc-600">Управление</div>}
                {NAV.map(({href, label, icon: Icon, match}) => {
                    const active = match ? match(pathname) : pathname.startsWith(href);
                    return (
                        <NextLink key={href} href={href} onClick={onNavigate} title={collapsed ? label : undefined}
                                  className={classNames('group relative flex items-center gap-3 rounded-xl text-sm font-medium transition-all',
                                      collapsed ? 'h-11 justify-center' : 'h-10 px-3',
                                      active ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/[.06] hover:text-zinc-100')}>
                            {active && <span className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand-yellow"/>}
                            <Icon size={18} className={active ? 'text-brand-yellow' : ''}/>
                            {!collapsed && label}
                        </NextLink>
                    );
                })}
            </nav>

            <div className="flex-1"/>

            {collapsed && onToggle && (
                <div className="px-3 pb-2">
                    <button onClick={onToggle} title="Развернуть" className="flex h-10 w-full items-center justify-center rounded-xl text-zinc-500 hover:bg-white/10 hover:text-zinc-200">
                        <PanelLeftOpen size={18}/>
                    </button>
                </div>
            )}

            <div className={classNames('border-t border-white/[.08] py-4', collapsed ? 'px-3' : 'px-4')}>
                <div className={classNames('flex items-center gap-3', collapsed && 'justify-center')}>
                    {!collapsed && (
                        <>
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-blue to-cyan-400 text-sm font-semibold uppercase text-white">
                                {(login || 'A').slice(0, 1)}
                            </span>
                            <div className="min-w-0 flex-1 leading-tight">
                                <div className="truncate text-sm font-medium text-zinc-100">{login || 'Администратор'}</div>
                                <div className="text-xs text-zinc-500">Администратор</div>
                            </div>
                        </>
                    )}
                    <button onClick={logout} title="Выйти" data-testid="logout"
                            className="rounded-lg p-2 text-zinc-500 transition hover:bg-white/10 hover:text-zinc-100">
                        <LogOut size={18}/>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function AppShell({children}) {
    const [mounted, setMounted] = useState(false);
    const [drawer, setDrawer] = useState(false);
    const pathname = usePathname();
    const {isAuth} = useAuthStore();
    const {sidebarCollapsed, toggleSidebar} = useUiStore();

    useEffect(() => setMounted(true), []);
    useEffect(() => setDrawer(false), [pathname]);

    if (!mounted) return <div className="min-h-screen bg-zinc-50"/>;

    if (!isAuth || pathname.startsWith(routeNames.signIn)) {
        return <main className="min-h-screen">{children}</main>;
    }

    return (
        <div className="min-h-screen">
            {/* desktop sidebar */}
            <aside className={classNames('fixed inset-y-0 left-0 z-40 hidden bg-zinc-950 transition-[width] duration-200 lg:block',
                sidebarCollapsed ? 'w-[76px]' : 'w-[264px]')}>
                <SidebarContent collapsed={sidebarCollapsed} onToggle={toggleSidebar}/>
            </aside>

            {/* mobile top bar + drawer */}
            <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-zinc-200/80 bg-white/85 px-4 backdrop-blur lg:hidden">
                <button onClick={() => setDrawer(true)} className="-ml-2 rounded-lg p-2 text-zinc-700 hover:bg-zinc-100" aria-label="Меню">
                    <Menu size={20}/>
                </button>
                <Logo dark={false}/>
                <span className="w-9"/>
            </header>
            {drawer && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div className="absolute inset-0 animate-fade-in bg-zinc-950/40" onClick={() => setDrawer(false)}/>
                    <aside className="absolute inset-y-0 left-0 w-[280px] animate-slide-in-left bg-zinc-950 shadow-pop">
                        <button onClick={() => setDrawer(false)} className="absolute right-3 top-5 rounded-lg p-1.5 text-zinc-500 hover:bg-white/10" aria-label="Закрыть меню">
                            <X size={18}/>
                        </button>
                        <SidebarContent collapsed={false} onNavigate={() => setDrawer(false)}/>
                    </aside>
                </div>
            )}

            <main className={classNames('transition-[padding] duration-200', sidebarCollapsed ? 'lg:pl-[76px]' : 'lg:pl-[264px]')}>
                <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
                    {children}
                </div>
            </main>
        </div>
    );
}
