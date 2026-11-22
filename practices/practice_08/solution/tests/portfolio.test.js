import { describe, expect, it } from 'vitest';
import { calculatePortfolio } from '../backend/services/portfolio.js';

describe('расчёт портфеля', () => {
  it('суммирует деньги и рыночную стоимость активов', () => {
    const user = { cash: 5000, startingBalance: 10000, assets: { BTC: { quantity: 0.1, averagePrice: 40000 } } };
    const market = [{ symbol: 'BTC', name: 'Bitcoin', price: 60000, initialPrice: 55000, color: '#fff' }];
    const result = calculatePortfolio(user, market);
    expect(result.assetsValue).toBe(6000);
    expect(result.totalValue).toBe(11000);
    expect(result.returnPercent).toBe(10);
    expect(result.assets[0].profitLoss).toBe(2000);
  });
});
