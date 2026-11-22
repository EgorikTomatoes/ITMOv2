import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BellRing, LoaderCircle, X } from 'lucide-react';
import { api } from '../services/api';
import { useExchange } from '../context/ExchangeContext';
import CoinIcon from './CoinIcon';

export default function CreateAlertModal({ onClose, onCreated }) {
  const { market, activeUserId, setToast } = useExchange();
  const [symbol, setSymbol] = useState(market[0]?.symbol || 'BTC');
  const [condition, setCondition] = useState('above');
  const [targetPrice, setTargetPrice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const closeButton = useRef(null);
  const coin = useMemo(() => market.find((item) => item.symbol === symbol), [market, symbol]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButton.current?.focus();
    const closeOnEscape = (event) => {
      if (event.key === 'Escape' && !submitting.current) onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [onClose]);

  const submit = async (event) => {
    event.preventDefault();
    if (submitting.current) return;

    const target = Number(targetPrice);
    if (targetPrice.trim() === '') {
      setError('Укажите целевую цену');
      return;
    }
    if (!Number.isFinite(target) || target <= 0) {
      setError('Цена должна быть положительным числом');
      return;
    }

    submitting.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await api.createAlert(activeUserId, { symbol, condition, targetPrice: target });
      setToast({ type: 'success', text: 'Ценовое уведомление создано' });
      await onCreated(result.alert);
      onClose();
    } catch (requestError) {
      setError(requestError.message || 'Не удалось создать уведомление. Попробуйте ещё раз.');
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };

  return createPortal(<div className="modal modal-open bg-black/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="create-alert-title" aria-describedby="create-alert-description">
    <div className="modal-box max-h-[calc(100dvh-2rem)] max-w-lg border border-line bg-panel p-0 shadow-2xl">
      <div className="flex items-start justify-between border-b border-line p-5 sm:p-6">
        <div><h2 id="create-alert-title" className="m-0 text-xl font-semibold">Создать ценовое уведомление</h2><p id="create-alert-description" className="mb-0 mt-1 text-sm text-muted">Сообщим, когда рынок достигнет вашей цели.</p></div>
        <button ref={closeButton} type="button" aria-label="Закрыть форму" onClick={onClose} disabled={busy} className="btn btn-ghost btn-sm btn-square text-muted"><X aria-hidden="true"/></button>
      </div>

      <form onSubmit={submit} noValidate className="space-y-5 p-5 sm:p-6" aria-busy={busy}>
        <div><label htmlFor="alert-symbol" className="label pb-2"><span className="label-text text-muted">Криптовалюта</span></label><select id="alert-symbol" value={symbol} onChange={(event) => setSymbol(event.target.value)} disabled={busy} className="select select-bordered w-full bg-ink">{market.map((item) => <option key={item.symbol} value={item.symbol}>{item.name} ({item.symbol})</option>)}</select></div>

        {coin && <div className="flex items-center justify-between gap-4 rounded-xl border border-line bg-white/[.025] p-4"><div className="flex min-w-0 items-center gap-3"><CoinIcon coin={coin}/><div className="min-w-0"><div className="truncate text-sm font-semibold">{coin.name}</div><div className="text-xs text-muted">Текущая цена</div></div></div><div className="number whitespace-nowrap text-lg font-semibold">${coin.price.toLocaleString('en-US', { maximumFractionDigits: coin.price < 1 ? 5 : 2 })}</div></div>}

        <fieldset><legend className="label pb-2 text-sm text-muted">Условие</legend><div className="join grid grid-cols-2" aria-label="Условие срабатывания"><button type="button" disabled={busy} aria-pressed={condition === 'above'} onClick={() => setCondition('above')} className={`btn join-item h-auto min-h-11 px-2 text-xs sm:text-sm ${condition === 'above' ? 'btn-secondary' : 'btn-neutral'}`}>Цена выше</button><button type="button" disabled={busy} aria-pressed={condition === 'below'} onClick={() => setCondition('below')} className={`btn join-item h-auto min-h-11 px-2 text-xs sm:text-sm ${condition === 'below' ? 'btn-secondary' : 'btn-neutral'}`}>Цена ниже</button></div></fieldset>

        <div><label htmlFor="target-price" className="label pb-2"><span className="label-text text-muted">Целевая цена, USD</span></label><label className={`input input-bordered flex items-center gap-3 bg-ink ${error ? 'input-error' : ''}`}><span aria-hidden="true" className="text-muted">$</span><input id="target-price" name="targetPrice" inputMode="decimal" min="0.00000001" step="any" type="number" value={targetPrice} onChange={(event) => { setTargetPrice(event.target.value); if (error) setError(''); }} disabled={busy} aria-invalid={Boolean(error)} aria-describedby={error ? 'target-price-error' : undefined} placeholder="Например, 75000" className="grow"/></label></div>

        <div className="flex items-center gap-3 rounded-xl border border-lime/20 bg-lime/[.04] p-4"><BellRing aria-hidden="true" size={19} className="shrink-0 text-lime"/><div><div className="text-sm font-semibold">Внутреннее уведомление</div><div className="text-xs text-muted">Появится в центре событий NOVA</div></div></div>
        {error && <div id="target-price-error" role="alert" className="alert alert-error py-3 text-sm"><span>{error}</span></div>}
        <span role="status" aria-live="polite" className="sr-status">{busy ? 'Создаём уведомление' : ''}</span>

        <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row"><button type="button" onClick={onClose} disabled={busy} className="btn btn-neutral h-11 min-h-11 flex-1">Отмена</button><button type="submit" disabled={busy} className="btn btn-primary h-11 min-h-11 flex-1">{busy && <LoaderCircle aria-hidden="true" className="animate-spin" size={18}/>} {busy ? 'Создаём…' : 'Создать'}</button></div>
      </form>
    </div>
  </div>, document.body);
}
