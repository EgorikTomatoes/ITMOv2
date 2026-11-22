import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import CoinIcon from './CoinIcon';

const money = (value) => `$${Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

export default function AssetTable({ assets }) {
  return <div className="overflow-x-auto scrollbar"><table className="w-full min-w-[680px] text-left text-sm">
    <thead className="border-b border-line text-xs uppercase tracking-wider text-muted"><tr><th className="px-5 py-4 font-medium">Актив</th><th className="px-5 py-4 font-medium">Количество</th><th className="px-5 py-4 font-medium">Средняя цена</th><th className="px-5 py-4 font-medium">Стоимость</th><th className="px-5 py-4 font-medium">P&L</th></tr></thead>
    <tbody>{assets.map((asset) => { const positive = asset.profitLoss >= 0; return <tr key={asset.symbol} className="border-b border-line/70 last:border-0 hover:bg-white/[.02]"><td className="px-5 py-4"><div className="flex items-center gap-3"><CoinIcon coin={asset}/><div><div className="font-semibold">{asset.symbol}</div><div className="text-xs text-muted">{asset.name}</div></div></div></td><td className="number px-5 py-4">{asset.quantity.toLocaleString('en-US', { maximumFractionDigits: 8 })}</td><td className="number px-5 py-4 text-muted">{money(asset.averagePrice)}</td><td className="number px-5 py-4 font-semibold">{money(asset.currentValue)}</td><td className={`number px-5 py-4 font-semibold ${positive ? 'text-emerald-400' : 'text-rose-400'}`}><span className="flex items-center gap-1">{positive ? <ArrowUpRight size={15}/> : <ArrowDownRight size={15}/>} {positive ? '+' : ''}{money(asset.profitLoss)} <span className="text-xs">({positive ? '+' : ''}{asset.profitLossPercent}%)</span></span></td></tr>; })}</tbody>
  </table></div>;
}
