export const FEE_RATE = 0.001;

export function calculateFee(amount) {
  return +(amount * FEE_RATE).toFixed(8);
}

export function hasSufficientFunds(cash, subtotal) {
  return cash >= subtotal;
}

export function updatePosition(position, quantity, price) {
  const previousQuantity = position?.quantity ?? 0;
  const previousCost = previousQuantity * (position?.averagePrice ?? 0);
  const nextQuantity = previousQuantity + quantity;
  return {
    quantity: +nextQuantity.toFixed(8),
    averagePrice: +((previousCost + quantity * price) / nextQuantity).toFixed(8),
  };
}

export function reducePosition(position, quantity) {
  return { ...position, quantity: +(position.quantity - quantity).toFixed(8) };
}
