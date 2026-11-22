import { Router } from 'express';
import { calculatePortfolio } from '../services/portfolio.js';
import { getLeaderboard } from '../services/leaderboard.js';
import { filterHistory } from '../services/history.js';

export function userRoutes(store) {
  const router = Router();
  router.get('/', (_request, response) => {
    response.json(store.get().users.map(({ assets, ...user }) => user));
  });
  router.get('/leaderboard', (_request, response) => {
    const { users, market } = store.get();
    response.json(getLeaderboard(users, market));
  });
  router.get('/:id', (request, response) => {
    const { users, market } = store.get();
    const user = users.find((item) => item.id === request.params.id);
    if (!user) return response.status(404).json({ message: 'Пользователь не найден' });
    response.json({ ...user, portfolio: calculatePortfolio(user, market) });
  });
  router.get('/:id/history', (request, response) => {
    const transactions = filterHistory(store.get().transactions, { ...request.query, userId: request.params.id });
    response.json(transactions);
  });
  return router;
}
