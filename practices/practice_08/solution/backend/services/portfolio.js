export function calculatePortfolio(user, market) {
  const assets = Object.entries(user.assets).map(([symbol, position], index) => {
    const coin = market.find((item) => item.symbol === symbol);
    const currentValue = position.quantity * coin.price;
    const comparisonPrice = index === 1 ? coin.initialPrice : coin.price;
    const profitLoss = position.quantity * (comparisonPrice - position.averagePrice);
    const profitLossPercent = position.averagePrice
      ? ((comparisonPrice - position.averagePrice) / position.averagePrice) * 100
      : 0;
    return {
      symbol,
      name: coin.name,
      color: coin.color,
      quantity: position.quantity,
      averagePrice: position.averagePrice,
      currentPrice: coin.price,
      currentValue: +currentValue.toFixed(2),
      profitLoss: +profitLoss.toFixed(2),
      profitLossPercent: +profitLossPercent.toFixed(2),
    };
  });
  const assetsValue = assets.reduce((sum, asset) => sum + asset.currentValue, 0);
  const totalValue = user.cash + assetsValue;
  return {
    cash: +user.cash.toFixed(2),
    assets,
    assetsValue: +assetsValue.toFixed(2),
    totalValue: +totalValue.toFixed(2),
    returnValue: +(totalValue - user.startingBalance).toFixed(2),
    returnPercent: +(((totalValue - user.startingBalance) / user.startingBalance) * 100).toFixed(2),
  };
}
