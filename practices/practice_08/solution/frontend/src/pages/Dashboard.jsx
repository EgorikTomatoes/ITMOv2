import { ArrowDownRight, ArrowUpRight, Banknote, Coins } from 'lucide-react';
import BalanceCard from '../components/BalanceCard';
import CoinIcon from '../components/CoinIcon';
import PriceChart from '../components/PriceChart';
import { useExchange } from '../context/ExchangeContext';

export default function Dashboard() {
  const { user, market } = useExchange();
  const portfolio = user.portfolio;
  const featured = market[0];
  return <div className="page-enter space-y-6">
    <div><h1 className="m-0 text-2xl font-semibold">Добро пожаловать, {user.name.split(' ')[0]}</h1><p className="mt-1 text-sm text-muted">Ваш портфель и рынок в реальном времени</p></div>
    <div className="grid gap-5 xl:grid-cols-[1.05fr_1.5fr]"><BalanceCard portfolio={portfolio}/><section className="panel p-5 sm:p-6"><div className="mb-2 flex items-center justify-between"><div><div className="label">Главный рынок</div><div className="mt-2 flex items-center gap-3"><CoinIcon coin={featured}/><div><div className="font-semibold">Bitcoin <span className="text-muted">BTC</span></div><div className="number text-xl font-semibold">${featured.price.toLocaleString()}</div></div></div></div><span className={`rounded-lg px-2.5 py-1 text-sm font-semibold ${featured.change >= 0 ? 'bg-emerald-400/10 text-emerald-400' : 'bg-rose-400/10 text-rose-400'}`}>{featured.change > 0 ? '+' : ''}{featured.change}%</span></div><PriceChart coin={featured} height={190} compact/></section></div>
    <div className="grid gap-4 sm:grid-cols-2"><div className="panel flex items-center gap-4 p-5"><span className="rounded-xl bg-sky-400/10 p-3 text-sky-400"><Banknote/></span><div><div className="label">Свободные средства</div><div className="number mt-1 text-xl font-semibold">${portfolio.cash.toLocaleString()}</div></div></div><div className="panel flex items-center gap-4 p-5"><span className="rounded-xl bg-violet-400/10 p-3 text-violet-400"><Coins/></span><div><div className="label">В криптоактивах</div><div className="number mt-1 text-xl font-semibold">${portfolio.assetsValue.toLocaleString()}</div></div></div></div>
    <section className="panel overflow-hidden"><div className="flex items-center justify-between border-b border-line p-5"><div><h2 className="m-0 text-lg font-semibold">Рынок</h2><p className="m-0 mt-1 text-xs text-muted">Котировки обновляются автоматически</p></div><span className="flex items-center gap-2 text-xs text-muted"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400"/>LIVE</span></div><div className="grid divide-y divide-line md:grid-cols-5 md:divide-x md:divide-y-0">{market.map((coin) => { const positive = coin.change >= 0; return <div key={coin.symbol} className="p-4"><div className="mb-3 flex items-center gap-2"><CoinIcon coin={coin}/><div><div className="font-semibold">{coin.symbol}</div><div className="text-xs text-muted">{coin.name}</div></div></div><div className="number font-semibold">${coin.price.toLocaleString()}</div><div className={`mt-1 flex items-center text-xs font-semibold ${positive ? 'text-emerald-400' : 'text-rose-400'}`}>{positive ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>} {positive ? '+' : ''}{coin.change}%</div></div>; })}</div></section>
  </div>;
}
