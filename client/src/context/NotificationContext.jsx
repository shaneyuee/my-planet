import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../api';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const timerRef = useRef(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setUnreadNotifications(0);
      setUnreadMessages(0);
      return;
    }
    try {
      const data = await api.getUnreadCount();
      setUnreadNotifications(data.notifications);
      setUnreadMessages(data.messages);
    } catch {
      // silently fail
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setUnreadNotifications(0);
      setUnreadMessages(0);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    refresh();
    timerRef.current = setInterval(refresh, 30000);
    return () => clearInterval(timerRef.current);
  }, [user, refresh]);

  const totalUnread = unreadNotifications + unreadMessages;

  return (
    <NotificationContext.Provider value={{ unreadNotifications, unreadMessages, totalUnread, refresh }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  return useContext(NotificationContext);
}
