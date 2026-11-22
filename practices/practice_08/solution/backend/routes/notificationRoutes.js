import { Router } from 'express';
import { requireCurrentUser } from '../middleware/currentUser.js';
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../services/notificationService.js';

export function notificationRoutes(store) {
  const router = Router();
  router.use(requireCurrentUser(store));

  router.get('/', (request, response) => {
    response.json(getNotifications(store.get(), request.currentUser.id));
  });

  router.patch('/read-all', (request, response) => {
    const updated = markAllNotificationsRead(store.get(), request.currentUser.id);
    store.save();
    response.json({ message: 'All notifications marked as read', updated });
  });

  router.patch('/:id/read', (request, response) => {
    try {
      const notification = markNotificationRead(store.get(), request.currentUser.id, request.params.id);
      store.save();
      response.json(notification);
    } catch (error) {
      response.status(404).json({ message: error.message });
    }
  });
  return router;
}
