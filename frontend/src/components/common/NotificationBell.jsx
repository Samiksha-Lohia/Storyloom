import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import socketClient from '../../services/socket.js';
import { api } from '../../services/api.js';

export default function NotificationBell() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const currentUser = api.auth.getCurrentUser();
  const token = localStorage.getItem('scenecraft_access_token');

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await api.notifications.getNotifications({ limit: 15 });
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser || !token) return;

    fetchNotifications();

    const handleNewNotification = (newNotif) => {
      setNotifications((prev) => [
        newNotif,
        ...prev.filter((n) => n._id !== newNotif._id),
      ]);
      setUnreadCount((prev) => prev + 1);
    };

    socketClient.on('notification:new', handleNewNotification);

    return () => {
      socketClient.off('notification:new', handleNewNotification);
    };
  }, [currentUser?.id, token]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (!isOpen) {
      fetchNotifications();
    }
    setIsOpen(!isOpen);
  };

  const handleNotificationClick = async (notif) => {
    await handleMarkAsRead(notif);
    setIsOpen(false);

    const role = currentUser?.role || 'reader';
    if (notif.data?.url) {
      navigate(notif.data.url);
    } else if (notif.type === 'book_published') {
      navigate(notif.data?.bookId ? `/book/${notif.data.bookId}` : '/browse');
    } else if (notif.type === 'publish_request_received') {
      navigate('/w/requests');
    } else if (
      notif.type === 'publish_request_accepted' ||
      notif.type === 'publish_request_declined'
    ) {
      navigate('/p/requests');
    } else if (notif.type === 'new_message') {
      const convoId = notif.data?.conversationId;
      const chatBase = role === 'writer' ? '/w/chat' : '/p/chat';
      navigate(convoId ? `${chatBase}?convo=${convoId}` : chatBase);
    } else if (notif.type === 'review_received') {
      navigate('/w/reviews');
    } else if (notif.type === 'moderation_action' || notif.type === 'report_action') {
      navigate('/library');
    }
  };

  const handleMarkAsRead = async (notif) => {
    if (notif.read) return;
    try {
      await api.notifications.markRead(notif._id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notif._id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.notifications.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={handleToggle}
        aria-label="Notifications"
        className="relative p-2 text-ink hover:text-accent rounded border border-transparent hover:border-rule cursor-pointer"
      >
        <Bell className="w-4 h-4 text-ink" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 min-w-[16px] h-[16px] px-1 bg-accent text-paper text-[10px] font-bold rounded flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-paper rounded border border-rule overflow-hidden z-50 text-ink">
          <div className="p-3 border-b border-rule flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-ink uppercase tracking-wider">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold bg-accent text-paper px-1.5 py-0.5 rounded">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs text-muted hover:text-accent font-bold cursor-pointer hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-rule">
            {loading && notifications.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted">
                Loading…
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center space-y-1">
                <p className="text-xs font-bold text-ink">No notifications yet</p>
                <p className="text-[11px] text-muted">Updates will appear here.</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif._id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3 flex items-start gap-2 hover:bg-rule/30 cursor-pointer ${
                    !notif.read ? 'bg-rule/15 font-bold' : ''
                  }`}
                >
                  <Bell className="w-4 h-4 text-ink shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-ink truncate">
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-muted shrink-0 font-normal">
                        {new Date(notif.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-muted mt-0.5 leading-relaxed line-clamp-2 font-normal">
                      {notif.message}
                    </p>
                  </div>
                  {!notif.read && (
                    <span className="w-1.5 h-1.5 rounded bg-accent shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

