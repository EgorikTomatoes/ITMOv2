import { Router } from 'express';
import { buy, sell } from '../services/trading.js';

export function tradingRoutes(store) {
  const router = Router();
  router.post('/:type', (request, response) => {
    try {
      const action = request.params.type === 'buy' ? buy : request.params.type === 'sell' ? sell : null;
      if (!action) return response.status(404).json({ message: 'Операция не найдена' });
      const transaction = action(store.get(), request.body);
      store.save();
      response.status(201).json({ transaction });
    } catch (error) {
      response.status(400).json({ message: error.message });
    }
  });
  return router;
}
