import { useState } from 'react';
import { AlertCircle, CheckCircle2, LoaderCircle } from 'lucide-react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import { useExchange } from './context/ExchangeContext';
import Dashboard from './pages/Dashboard';
import Market from './pages/Market';
import Wallet from './pages/Wallet';
import History from './pages/History';
import Leaderboard from './pages/Leaderboard';
import PriceAlerts from './pages/PriceAlerts';

export default function App() {
  const [menu, setMenu] = useState(false); const { loading, error, user, toast, refresh } = useExchange();
  if (loading && !user) return <div className="grid min-h-screen place-items-center"><div className="text-center"><LoaderCircle className="mx-auto animate-spin text-lime" size={34}/><div className="mt-3 text-sm text-muted">Подключаемся к рынку…</div></div></div>;
  if (error && !user) return <div className="grid min-h-screen place-items-center p-6"><div className="panel max-w-sm p-8 text-center"><AlertCircle className="mx-auto text-rose-400"/><h1 className="text-xl">Нет связи с сервером</h1><p className="text-sm text-muted">{error}</p><button onClick={() => refresh()} className="mt-3 rounded-xl bg-lime px-5 py-3 text-sm font-bold text-ink">Повторить</button></div></div>;
  return <div className="min-h-screen bg-ink"><Sidebar open={menu} onClose={() => setMenu(false)}/><div className="lg:pl-64"><Header onMenu={() => setMenu(true)}/><main className="mx-auto max-w-[1600px] p-4 sm:p-7"><Routes><Route path="/" element={<Dashboard/>}/><Route path="/market" element={<Market/>}/><Route path="/wallet" element={<Wallet/>}/><Route path="/alerts" element={<PriceAlerts/>}/><Route path="/history" element={<History/>}/><Route path="/leaderboard" element={<Leaderboard/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes></main></div>{toast && <div className={`fixed bottom-5 right-5 z-[80] flex max-w-sm items-center gap-3 rounded-xl border px-4 py-3 text-sm shadow-2xl ${toast.type === 'success' ? 'border-emerald-400/30 bg-[#10231c] text-emerald-300' : 'border-rose-400/30 bg-[#28151a] text-rose-300'}`}>{toast.type === 'success' ? <CheckCircle2 size={19}/> : <AlertCircle size={19}/>} {toast.text}</div>}</div>;
}
