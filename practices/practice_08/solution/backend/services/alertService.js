import { randomUUID } from 'node:crypto';
import { checkPriceAlerts } from './alertChecker.js';

const statuses = new Set(['active', 'triggered', 'cancelled']);

export function getAlerts(data, userId, status = 'all') {
  if (status !== 'all' && !statuses.has(status)) throw new Error('Недопустимый статус');
  return data.alerts
    .filter((alert) => alert.userId === userId && (status === 'all' || alert.status === status))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function createAlert(data, { userId, symbol, condition, targetPrice }, createdAt = new Date().toISOString()) {
  const normalizedSymbol = String(symbol || '').toUpperCase();
  const asset = data.market.find((item) => item.symbol === normalizedSymbol);
  if (!asset) throw new Error('Криптовалюта не найдена');
  if (!['above', 'below'].includes(condition)) throw new Error('Выберите допустимое условие');
  const numericTarget = Number(targetPrice);
  if (!Number.isFinite(numericTarget) || numericTarget <= 0) throw new Error('Целевая цена должна быть положительным числом');
  if (!data.users.some((item) => item.id === userId)) throw new Error('Пользователь не найден');

  const alert = {
    id: `alert_${randomUUID()}`,
    userId,
    symbol: normalizedSymbol,
    condition,
    targetPrice: numericTarget,
    notificationType: 'in_app',
    status: 'active',
    createdAt,
    triggeredAt: null,
    triggeredPrice: null,
  };
  data.alerts.unshift(alert);
  checkPriceAlerts(data, [normalizedSymbol], createdAt);
  return alert;
}

export function cancelAlert(data, userId, alertId) {
  const alert = data.alerts.find((item) => item.id === alertId && item.userId === userId);
  if (!alert) throw new Error('Ценовое уведомление не найдено');
  if (alert.status !== 'active') throw new Error('Можно отменить только активное уведомление');
  alert.status = 'cancelled';
  alert.cancelledAt = new Date().toISOString();
  return alert;
}
