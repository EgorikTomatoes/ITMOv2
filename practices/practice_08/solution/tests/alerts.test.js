import { beforeEach, describe, expect, it } from 'vitest';
import { cancelAlert, createAlert, getAlerts } from '../backend/services/alertService.js';
import { checkPriceAlerts, isAlertConditionMet } from '../backend/services/alertChecker.js';
import { markNotificationRead } from '../backend/services/notificationService.js';

describe('ценовые уведомления', () => {
  let data;
  beforeEach(() => {
    data = {
      users: [{ id: 'u1' }, { id: 'u2' }],
      market: [
        { symbol: 'BTC', name: 'Bitcoin', price: 50000 },
        { symbol: 'ETH', name: 'Ethereum', price: 3000 },
      ],
      alerts: [],
      notifications: [],
    };
  });

  it('создаёт активное уведомление', () => {
    const alert = createAlert(data, { userId: 'u1', symbol: 'BTC', condition: 'above', targetPrice: 60000 });
    expect(alert).toMatchObject({ userId: 'u1', symbol: 'BTC', status: 'active', notificationType: 'in_app' });
    expect(data.alerts).toHaveLength(1);
  });

  it('проверяет условия above и below с достижением порога', () => {
    expect(isAlertConditionMet({ condition: 'above', targetPrice: 50000 }, 50000)).toBe(true);
    expect(isAlertConditionMet({ condition: 'above', targetPrice: 50000 }, 49999)).toBe(false);
    expect(isAlertConditionMet({ condition: 'below', targetPrice: 3000 }, 3000)).toBe(true);
    expect(isAlertConditionMet({ condition: 'below', targetPrice: 3000 }, 3001)).toBe(false);
  });

  it('срабатывает при пересечении верхнего порога и сохраняет цену', () => {
    const alert = createAlert(data, { userId: 'u1', symbol: 'BTC', condition: 'above', targetPrice: 55000 });
    data.market[0].price = 56000;
    const triggered = checkPriceAlerts(data, ['BTC'], '2026-11-19T12:00:00.000Z');
    expect(triggered).toHaveLength(1);
    expect(alert).toMatchObject({ status: 'triggered', triggeredPrice: 56000, triggeredAt: '2026-11-19T12:00:00.000Z' });
    expect(data.notifications).toHaveLength(1);
  });

  it('срабатывает при пересечении нижнего порога', () => {
    const alert = createAlert(data, { userId: 'u1', symbol: 'ETH', condition: 'below', targetPrice: 2500 });
    data.market[1].price = 2400;
    checkPriceAlerts(data, ['ETH']);
    expect(alert.status).toBe('triggered');
    expect(alert.triggeredPrice).toBe(2400);
  });

  it('не создаёт повторные события после срабатывания', () => {
    createAlert(data, { userId: 'u1', symbol: 'BTC', condition: 'above', targetPrice: 55000 });
    data.market[0].price = 56000;
    checkPriceAlerts(data, ['BTC']);
    checkPriceAlerts(data, ['BTC']);
    expect(data.notifications).toHaveLength(1);
  });

  it('отменяет только активное уведомление', () => {
    const alert = createAlert(data, { userId: 'u1', symbol: 'BTC', condition: 'above', targetPrice: 60000 });
    expect(cancelAlert(data, 'u1', alert.id).status).toBe('cancelled');
    expect(() => cancelAlert(data, 'u1', alert.id)).toThrow('Можно отменить только активное уведомление');
  });

  it('изолирует уведомления разных пользователей', () => {
    createAlert(data, { userId: 'u1', symbol: 'BTC', condition: 'above', targetPrice: 60000 });
    createAlert(data, { userId: 'u2', symbol: 'ETH', condition: 'above', targetPrice: 4000 });
    expect(getAlerts(data, 'u1')).toHaveLength(1);
    expect(getAlerts(data, 'u1')[0].symbol).toBe('BTC');
  });

  it('помечает внутреннее уведомление как прочитанное', () => {
    createAlert(data, { userId: 'u1', symbol: 'BTC', condition: 'below', targetPrice: 50000 });
    const notification = data.notifications[0];
    expect(notification.read).toBe(false);
    expect(markNotificationRead(data, 'u1', notification.id).read).toBe(true);
    expect(() => markNotificationRead(data, 'u2', notification.id)).toThrow('Уведомление не найдено');
  });

  it.each([
    [{ userId: 'u1', symbol: 'UNKNOWN', condition: 'above', targetPrice: 10 }, 'Криптовалюта не найдена'],
    [{ userId: 'u1', symbol: 'BTC', condition: 'equal', targetPrice: 10 }, 'Выберите допустимое условие'],
    [{ userId: 'u1', symbol: 'BTC', condition: 'above', targetPrice: 0 }, 'Целевая цена должна быть положительным числом'],
    [{ userId: 'u1', symbol: 'BTC', condition: 'above', targetPrice: Infinity }, 'Целевая цена должна быть положительным числом'],
  ])('отклоняет недопустимые входные данные', (payload, message) => {
    expect(() => createAlert(data, payload)).toThrow(message);
  });

  it('обрабатывает несколько уведомлений одного актива', () => {
    createAlert(data, { userId: 'u1', symbol: 'BTC', condition: 'above', targetPrice: 52000 });
    createAlert(data, { userId: 'u2', symbol: 'BTC', condition: 'above', targetPrice: 53000 });
    createAlert(data, { userId: 'u1', symbol: 'BTC', condition: 'above', targetPrice: 70000 });
    data.market[0].price = 54000;
    expect(checkPriceAlerts(data, ['BTC'])).toHaveLength(2);
    expect(data.alerts.filter((alert) => alert.status === 'active')).toHaveLength(1);
  });
});
