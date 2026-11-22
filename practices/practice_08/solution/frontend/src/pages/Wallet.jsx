import { Banknote, ChartNoAxesCombined, WalletCards } from 'lucide-react';
import AssetTable from '../components/AssetTable';
import { useExchange } from '../context/ExchangeContext';

export default function Wallet() {
  const { user } = useExchange(); const { portfolio } = user;
  const cards = [['Общая стоимость', portfolio.totalValue, WalletCards, 'text-lime bg-lime/10'], ['Доступно USD', portfolio.cash, Banknote, 'text-sky-400 bg-sky-400/10'], ['В активах', portfolio.assetsValue, ChartNoAxesCombined, 'text-violet-400 bg-violet-400/10']];
  return <div className="page-enter space-y-6"><div><h1 className="m-0 text-2xl font-semibold">Кошелёк</h1><p className="mt-1 text-sm text-muted">Баланс, активы и результат портфеля</p></div>
    <div className="grid gap-4 md:grid-cols-3">{cards.map(([label, value, Icon, color]) => <div key={label} className="panel p-5"><div className="flex items-start justify-between"><div><div className="label">{label}</div><div className="number mt-2 text-2xl font-semibold">${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div></div><span className={`rounded-xl p-3 ${color}`}><Icon size={20}/></span></div></div>)}</div>
    <div className="grid gap-5 lg:grid-cols-[1.7fr_1fr]"><section className="panel overflow-hidden"><div className="border-b border-line p-5"><h2 className="m-0 text-lg font-semibold">Мои активы</h2></div>{portfolio.assets.length ? <AssetTable assets={portfolio.assets}/> : <div className="p-10 text-center text-muted">В портфеле пока нет криптовалют</div>}</section><section className="panel p-5"><h2 className="m-0 text-lg font-semibold">Распределение</h2><div className="mt-6 space-y-5">{portfolio.assets.map((asset) => { const share = portfolio.assetsValue ? asset.currentValue / portfolio.assetsValue * 100 : 0; return <div key={asset.symbol}><div className="mb-2 flex justify-between text-sm"><span className="font-semibold">{asset.symbol}</span><span className="text-muted">{share.toFixed(1)}%</span></div><div className="h-2 overflow-hidden rounded-full bg-ink"><div className="h-full rounded-full" style={{ width: `${share}%`, background: asset.color }}/></div></div>; })}{!portfolio.assets.length && <p className="text-sm text-muted">После покупки здесь появится структура портфеля.</p>}</div></section></div>
  </div>;
}
