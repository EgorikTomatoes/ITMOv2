import { BarChart3, BellRing, History, LayoutDashboard, Trophy, WalletCards, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import Logo from './Logo';

const links = [
  ['/', 'Обзор', LayoutDashboard], ['/market', 'Рынок', BarChart3], ['/wallet', 'Кошелёк', WalletCards],
  ['/alerts', 'Price Alerts', BellRing], ['/history', 'История', History], ['/leaderboard', 'Рейтинг', Trophy],
];

export default function Sidebar({ open, onClose }) {
  return <>
    {open && <button aria-label="Закрыть меню" className="fixed inset-0 z-40 bg-black/70 lg:hidden" onClick={onClose} />}
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-line bg-[#090e15] p-5 transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="mb-9 flex items-center justify-between"><Logo /><button className="lg:hidden" onClick={onClose}><X /></button></div>
      <nav className="space-y-2">{links.map(([to, label, Icon]) => <NavLink key={to} to={to} end={to === '/'} onClick={onClose} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium ${isActive ? 'bg-lime text-ink' : 'text-muted hover:bg-white/5 hover:text-white'}`}><Icon size={19} />{label}</NavLink>)}</nav>
      <div className="mt-auto rounded-2xl border border-line bg-white/[.025] p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><span className="h-2 w-2 rounded-full bg-emerald-400" />Рынок открыт</div>
        <p className="m-0 text-xs leading-5 text-muted">Виртуальная торговля работает круглосуточно</p>
      </div>
    </aside>
  </>;
}
