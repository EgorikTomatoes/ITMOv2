import { useState } from 'react';
import { Bell, CheckCheck, ChevronDown, Menu } from 'lucide-react';
import { useExchange } from '../context/ExchangeContext';

export default function Header({ onMenu }) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { users, activeUserId, setActiveUserId, user, notifications, markNotificationRead, markAllNotificationsRead } = useExchange();
  const unread = notifications.filter((item) => !item.read).length;
  return <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-line bg-ink/90 px-4 backdrop-blur-xl sm:px-7">
    <div className="flex items-center gap-3"><button onClick={onMenu} className="rounded-lg p-2 hover:bg-white/5 lg:hidden"><Menu /></button><div><div className="text-xs text-muted">Симулятор рынка</div><div className="text-sm font-semibold">Live trading</div></div></div>
    <div className="flex items-center gap-2 sm:gap-4">
      <div className="relative">
        <button aria-label="Open notifications" onClick={() => setNotificationsOpen((value) => !value)} className="relative rounded-xl border border-line p-2.5 text-muted hover:text-white"><Bell size={19}/>{unread > 0 && <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-lime px-1 text-[10px] font-bold text-ink">{unread > 9 ? '9+' : unread}</span>}</button>
        {notificationsOpen && <div className="absolute right-0 top-14 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line bg-[#0d131c] shadow-2xl">
          <div className="flex items-center justify-between border-b border-line p-4"><div><div className="font-semibold">Notifications</div><div className="mt-0.5 text-xs text-muted">{unread} unread</div></div>{unread > 0 && <button onClick={markAllNotificationsRead} className="flex items-center gap-1.5 text-xs font-semibold text-lime hover:text-white"><CheckCheck size={15}/>Mark all as read</button>}</div>
          <div className="max-h-96 overflow-y-auto scrollbar">{notifications.slice(0, 8).map((item) => <button key={item.id} onClick={() => !item.read && markNotificationRead(item.id)} className={`flex w-full gap-3 border-b border-line/70 p-4 text-left last:border-0 hover:bg-white/[.025] ${item.read ? 'opacity-60' : ''}`}><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.read ? 'bg-muted' : 'bg-lime'}`}/><span><span className="block text-sm leading-5">{item.message}</span><span className="mt-1 block text-xs text-muted">{new Date(item.createdAt).toLocaleString('ru')}</span></span></button>)}{notifications.length === 0 && <div className="p-8 text-center text-sm text-muted">No notifications yet</div>}</div>
        </div>}
      </div>
      <label className="relative flex items-center gap-3 rounded-xl border border-line bg-panel py-1.5 pl-2 pr-8">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-lime to-emerald-500 text-xs font-bold text-ink">{user?.avatar || '—'}</span>
        <span className="hidden text-left sm:block"><span className="block text-sm font-semibold">{user?.name || 'Загрузка'}</span><span className="block text-[11px] text-muted">Демо-аккаунт</span></span>
        <select aria-label="Активный пользователь" value={activeUserId} onChange={(event) => setActiveUserId(event.target.value)} className="absolute inset-0 cursor-pointer opacity-0">{users.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <ChevronDown size={15} className="absolute right-2 text-muted" />
      </label>
    </div>
  </header>;
}
