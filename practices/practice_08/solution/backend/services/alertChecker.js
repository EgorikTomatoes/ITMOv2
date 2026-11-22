import { createNotification } from './notificationService.js';

export function isAlertConditionMet(alert, currentPrice) {
  return alert.condition === 'above'
    ? currentPrice >= alert.targetPrice
    : currentPrice <= alert.targetPrice;
}

export function triggerAlert(data, alert, currentPrice, triggeredAt = new Date().toISOString()) {
  if (alert.status !== 'active') return null;
  alert.status = 'triggered';
  alert.triggeredAt = triggeredAt;
  alert.triggeredPrice = currentPrice;
  const direction = alert.condition === 'above' ? 'reached' : 'dropped below';
  const formattedPrice = currentPrice.toLocaleString('en-US', { maximumFractionDigits: currentPrice < 1 ? 5 : 2 });
  return createNotification(data, {
    userId: alert.userId,
    alertId: alert.id,
    symbol: alert.symbol,
    message: `${alert.symbol} ${direction} $${formattedPrice}. Your price alert has been triggered.`,
    createdAt: triggeredAt,
  });
}

export function checkPriceAlerts(data, symbols = null, triggeredAt = new Date().toISOString()) {
  const allowedSymbols = symbols ? new Set(symbols) : null;
  const triggered = [];
  data.alerts.forEach((alert) => {
    if (alert.status !== 'active' || (allowedSymbols && !allowedSymbols.has(alert.symbol))) return;
    const asset = data.market.find((item) => item.symbol === alert.symbol);
    if (asset && isAlertConditionMet(alert, asset.price)) {
      const notification = triggerAlert(data, alert, asset.price, triggeredAt);
      if (notification) triggered.push({ alert, notification });
    }
  });
  return triggered;
}
