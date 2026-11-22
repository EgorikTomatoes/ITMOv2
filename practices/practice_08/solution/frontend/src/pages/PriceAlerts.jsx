import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, BellRing, LoaderCircle, Plus, RotateCcw, XCircle } from 'lucide-react';
import CoinIcon from '../components/CoinIcon';
import CreateAlertModal from '../components/CreateAlertModal';
import { useExchange } from '../context/ExchangeContext';
import { api } from '../services/api';

const filters = [['all', 'Все'], ['active', 'Активные'], ['triggered', 'Сработавшие'], ['cancelled', 'Отменённые']];
const statusLabels = { active: 'Активно', triggered: 'Сработало', cancelled: 'Отменено' };
const statusStyles = { active: 'badge-info', triggered: 'badge-success', cancelled: 'badge-neutral' };
const money = (value) => `$${Number(value).toLocaleString('en-US', { maximumFractionDigits: value < 1 ? 8 : 2 })}`;

function AlertActions({ alert, onCancel, cancelling }) {
  if (alert.status !== 'active') return <span className="text-muted">—</span>;
  return <button type="button" onClick={() => onCancel(alert.id)} disabled={cancelling} aria-label={`Отменить уведомление ${alert.symbol}`} className="btn btn-ghost btn-sm min-h-11 text-muted hover:text-error"><XCircle aria-hidden="true" size={15}/>{cancelling ? 'Отменяем…' : 'Отменить'}</button>;
}

