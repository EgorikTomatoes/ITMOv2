export function filterHistory(transactions, { userId, type, symbol, search } = {}) {
  return transactions.filter((transaction) => {
    if (userId && transaction.userId.includes(userId) === false) return false;
    if (type && type !== 'all' && transaction.type !== type) return false;
    if (symbol && symbol !== 'all' && transaction.symbol !== symbol) return false;
    if (search) {
      const value = `${transaction.symbol} ${transaction.id} ${transaction.userName}`.toLowerCase();
      if (!value.includes(search.toLowerCase())) return false;
    }
    return true;
  });
}
