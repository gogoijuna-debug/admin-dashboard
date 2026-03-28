"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
  updateDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { useAuth } from './AuthContext';

interface AdminNotification {
  id: string;
  eventType: string;
  entityType: string;
  entityId: string;
  title: string;
  body: string;
  deepLink: string;
  priority: string;
  read: boolean;
  createdAt: any;
  readAt?: any;
}

interface AdminNotificationsContextType {
  notifications: AdminNotification[];
  unreadCount: number;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const AdminNotificationsContext = createContext<AdminNotificationsContextType>({
  notifications: [],
  unreadCount: 0,
  markRead: async () => {},
  markAllRead: async () => {},
});

export const AdminNotificationsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('recipientType', '==', 'staff'),
      orderBy('createdAt', 'desc'),
      limit(50),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setNotifications(
          snap.docs.map((d) => ({ id: d.id, ...d.data() } as AdminNotification)),
        );
      },
      (err) => {
        console.warn('[admin-notifications] snapshot error', err);
      },
    );

    return () => unsub();
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await updateDoc(doc(db, 'notifications', id), {
      read: true,
      readAt: serverTimestamp(),
    });
  };

  const markAllRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await Promise.all(
      unread.map((n) =>
        updateDoc(doc(db, 'notifications', n.id), {
          read: true,
          readAt: serverTimestamp(),
        }),
      ),
    );
  };

  return (
    <AdminNotificationsContext.Provider
      value={{ notifications, unreadCount, markRead, markAllRead }}
    >
      {children}
    </AdminNotificationsContext.Provider>
  );
};

export const useAdminNotifications = () => useContext(AdminNotificationsContext);
