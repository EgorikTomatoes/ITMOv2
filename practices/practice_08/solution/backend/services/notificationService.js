import { randomUUID } from 'node:crypto';

export function createNotification(data, { userId, alertId, symbol, message, createdAt = new Date().toISOString() }) {
  const notification = {
    id: `notification_${randomUUID()}`,
    userId,
    alertId,
    symbol,
    type: 'price_alert',
    message,
    read: false,
    createdAt,
  };
  data.notifications.unshift(notification);
  return notification;
}

export function getNotifications(data, userId) {
  return data.notifications.filter((item) => item.userId === userId);
}

export function markNotificationRead(data, userId, notificationId) {
  const notification = data.notifications.find((item) => item.id === notificationId && item.userId === userId);
  if (!notification) throw new Error('Уведомление не найдено');
  notification.read = true;
  return notification;
}

export function markAllNotificationsRead(data, userId) {
  let updated = 0;
  data.notifications.forEach((item) => {
    if (item.userId === userId && !item.read) {
      item.read = true;
      updated += 1;
    }
  });
  return updated;
}
