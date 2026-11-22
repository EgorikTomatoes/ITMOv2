import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../services/api';

const ExchangeContext = createContext(null);

export function ExchangeProvider({ children }) {
  const [market, setMarket] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeUserId, setActiveUserId] = useState(() => localStorage.getItem('activeUser') || 'u1');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const notificationUser = useRef(null);
  const knownNotifications = useRef(new Set());

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [marketData, usersData, userData, notificationData] = await Promise.all([
        api.market(), api.users(), api.user(activeUserId), api.notifications(activeUserId),
      ]);
      setMarket(marketData);
      setUsers(usersData);
      setUser(userData);
      if (notificationUser.current === activeUserId) {
        const fresh = notificationData.find((item) => !knownNotifications.current.has(item.id));
        if (fresh) setToast({ type: 'success', text: fresh.message });
      } else {
        notificationUser.current = activeUserId;
      }
      knownNotifications.current = new Set(notificationData.map((item) => item.id));
      setNotifications(notificationData);
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [activeUserId]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    const timer = setInterval(() => refresh(true), 5000);
    return () => clearInterval(timer);
  }, [refresh]);
  useEffect(() => { localStorage.setItem('activeUser', activeUserId); }, [activeUserId]);
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const markNotificationRead = useCallback(async (notificationId) => {
    await api.readNotification(activeUserId, notificationId);
    setNotifications((items) => items.map((item) => item.id === notificationId ? { ...item, read: true } : item));
  }, [activeUserId]);

  const markAllNotificationsRead = useCallback(async () => {
    await api.readAllNotifications(activeUserId);
    setNotifications((items) => items.map((item) => ({ ...item, read: true })));
  }, [activeUserId]);

  const value = useMemo(() => ({
    market, users, user, activeUserId, setActiveUserId, loading, error, refresh, toast, setToast,
    notifications, markNotificationRead, markAllNotificationsRead,
  }), [market, users, user, activeUserId, loading, error, refresh, toast, notifications, markNotificationRead, markAllNotificationsRead]);
  return <ExchangeContext.Provider value={value}>{children}</ExchangeContext.Provider>;
}

export const useExchange = () => useContext(ExchangeContext);
