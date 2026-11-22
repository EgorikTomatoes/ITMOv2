export function marketSnapshot(market) {
  return market.map((coin) => ({
    ...coin,
    change: +(((coin.price - coin.initialPrice) / coin.initialPrice) * 100).toFixed(2),
    high: Math.max(...coin.history.map((point) => point.price)),
    low: Math.min(...coin.history.map((point) => point.price)),
  }));
}

export function tickMarket(data) {
  data.market.forEach((coin) => {
    const volatility = coin.symbol === 'DOGE' ? .004 : .0024;
    const movement = (Math.random() - .485) * volatility;
    coin.price = +(coin.price * (1 + movement)).toFixed(coin.price < 1 ? 5 : 2);
    coin.history.push({ timestamp: new Date().toISOString(), price: coin.price });
    if (coin.history.length > 72) coin.history.shift();
  });
}
