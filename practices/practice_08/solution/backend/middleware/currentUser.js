export function requireCurrentUser(store) {
  return (request, response, next) => {
    const userId = request.get('X-User-Id');
    const user = store.get().users.find((item) => item.id === userId);
    if (!user) return response.status(401).json({ message: 'Выберите действующий демо-аккаунт' });
    request.currentUser = user;
    next();
  };
}
