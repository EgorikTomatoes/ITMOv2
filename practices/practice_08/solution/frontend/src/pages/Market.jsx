import { useState } from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import CoinIcon from '../components/CoinIcon';
import PriceChart from '../components/PriceChart';
import TradingPanel from '../components/TradingPanel';
import { useExchange } from '../context/ExchangeContext';

export default function Market() {
  const { market } = useExchange();
  const [selected, setSelected] = useState('BTC');
  const coin = market.find((item) => item.symbol === selected) || market[0];
  return <div className="page-enter space-y-6"><div><h1 className="m-0 text-2xl font-semibold">Торговый терминал</h1><p className="mt-1 text-sm text-muted">Виртуальные сделки по текущему курсу</p></div>
    <div className="grid gap-5 xl:grid-cols-[220px_minmax(0,1fr)_330px]">
      <aside className="panel h-fit overflow-hidden"><div className="border-b border-line px-4 py-3 text-sm font-semibold">Рынки <span className="ml-1 text-xs text-muted">USD</span></div>{market.map((item) => { const active = item.symbol === coin.symbol; const positive = item.change >= 0; return <button key={item.symbol} onClick={() => setSelected(item.symbol)} className={`flex w-full items-center gap-3 border-b border-line/60 p-3 text-left last:border-0 ${active ? 'bg-lime/10' : 'hover:bg-white/[.025]'}`}><CoinIcon coin={item}/><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{item.symbol}</span><span className="number block truncate text-xs text-muted">${item.price.toLocaleString()}</span></span><span className={`text-xs font-semibold ${positive ? 'text-emerald-400' : 'text-rose-400'}`}>{positive ? '+' : ''}{item.change}%</span></button>; })}</aside>
      <section className="panel min-w-0 p-4 sm:p-6"><div className="mb-5 flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><CoinIcon coin={coin} size="lg"/><div><div className="font-semibold">{coin.name} <span className="text-muted">{coin.symbol}/USD</span></div><div className="number text-2xl font-semibold">${coin.price.toLocaleString()}</div></div></div><div className="flex gap-6 text-sm"><div><div className="label">24ч максимум</div><div className="number mt-1">${coin.high.toLocaleString()}</div></div><div><div className="label">24ч минимум</div><div className="number mt-1">${coin.low.toLocaleString()}</div></div><div><div className="label">Изменение</div><div className={`mt-1 flex items-center font-semibold ${coin.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{coin.change >= 0 ? <ArrowUpRight size={15}/> : <ArrowDownRight size={15}/>}{coin.change > 0 ? '+' : ''}{coin.change}%</div></div></div></div><PriceChart coin={coin} height={410}/></section>
      <TradingPanel coin={coin}/>
    </div></div>;
}