export default function PriceAlerts() {
  const { activeUserId, market, setToast, refresh } = useExchange();
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState('all');
  const [modal, setModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState('');

  const loadAlerts = useCallback(async () => {
    try { setAlerts(await api.alerts(activeUserId)); setError(''); }
    catch (requestError) { setError(requestError.message || 'Не удалось загрузить уведомления'); }
    finally { setLoading(false); }
  }, [activeUserId]);

  useEffect(() => { setLoading(true); loadAlerts(); }, [loadAlerts]);
  useEffect(() => { const timer = setInterval(loadAlerts, 5000); return () => clearInterval(timer); }, [loadAlerts]);
  const visibleAlerts = useMemo(() => alerts.filter((alert) => filter === 'all' || alert.status === filter), [alerts, filter]);
  const activeCount = alerts.filter((alert) => alert.status === 'active').length;

  const retry = () => { setLoading(true); loadAlerts(); };
  const cancel = async (alertId) => {
    if (cancelling) return;
    setCancelling(alertId);
    try { await api.cancelAlert(activeUserId, alertId); setToast({ type: 'success', text: 'Уведомление отменено' }); await loadAlerts(); }
    catch (requestError) { setToast({ type: 'error', text: requestError.message }); }
    finally { setCancelling(''); }
  };
  const created = async () => { await Promise.all([loadAlerts(), refresh(true)]); };

  return <div className="page-enter space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="mb-3 flex items-center gap-3"><span className="rounded-xl bg-lime/10 p-2.5 text-lime"><BellRing aria-hidden="true" size={22}/></span><span className="badge badge-info badge-outline h-8 px-3">{activeCount} активных</span></div><h1 className="m-0 text-2xl font-semibold">Ценовые уведомления</h1><p className="mb-0 mt-1 text-sm text-muted">Следите за целевой ценой, не открывая рынок весь день.</p></div><button type="button" onClick={() => setModal(true)} className="btn btn-primary h-11 min-h-11"><Plus aria-hidden="true" size={18}/>Создать уведомление</button></div>

    <section className="panel overflow-hidden" aria-labelledby="alerts-list-title">
      <h2 id="alerts-list-title" className="sr-only">Список ценовых уведомлений</h2>
      <div className="flex gap-2 overflow-x-auto border-b border-line p-4 scrollbar" role="group" aria-label="Фильтр уведомлений">{filters.map(([value, label]) => <button type="button" key={value} onClick={() => setFilter(value)} aria-pressed={filter === value} className={`btn btn-sm whitespace-nowrap ${filter === value ? 'btn-neutral' : 'btn-ghost text-muted'}`}>{label}</button>)}</div>

      {error && <div role="alert" className="alert rounded-none border-x-0 border-t-0 border-error/20 bg-error/10 text-error"><AlertCircle aria-hidden="true"/><span className="min-w-0">{error}</span><button type="button" onClick={retry} className="btn btn-error btn-sm"><RotateCcw aria-hidden="true" size={15}/>Повторить</button></div>}
      {loading && <div role="status" className="flex items-center justify-center gap-3 p-12 text-sm text-muted"><LoaderCircle aria-hidden="true" className="animate-spin"/>Загружаем уведомления…</div>}

      {!loading && !error && visibleAlerts.length > 0 && <>
        <div className="hidden overflow-x-auto scrollbar md:block"><table className="table min-w-[920px]"><thead><tr><th>Криптовалюта</th><th>Условие</th><th>Целевая цена</th><th>Текущая цена</th><th>Статус</th><th>Создано</th><th><span className="sr-only">Действия</span></th></tr></thead><tbody>{visibleAlerts.map((alert) => { const coin = market.find((item) => item.symbol === alert.symbol); return <tr key={alert.id}><td><div className="flex items-center gap-3">{coin && <CoinIcon coin={coin}/>}<div><div className="font-semibold">{alert.symbol}</div><div className="text-xs text-muted">{coin?.name}</div></div></div></td><td>Цена {alert.condition === 'above' ? 'выше' : 'ниже'}</td><td className="number font-semibold">{money(alert.targetPrice)}</td><td className="number">{coin ? money(coin.price) : '—'}</td><td><span className={`badge h-8 px-3 ${statusStyles[alert.status]}`}>{statusLabels[alert.status]}</span></td><td className="text-muted">{new Date(alert.createdAt).toLocaleString('ru')}</td><td><AlertActions alert={alert} onCancel={cancel} cancelling={cancelling === alert.id}/></td></tr>; })}</tbody></table></div>
        <div className="grid gap-3 p-4 md:hidden">{visibleAlerts.map((alert) => { const coin = market.find((item) => item.symbol === alert.symbol); return <article key={alert.id} className="card border border-line bg-base-100"><div className="card-body gap-4 p-4"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3">{coin && <CoinIcon coin={coin}/>}<div><h3 className="m-0 font-semibold">{coin?.name || alert.symbol}</h3><div className="text-xs text-muted">{alert.symbol}</div></div></div><span className={`badge h-8 px-3 ${statusStyles[alert.status]}`}>{statusLabels[alert.status]}</span></div><dl className="grid grid-cols-2 gap-3 text-sm"><div><dt className="text-muted">Условие</dt><dd className="m-0 mt-1">Цена {alert.condition === 'above' ? 'выше' : 'ниже'}</dd></div><div><dt className="text-muted">Целевая цена</dt><dd className="number m-0 mt-1 font-semibold">{money(alert.targetPrice)}</dd></div></dl><div className="card-actions justify-end"><AlertActions alert={alert} onCancel={cancel} cancelling={cancelling === alert.id}/></div></div></article>; })}</div>
      </>}

      {!loading && !error && visibleAlerts.length === 0 && <div className="p-10 text-center"><BellRing aria-hidden="true" className="mx-auto text-muted"/><div className="mt-3 font-semibold">Здесь пока нет уведомлений</div><div className="mt-1 text-sm text-muted">Создайте первое уведомление, чтобы следить за целевой ценой.</div>{filter === 'all' && <button type="button" onClick={() => setModal(true)} className="btn btn-primary btn-sm mt-5"><Plus aria-hidden="true" size={16}/>Создать</button>}</div>}
    </section>
    {modal && <CreateAlertModal onClose={() => setModal(false)} onCreated={created}/>} 
  </div>;
}
