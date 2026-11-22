import { ArrowDownLeft, ArrowUpRight, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function BalanceCard({ portfolio }) {
  const positive = portfolio.returnValue >= 0;
  return <section className="relative overflow-hidden rounded-3xl border border-lime/15 bg-gradient-to-br from-[#172219] via-panel to-[#0b1119] p-6 shadow-glow sm:p-8">
    <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-lime/10 blur-3xl" />
    <div className="relative"><div className="mb-3 flex items-center gap-2 text-sm text-muted">Общий баланс <Eye size={15}/></div>
      <div className="number text-4xl font-semibold tracking-tight sm:text-5xl">${portfolio.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
      <div className={`mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold ${positive ? 'bg-emerald-400/10 text-emerald-400' : 'bg-rose-400/10 text-rose-400'}`}>{positive ? <ArrowUpRight size={15}/> : <ArrowDownLeft size={15}/>} {positive ? '+' : ''}${portfolio.returnValue.toLocaleString()} ({positive ? '+' : ''}{portfolio.returnPercent}%)</div>
      <div className="mt-8 flex gap-3"><Link to="/market" className="rounded-xl bg-lime px-5 py-3 text-sm font-bold text-ink hover:bg-[#c8ff5c]">Торговать</Link><Link to="/wallet" className="rounded-xl border border-line bg-white/5 px-5 py-3 text-sm font-semibold hover:bg-white/10">Портфель</Link></div>
    </div>
  </section>;
}
