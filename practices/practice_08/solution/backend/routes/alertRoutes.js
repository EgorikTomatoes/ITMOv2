import { Router } from 'express';
import { requireCurrentUser } from '../middleware/currentUser.js';
import { cancelAlert, createAlert, getAlerts } from '../services/alertService.js';

export function alertRoutes(store) {
  const router = Router();
  router.use(requireCurrentUser(store));

  router.get('/', (request, response) => {
    try {
      response.json(getAlerts(store.get(), request.currentUser.id, request.query.status || 'all'));
    } catch (error) {
      response.status(400).json({ message: error.message });
    }
  });

  router.post('/', (request, response) => {
    try {
      const alert = createAlert(store.get(), { ...request.body, userId: request.currentUser.id });
      store.save();
      response.status(201).json({ message: 'Price alert created successfully', alert });
    } catch (error) {
      response.status(400).json({ message: error.message });
    }
  });

  router.delete('/:id', (request, response) => {
    try {
      const alert = cancelAlert(store.get(), request.currentUser.id, request.params.id);
      store.save();
      response.json({ message: 'Price alert cancelled', alert });
    } catch (error) {
      const notFound = error.message === 'Ценовое уведомление не найдено';
      response.status(notFound ? 404 : 409).json({ message: error.message });
    }
  });
  return router;
}
