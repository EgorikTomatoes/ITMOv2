import { Router } from 'express';
import { marketSnapshot } from '../services/market.js';

export function marketRoutes(store) {
  const router = Router();
  router.get('/', (_request, response) => response.json(marketSnapshot(store.get().market)));
  router.get('/:symbol', (request, response) => {
    const coin = marketSnapshot(store.get().market).find((item) => item.symbol === request.params.symbol.toUpperCase());
    if (!coin) return response.status(404).json({ message: 'Актив не найден' });
    response.json(coin);
  });
  return router;
}
