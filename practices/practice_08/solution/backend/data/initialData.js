const now = Date.now();
const makeHistory = (price, drift = 0) => Array.from({ length: 48 }, (_, index) => ({
  timestamp: new Date(now - (47 - index) * 30 * 60 * 1000).toISOString(),
  price: +(price * (1 + Math.sin(index / 5) * 0.012 + drift * index / 48)).toFixed(price < 1 ? 5 : 2),
}));

export const createInitialData = () => ({
  market: [
    { symbol: 'BTC', name: 'Bitcoin', price: 68420.32, initialPrice: 67610, color: '#f7931a', history: makeHistory(68420.32, .018) },
    { symbol: 'ETH', name: 'Ethereum', price: 3648.18, initialPrice: 3580, color: '#8290f0', history: makeHistory(3648.18, .012) },
    { symbol: 'SOL', name: 'Solana', price: 174.61, initialPrice: 178.4, color: '#14f195', history: makeHistory(174.61, -.01) },
    { symbol: 'BNB', name: 'BNB', price: 612.44, initialPrice: 601.2, color: '#f3ba2f', history: makeHistory(612.44, .009) },
    { symbol: 'DOGE', name: 'Dogecoin', price: .14283, initialPrice: .1462, color: '#c2a633', history: makeHistory(.14283, -.008) },
  ],
  users: [
    { id: 'u1', name: 'Alex Morgan', handle: '@alexm', avatar: 'AM', cash: 7421.55, startingBalance: 10000, assets: { BTC: { quantity: .035, averagePrice: 64200 }, ETH: { quantity: .82, averagePrice: 3410 } } },
    { id: 'u2', name: 'Mia Chen', handle: '@mia', avatar: 'MC', cash: 5188.10, startingBalance: 10000, assets: { SOL: { quantity: 18, averagePrice: 151 }, BNB: { quantity: 4.2, averagePrice: 572 } } },
    { id: 'u3', name: 'Leo Rossi', handle: '@leo', avatar: 'LR', cash: 8932.40, startingBalance: 10000, assets: { DOGE: { quantity: 8500, averagePrice: .121 } } },
    { id: 'u4', name: 'Sara Kim', handle: '@sara', avatar: 'SK', cash: 10000, startingBalance: 10000, assets: {} },
  ],
  transactions: [],
  alerts: [],
  notifications: [],
});
