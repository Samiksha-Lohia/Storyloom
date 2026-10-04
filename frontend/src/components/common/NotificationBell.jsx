import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  BookOpen,
  AlertOctagon,
  Info,
  AlertTriangle,
  MessageSquare,
  Send,
  CheckCircle,
  XCircle,
} from 'lucide-react';
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

  // Load notifications and count
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

    // Use socketClient singleton
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

  // Handle outside click to close dropdown
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

    // Route according to notification type
    const role = currentUser?.role || 'reader';
    if (notif.type === 'publish_request_received') {
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

  const getIconForType = (type) => {
    if (type === 'strike_received' || type === 'account_suspended') {
      return <AlertOctagon className="w-4 h-4 text-red-600" />;
    }
    if (type === 'book_removed') {
      return <AlertTriangle className="w-4 h-4 text-amber-600" />;
    }
    if (type === 'review_received') {
      return <BookOpen className="w-4 h-4 text-blue-600" />;
    }
    if (type === 'publish_request_received') {
      return <Send className="w-4 h-4 text-[#FF500A]" />;
    }
    if (type === 'publish_request_accepted') {
      return <CheckCircle className="w-4 h-4 text-emerald-600" />;
    }
    if (type === 'publish_request_declined') {
      return <XCircle className="w-4 h-4 text-rose-600" />;
    }
    if (type === 'new_message') {
      return <MessageSquare className="w-4 h-4 text-blue-600" />;
    }
    return <Info className="w-4 h-4 text-[#FF500A]" />;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={handleToggle}
        aria-label="Notifications"
        className="relative p-2 text-stone-600 hover:text-stone-900 rounded-full hover:bg-stone-100 transition cursor-pointer"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-[#FF500A] text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white animate-in zoom-in">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-3xl shadow-xl border border-stone-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
          {/* Header */}
          <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
            <div className="flex items-center gap-2">
              <h3 className="font-heading text-sm font-bold text-stone-900">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="text-[11px] font-bold bg-[#FF500A]/10 text-[#FF500A] px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs text-stone-500 hover:text-[#FF500A] transition font-medium flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-stone-100">
            {loading && notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-stone-400">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center space-y-1">
                <Bell className="w-6 h-6 text-stone-300 mx-auto" />
                <p className="text-xs font-semibold text-stone-600">No notifications yet</p>
                <p className="text-[11px] text-stone-400">Updates about your books and reviews will appear here.</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif._id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 flex items-start gap-3 hover:bg-stone-50 transition cursor-pointer ${
                    !notif.read ? 'bg-orange-50/30' : ''
                  }`}
                >
                  <div className="p-2 rounded-xl bg-stone-100 shrink-0 mt-0.5">
                    {getIconForType(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-stone-900 truncate">
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-stone-400 shrink-0">
                        {new Date(notif.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 mt-0.5 leading-relaxed line-clamp-3">
                      {notif.message}
                    </p>
                  </div>
                  {!notif.read && (
                    <span className="w-2 h-2 rounded-full bg-[#FF500A] shrink-0 mt-2" />
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
