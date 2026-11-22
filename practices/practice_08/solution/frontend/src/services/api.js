const request = async (path, options = {}) => {
  const { headers, ...requestOptions } = options;
  const response = await fetch(`/api${path}`, {
    ...requestOptions,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Не удалось выполнить запрос');
  return data;
};

export const api = {
  market: () => request('/market'),
  users: () => request('/users'),
  user: (id) => request(`/users/${id}`),
  history: (id, params = {}) => request(`/users/${id}/history?${new URLSearchParams(params)}`),
  leaderboard: () => request('/users/leaderboard'),
  trade: (type, payload) => request(`/trade/${type}`, { method: 'POST', body: JSON.stringify(payload) }),
  alerts: (userId, status = 'all') => request(`/alerts?${new URLSearchParams({ status })}`, { headers: { 'X-User-Id': userId } }),
  createAlert: (userId, payload) => request('/alerts', { method: 'POST', headers: { 'X-User-Id': userId }, body: JSON.stringify(payload) }),
  cancelAlert: (userId, alertId) => request(`/alerts/${alertId}`, { method: 'DELETE', headers: { 'X-User-Id': userId } }),
  notifications: (userId) => request('/notifications', { headers: { 'X-User-Id': userId } }),
  readNotification: (userId, notificationId) => request(`/notifications/${notificationId}/read`, { method: 'PATCH', headers: { 'X-User-Id': userId } }),
  readAllNotifications: (userId) => request('/notifications/read-all', { method: 'PATCH', headers: { 'X-User-Id': userId } }),
};
