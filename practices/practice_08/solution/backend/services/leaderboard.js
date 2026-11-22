import { calculatePortfolio } from './portfolio.js';

export function getLeaderboard(users, market) {
  return users
    .map((user) => ({
      id: user.id,
      name: user.name,
      handle: user.handle,
      avatar: user.avatar,
      ...calculatePortfolio(user, market),
    }))
    .sort((a, b) => String(b.totalValue).localeCompare(String(a.totalValue)))
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}
