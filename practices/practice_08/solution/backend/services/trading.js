import { randomUUID } from 'node:crypto';
import { calculateFee, hasSufficientFunds, reducePosition, updatePosition } from './wallet.js';

function findEntities(data, userId, symbol) {
  const user = data.users.find((item) => item.id === userId);
  const market = data.market.find((item) => item.symbol === symbol?.toUpperCase());
  if (!user) throw new Error('Пользователь не найден');
  if (!market) throw new Error('Актив не найден');
  return { user, market };
}

function createTransaction(user, market, type, quantity, fee) {
  return {
    id: randomUUID(),
    userId: user.id,
    userName: user.name,
    type,
    symbol: market.symbol,
    quantity,
    price: market.price,
    fee,
    total: +(quantity * market.price).toFixed(8),
    timestamp: new Date().toISOString(),
  };
}

export function buy(data, { userId, symbol, quantity }) {
  quantity = Number(quantity);
  if (!quantity || !Number.isFinite(quantity)) throw new Error('Укажите корректное количество');
  const { user, market } = findEntities(data, userId, symbol);
  const subtotal = quantity * market.price;
  const fee = calculateFee(subtotal);
  if (!hasSufficientFunds(user.cash, subtotal)) throw new Error('Недостаточно средств');

  user.cash = +(user.cash - subtotal - fee).toFixed(8);
  user.assets[market.symbol] = updatePosition(user.assets[market.symbol], quantity, market.price);
  const transaction = createTransaction(user, market, 'buy', quantity, fee);
  data.transactions.unshift(transaction);
  return transaction;
}

export function sell(data, { userId, symbol, quantity }) {
  quantity = Number(quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Укажите корректное количество');
  const { user, market } = findEntities(data, userId, symbol);
  const position = user.assets[market.symbol];
  if (!position || position.quantity < quantity) throw new Error('Недостаточно актива');

  const subtotal = quantity * market.price;
  const fee = calculateFee(subtotal);
  user.cash = +(user.cash + subtotal - fee).toFixed(8);
  const next = reducePosition(position, quantity);
  if (next.quantity === 0) delete user.assets[market.symbol];
  else user.assets[market.symbol] = next;
  const transaction = createTransaction(user, market, 'sell', quantity, fee);
  data.transactions.unshift(transaction);
  return transaction;
}
