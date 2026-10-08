import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import socketClient from '../../services/socket';
import ReportButton from '../../components/common/ReportButton';
import {
  MessageSquare,
  Send,
  BookOpen,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Check,
  CheckCheck,
  ArrowLeft,
  AlertCircle,
  Clock,
  Lock,
} from 'lucide-react';

export function ConversationsPage() {
  const { user, role } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const targetConvoId = searchParams.get('convo');

  const [conversations, setConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [activeConvo, setActiveConvo] = useState(null);

  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);

  const [inputText, setInputText] = useState('');
  const [sendError, setSendError] = useState(null);
  const [isTypingCounterpart, setIsTypingCounterpart] = useState(false);

  const [mobilePane, setMobilePane] = useState(targetConvoId ? 'thread' : 'list');

  const messageEndRef = useRef(null);
  const messageListRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const activeConvoIdRef = useRef(null);

  activeConvoIdRef.current = activeConvo?._id;

  const loadConversations = useCallback(async () => {
    try {
      const res = await api.conversations.list({ limit: 50 });
      const list = res.data || [];
      setConversations(list);

      if (targetConvoId) {
        const found = list.find((c) => c._id === targetConvoId);
        if (found) {
          setActiveConvo(found);
          setMobilePane('thread');
        } else if (list.length > 0 && !activeConvo) {
          setActiveConvo(list[0]);
        }
      } else if (list.length > 0 && !activeConvo) {
        setActiveConvo(list[0]);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  }, [targetConvoId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const loadMessages = useCallback(async (convoId) => {
    setLoadingMessages(true);
    setSendError(null);
    try {
      const res = await api.conversations.getMessages(convoId, { limit: 30 });
      setMessages(res.messages || []);
      setHasMoreMessages(res.hasMore || false);
      setNextCursor(res.nextCursor || null);

      socketClient.emit('message:read', { conversationId: convoId });

      setTimeout(() => {
        messageEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 50);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (!activeConvo?._id) return;

    const convoId = activeConvo._id;
    setSearchParams({ convo: convoId }, { replace: true });
    loadMessages(convoId);

    socketClient.joinRoom(`conversation:${convoId}`);
    socketClient.emit('conversation:join', { conversationId: convoId });

    return () => {
      socketClient.emit('conversation:leave', { conversationId: convoId });
      socketClient.leaveRoom(`conversation:${convoId}`);
    };
  }, [activeConvo?._id, loadMessages, setSearchParams]);

  const handleLoadOlder = async () => {
    if (!activeConvo || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const scrollContainer = messageListRef.current;
      const prevScrollHeight = scrollContainer ? scrollContainer.scrollHeight : 0;

      const res = await api.conversations.getMessages(activeConvo._id, {
        before: nextCursor,
        limit: 30,
      });

      setMessages((prev) => [...(res.messages || []), ...prev]);
      setHasMoreMessages(res.hasMore || false);
      setNextCursor(res.nextCursor || null);

      setTimeout(() => {
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight - prevScrollHeight;
        }
      }, 30);
    } catch (err) {
      console.error('Failed to load older messages:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    const handleNewMessage = (payload) => {
      const message = payload?.message || payload;
      const conversationId = (payload?.conversationId || message?.conversationId)?.toString();
      if (!message || !message.text) return;

      setConversations((prev) =>
        prev.map((c) => {
          if (c._id?.toString() === conversationId) {
            return {
              ...c,
              lastMessage: {
                text: message.text,
                senderId: message.senderId?._id || message.senderId,
                createdAt: message.createdAt,
              },
              lastMessageAt: message.createdAt,
              unreadCount:
                activeConvoIdRef.current?.toString() === conversationId
                  ? 0
                  : (c.unreadCount || 0) + 1,
            };
          }
          return c;
        })
      );

      if (activeConvoIdRef.current?.toString() === conversationId) {
        setMessages((prev) => {
          const idx = prev.findIndex(
            (m) =>
              m._id === message._id ||
              (m.clientMsgId && m.clientMsgId === message.clientMsgId)
          );
          if (idx !== -1) {
            const next = [...prev];
            next[idx] = message;
            return next;
          }
          return [...prev, message];
        });

        socketClient.emit('message:read', { conversationId });

        setTimeout(() => {
          messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 50);
      }
    };

    const handleReadReceipt = (payload) => {
      const { conversationId, readAt } = payload;
      if (activeConvoIdRef.current === conversationId) {
        setMessages((prev) =>
          prev.map((m) => {
            if (!m.readAt) {
              return { ...m, readAt };
            }
            return m;
          })
        );
      }
    };

    const handleTypingUpdate = (payload) => {
      const { conversationId, userId, isTyping } = payload;
      if (
        activeConvoIdRef.current === conversationId &&
        userId !== (user?.id || user?._id)
      ) {
        setIsTypingCounterpart(isTyping);
      }
    };

    const handleMessageError = (payload) => {
      const { clientMsgId, error } = payload;
      setSendError(error || 'Message could not be sent.');
      if (clientMsgId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.clientMsgId === clientMsgId ? { ...m, status: 'failed' } : m
          )
        );
      }
    };

    const handleConnect = () => {
      if (activeConvoIdRef.current) {
        socketClient.joinRoom(`conversation:${activeConvoIdRef.current}`);
        socketClient.emit('conversation:join', { conversationId: activeConvoIdRef.current });
      }
    };

    socketClient.on('connect', handleConnect);
    socketClient.on('message:new', handleNewMessage);
    socketClient.on('message:read', handleReadReceipt);
    socketClient.on('message:read:ack', handleReadReceipt);
    socketClient.on('conversation:typing', handleTypingUpdate);
    socketClient.on('conversation:typing:update', handleTypingUpdate);
    socketClient.on('message:error', handleMessageError);

    return () => {
      socketClient.off('connect', handleConnect);
      socketClient.off('message:new', handleNewMessage);
      socketClient.off('message:read', handleReadReceipt);
      socketClient.off('message:read:ack', handleReadReceipt);
      socketClient.off('conversation:typing', handleTypingUpdate);
      socketClient.off('conversation:typing:update', handleTypingUpdate);
      socketClient.off('message:error', handleMessageError);
    };
  }, [user]);

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    if (!activeConvo) return;

    socketClient.emit('conversation:typing', {
      conversationId: activeConvo._id,
      isTyping: true,
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketClient.emit('conversation:typing', {
        conversationId: activeConvo._id,
        isTyping: false,
      });
    }, 2000);
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputText.trim() || !activeConvo) return;

    const textToSend = inputText.trim();
    const clientMsgId = `cli_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setInputText('');
    setSendError(null);

    const optimisticMsg = {
      _id: clientMsgId,
      clientMsgId,
      conversationId: activeConvo._id,
      senderId: {
        _id: user?.id || user?._id,
        name: user?.name,
      },
      text: textToSend,
      createdAt: new Date().toISOString(),
      status: 'sending',
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => {
      messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 30);

    try {
      const socket = socketClient.getSocket();
      if (socket && socket.connected) {
        socketClient.emit('message:send', {
          conversationId: activeConvo._id,
          text: textToSend,
          clientMsgId,
        });
      } else {
        const saved = await api.conversations.sendMessage(activeConvo._id, textToSend);
        setMessages((prev) =>
          prev.map((m) => (m.clientMsgId === clientMsgId ? saved : m))
        );
      }
    } catch (err) {
      setSendError(err.message || 'Failed to deliver message.');
      setMessages((prev) =>
        prev.map((m) =>
          m.clientMsgId === clientMsgId ? { ...m, status: 'failed' } : m
        )
      );
    }
  };

  const handleRetry = async (failedMsg) => {
    try {
      setSendError(null);
      const saved = await api.conversations.sendMessage(
        activeConvo._id,
        failedMsg.text
      );
      setMessages((prev) =>
        prev.map((m) =>
          m.clientMsgId === failedMsg.clientMsgId ? saved : m
        )
      );
    } catch (err) {
      setSendError(err.message || 'Retry failed.');
    }
  };

  const handleToggleContactSharing = async () => {
    if (!activeConvo || role !== 'writer') return;
    const nextState = !activeConvo.contactSharingEnabled;
    try {
      const updated = await api.conversations.update(activeConvo._id, {
        contactSharingEnabled: nextState,
      });
      setActiveConvo((prev) => ({
        ...prev,
        contactSharingEnabled: updated.contactSharingEnabled,
      }));
      setConversations((prev) =>
        prev.map((c) =>
          c._id === activeConvo._id
            ? { ...c, contactSharingEnabled: updated.contactSharingEnabled }
            : c
        )
      );
    } catch (err) {
      alert(err.message || 'Failed to update contact sharing setting.');
    }
  };

  const getCounterpart = (convo) => {
    if (!convo) return {};
    const isCurrentUserWriter =
      role === 'writer' ||
      (convo.writerId?._id || convo.writerId) === (user?.id || user?._id);

    if (isCurrentUserWriter) {
      return {
        name: convo.publisherId?.company || convo.publisherId?.name || 'Publisher',
        subtext: convo.publisherId?.name || 'Representative',
        role: 'publisher',
        avatarUrl: convo.publisherId?.avatarUrl,
        id: convo.publisherId?._id || convo.publisherId,
      };
    }
    return {
      name: convo.writerId?.name || convo.writerId?.username || 'Author',
      subtext: `@${convo.writerId?.username || 'writer'}`,
      role: 'writer',
      avatarUrl: convo.writerId?.avatarUrl,
      id: convo.writerId?._id || convo.writerId,
    };
  };

  const currentCounterpart = getCounterpart(activeConvo);
  const isWriter = role === 'writer';
  const isConversationClosed =
    activeConvo?.status === 'closed' || activeConvo?.status === 'declined';

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-8.5rem)] flex flex-col bg-paper border border-rule rounded overflow-hidden">
      <div className="flex-1 flex min-h-0">
        <div
          className={`w-full md:w-80 lg:w-96 border-r border-rule flex flex-col bg-paper shrink-0 ${
            mobilePane === 'thread' ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="p-4 border-b border-rule bg-paper flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-ink" />
              <h2 className="font-bold text-ink text-base">
                Messages
              </h2>
            </div>
            <span className="text-xs text-muted font-medium">
              {conversations.length} Active
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-rule">
            {loadingConversations ? (
              <div className="p-4 text-center text-xs text-muted">
                Loading…
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-muted space-y-2">
                <MessageSquare className="w-8 h-8 mx-auto text-muted" />
                <p className="text-xs font-semibold text-ink">
                  No active conversations
                </p>
                <p className="text-[11px] text-muted">
                  Accepted publishing requests will appear here.
                </p>
              </div>
            ) : (
              conversations.map((convo) => {
                const isSelected = activeConvo?._id === convo._id;
                const other = getCounterpart(convo);
                const book = convo.bookId || {};

                return (
                  <button
                    key={convo._id}
                    onClick={() => {
                      setActiveConvo(convo);
                      setMobilePane('thread');
                    }}
                    className={`w-full p-4 text-left flex items-start gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-rule/10 border-l-2 border-l-ink'
                        : 'hover:bg-rule/5'
                    }`}
                  >
                    <div className="w-12 h-16 bg-paper rounded overflow-hidden shrink-0 border border-rule">
                      {book.coverUrl ? (
                        <img
                          src={book.coverUrl}
                          alt={book.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted">
                          <BookOpen className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-xs text-ink truncate">
                          {other.name}
                        </span>
                        {convo.lastMessageAt && (
                          <span className="text-[10px] text-muted shrink-0">
                            {new Date(convo.lastMessageAt).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-muted truncate mt-0.5">
                        {book.title || 'Untitled Manuscript'}
                      </p>

                      <div className="flex items-center justify-between mt-1.5">
                        <p className="text-xs text-muted truncate max-w-[180px]">
                          {convo.lastMessage?.text || 'Conversation opened.'}
                        </p>
                        {convo.unreadCount > 0 && (
                          <span className="px-1.5 py-0.5 bg-ink text-paper text-[10px] font-bold rounded min-w-4 text-center">
                            {convo.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div
          className={`flex-1 flex flex-col bg-paper min-w-0 ${
            mobilePane === 'list' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {activeConvo ? (
            <>
              <div className="p-4 border-b border-rule flex items-center justify-between gap-3 bg-paper sticky top-0 z-10">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => setMobilePane('list')}
                    className="md:hidden p-1 text-muted hover:text-ink rounded cursor-pointer"
                    title="Back to list"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <div className="w-8 h-8 rounded border border-rule flex items-center justify-center text-ink font-bold text-xs shrink-0">
                    {currentCounterpart.avatarUrl ? (
                      <img
                        src={currentCounterpart.avatarUrl}
                        alt={currentCounterpart.name}
                        className="w-full h-full rounded object-cover"
                      />
                    ) : (
                      currentCounterpart.name?.charAt(0) || 'U'
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-ink text-sm truncate">
                        {currentCounterpart.name}
                      </h3>
                      <span className="text-[10px] px-1.5 py-0.5 rounded border border-rule font-bold uppercase text-muted">
                        {currentCounterpart.role}
                      </span>
                    </div>
                    <p className="text-xs text-muted truncate">
                      Re:{' '}
                      <span className="font-semibold text-ink">
                        {activeConvo.bookId?.title || 'Book Project'}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isWriter ? (
                    <button
                      onClick={handleToggleContactSharing}
                      disabled={isConversationClosed}
                      title="Click to toggle external contact sharing permission"
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold border cursor-pointer ${
                        activeConvo.contactSharingEnabled
                          ? 'bg-paper text-success border-success'
                          : 'bg-paper text-muted border-rule hover:border-ink'
                      }`}
                    >
                      {activeConvo.contactSharingEnabled ? (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5 text-success" />
                          <span>Contact Sharing: ON</span>
                        </>
                      ) : (
                        <>
                          <Shield className="w-3.5 h-3.5 text-muted" />
                          <span>Contact Sharing: OFF</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border border-rule ${
                        activeConvo.contactSharingEnabled
                          ? 'text-success'
                          : 'text-muted'
                      }`}
                    >
                      {activeConvo.contactSharingEnabled ? (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5 text-success" />
                          <span>Direct Contacts Permitted</span>
                        </>
                      ) : (
                        <>
                          <Shield className="w-3.5 h-3.5 text-muted" />
                          <span>Platform Only (Contact Filter On)</span>
                        </>
                      )}
                    </span>
                  )}

                  <ReportButton
                    targetType="conversation"
                    targetId={activeConvo._id}
                    targetTitle={`Chat Re: ${activeConvo.bookId?.title || 'Book'}`}
                    variant="icon"
                  />
                </div>
              </div>

              {activeConvo.contactSharingEnabled ? (
                <div className="bg-paper border-b border-rule px-4 py-2 text-[11px] text-success flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-success shrink-0" />
                    <span>
                      Direct contact sharing is <strong>enabled</strong> by the author. Phone numbers, emails, and external links are allowed.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-paper border-b border-rule px-4 py-2 text-[11px] text-muted flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-muted shrink-0" />
                    <span>
                      Contact sharing is <strong>off</strong>. Messages containing emails, phone numbers, or URLs will be blocked for safety.
                    </span>
                  </div>
                </div>
              )}

              <div
                ref={messageListRef}
                className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-paper"
                aria-live="polite"
              >
                {hasMoreMessages && (
                  <div className="text-center pb-2">
                    <button
                      onClick={handleLoadOlder}
                      disabled={loadingMore}
                      className="px-3 py-1 bg-paper border border-rule text-ink rounded text-xs font-semibold hover:bg-rule/10 cursor-pointer"
                    >
                      {loadingMore ? 'Loading older...' : '↑ Load Older Messages'}
                    </button>
                  </div>
                )}

                {loadingMessages ? (
                  <div className="py-8 text-center text-xs text-muted">
                    Loading…
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-16 text-muted space-y-2">
                    <MessageSquare className="w-8 h-8 mx-auto text-muted" />
                    <h4 className="font-bold text-ink text-sm">
                      Start the Conversation
                    </h4>
                    <p className="text-xs text-muted max-w-sm mx-auto">
                      Discuss manuscript development, rights acquisition, and contract milestones.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isOwn =
                      (msg.senderId?._id || msg.senderId) ===
                      (user?.id || user?._id);

                    return (
                      <div
                        key={msg._id || msg.clientMsgId}
                        className={`flex flex-col ${
                          isOwn ? 'items-end' : 'items-start'
                        }`}
                      >
                        <div
                          className={`max-w-lg md:max-w-xl rounded px-4 py-2 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words ${
                            isOwn
                              ? 'bg-ink text-paper'
                              : 'bg-paper text-ink border border-rule'
                          } ${msg.status === 'failed' ? 'border border-danger' : ''}`}
                        >
                          <span>{msg.text}</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-[10px] text-muted mt-1 px-1">
                          <span>
                            {msg.createdAt
                              ? new Date(msg.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'Just now'}
                          </span>

                          {isOwn && (
                            <>
                              {msg.status === 'sending' ? (
                                <Clock className="w-3 h-3 text-muted" />
                              ) : msg.status === 'failed' ? (
                                <button
                                  onClick={() => handleRetry(msg)}
                                  className="text-danger font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                                >
                                  <AlertCircle className="w-3 h-3" /> Retry
                                </button>
                              ) : msg.readAt ? (
                                <CheckCheck
                                  className="w-3.5 h-3.5 text-accent"
                                  title={`Read ${new Date(msg.readAt).toLocaleTimeString()}`}
                                />
                              ) : (
                                <Check className="w-3.5 h-3.5 text-muted" title="Delivered" />
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}

                {isTypingCounterpart && (
                  <div className="text-xs text-muted italic p-2 border border-rule rounded bg-paper w-fit">
                    {currentCounterpart.name} is typing…
                  </div>
                )}

                <div ref={messageEndRef} />
              </div>

              {sendError && (
                <div className="p-2.5 bg-paper border-t border-danger text-danger text-xs flex items-center justify-between px-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{sendError}</span>
                  </div>
                  <button
                    onClick={() => setSendError(null)}
                    className="text-xs font-bold hover:underline cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {isConversationClosed ? (
                <div className="p-4 bg-paper border-t border-rule text-center text-xs text-muted flex items-center justify-center gap-2">
                  <Lock className="w-4 h-4 text-muted" />
                  <span>
                    This conversation is closed. No further messages can be submitted.
                  </span>
                </div>
              ) : (
                <form
                  onSubmit={handleSendMessage}
                  className="p-3 md:p-4 border-t border-rule bg-paper"
                >
                  <div className="flex items-end gap-2">
                    <div className="flex-1 bg-paper border border-rule rounded focus-within:ring-1 focus-within:ring-ink">
                      <textarea
                        rows={2}
                        value={inputText}
                        onChange={handleInputChange}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        aria-label={`Message ${currentCounterpart.name}`}
                        placeholder={`Message ${currentCounterpart.name}...`}
                        maxLength={3000}
                        className="w-full bg-transparent p-3 text-xs sm:text-sm text-ink placeholder:text-muted focus:outline-hidden resize-none"
                      />
                      <div className="flex justify-between items-center px-3 pb-2 text-[10px] text-muted">
                        <span>Press Enter to send, Shift+Enter for new line</span>
                        <span>{inputText.length}/3000</span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={!inputText.trim()}
                      className="p-3 bg-ink hover:bg-accent text-paper rounded disabled:opacity-40 cursor-pointer shrink-0"
                      title="Send message"
                      aria-label="Send message"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted">
              <MessageSquare className="w-8 h-8 text-muted mb-3" />
              <h3 className="font-bold text-ink text-base">
                No Conversation Selected
              </h3>
              <p className="text-xs text-muted max-w-sm mt-1">
                Select a conversation from the sidebar to view deal details and chat in real-time.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ConversationsPage;
