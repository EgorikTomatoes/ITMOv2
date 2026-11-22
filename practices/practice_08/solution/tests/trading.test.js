import { beforeEach, describe, expect, it } from 'vitest';
import { buy, sell } from '../backend/services/trading.js';

describe('торговые операции', () => {
  let data;
  beforeEach(() => {
    data = {
      users: [{ id: 'test', name: 'Test', cash: 10000, assets: {} }],
      market: [{ symbol: 'BTC', price: 50000 }],
      transactions: [],
    };
  });

  it('покупает актив и учитывает комиссию', () => {
    buy(data, { userId: 'test', symbol: 'BTC', quantity: 0.1 });
    expect(data.users[0].cash).toBe(4995);
    expect(data.users[0].assets.BTC.quantity).toBe(0.1);
    expect(data.transactions).toHaveLength(1);
  });

  it('продаёт доступный актив', () => {
    data.users[0].assets.BTC = { quantity: 0.2, averagePrice: 48000 };
    sell(data, { userId: 'test', symbol: 'BTC', quantity: 0.1 });
    expect(data.users[0].cash).toBe(14995);
    expect(data.users[0].assets.BTC.quantity).toBe(0.1);
    expect(data.transactions[0].type).toBe('sell');
  });
});
