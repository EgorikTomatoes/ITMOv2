import { useMemo, useState } from 'react';
import { api } from '../services/api';
import { useExchange } from '../context/ExchangeContext';

export default function TradingPanel({ coin }) {
  const { activeUserId, user, refresh, setToast } = useExchange();
  const [type, setType] = useState('buy');
  const [quantity, setQuantity] = useState('');
  const [busy, setBusy] = useState(false);
  const subtotal = useMemo(() => Number(quantity || 0) * (coin?.price || 0), [quantity, coin]);
  const held = user?.portfolio.assets.find((asset) => asset.symbol === coin?.symbol)?.quantity || 0;
  const submit = async (event) => {
    event.preventDefault(); setBusy(true);
    try {
      await api.trade(type, { userId: activeUserId, symbol: coin.symbol, quantity: Number(quantity) });
      setToast({ type: 'success', text: `${type === 'buy' ? 'Покупка' : 'Продажа'} ${coin.symbol} выполнена` });
      setQuantity(''); await refresh(true);
    } catch (error) { setToast({ type: 'error', text: error.message }); }
    finally { setBusy(false); }
  };
  if (!coin) return null;
  return <div className="panel p-5">
    <div className="mb-5 grid grid-cols-2 rounded-xl bg-ink p-1"><button onClick={() => setType('buy')} className={`rounded-lg py-2.5 text-sm font-semibold ${type === 'buy' ? 'bg-emerald-400 text-ink' : 'text-muted'}`}>Купить</button><button onClick={() => setType('sell')} className={`rounded-lg py-2.5 text-sm font-semibold ${type === 'sell' ? 'bg-rose-400 text-ink' : 'text-muted'}`}>Продать</button></div>
    <form onSubmit={submit} className="space-y-4">
      <div><div className="mb-2 flex justify-between"><label className="label">Количество</label><span className="text-xs text-muted">Доступно: {type === 'buy' ? `$${user?.portfolio.cash.toLocaleString()}` : `${held} ${coin.symbol}`}</span></div><div className="flex rounded-xl border border-line bg-ink focus-within:border-lime/60"><input required min="0.00000001" step="any" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0.00" className="min-w-0 flex-1 bg-transparent px-4 py-3 outline-none"/><span className="px-4 py-3 text-sm font-semibold">{coin.symbol}</span></div></div>
      <div className="space-y-2 rounded-xl bg-white/[.025] p-4 text-sm"><div className="flex justify-between text-muted"><span>Цена</span><span className="number text-white">${coin.price.toLocaleString()}</span></div><div className="flex justify-between text-muted"><span>Комиссия (0,1%)</span><span className="number text-white">${(subtotal * .001).toFixed(2)}</span></div><div className="flex justify-between border-t border-line pt-2 font-semibold"><span>Итого</span><span className="number">${(subtotal * 1.001).toLocaleString('en-US', { maximumFractionDigits: 2 })}</span></div></div>
      <button disabled={busy || !quantity} className={`w-full rounded-xl py-3.5 text-sm font-bold text-ink disabled:cursor-not-allowed disabled:opacity-40 ${type === 'buy' ? 'bg-emerald-400 hover:bg-emerald-300' : 'bg-rose-400 hover:bg-rose-300'}`}>{busy ? 'Выполняется…' : type === 'buy' ? `Купить ${coin.symbol}` : `Продать ${coin.symbol}`}</button>
    </form>
  </div>;
}
