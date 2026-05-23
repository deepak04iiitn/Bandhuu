import { io } from 'socket.io-client';
import apiClient from '../api/apiClient';

const getSocketBaseUrl = () => {
  const apiBase = apiClient?.defaults?.baseURL || '';
  return apiBase.replace(/\/api\/?$/, '');
};

export const getServerBaseUrl = () => {
  const apiBase = apiClient?.defaults?.baseURL || '';
  return apiBase.replace(/\/api\/?$/, '');
};

export const fetchConversations = async () => {
  const response = await apiClient.get('/chats/conversations');
  return response.data?.conversations || [];
};

export const fetchMessages = async (userId, { before, limit } = {}) => {
  const params = {};
  if (before) params.before = before;
  if (limit) params.limit = limit;
  const response = await apiClient.get(`/chats/${userId}/messages`, { params });
  return response.data?.messages || [];
};

export const markConversationRead = async (userId) => {
  await apiClient.put(`/chats/${userId}/read`);
};

export const sendEncryptedMessageHttp = async (userId, payload) => {
  const response = await apiClient.post(`/chats/${userId}/messages`, payload);
  return response.data?.message;
};

export const fetchUnreadMessageCount = async () => {
  const response = await apiClient.get('/chats/unread-count');
  return response.data?.count || 0;
};

export const clearConversationMessages = async (userId) => {
  const response = await apiClient.delete(`/chats/${userId}`);
  return response.data;
};

export const deleteConversation = async (userId) => {
  const response = await apiClient.delete(`/chats/${userId}/conversation`);
  return response.data;
};

export const sendImageMessageHttp = async (userId, { uri, fileName, mimeType, ciphertext, iv, isOneTimeView }) => {
  const formData = new FormData();
  formData.append('chatImage', {
    uri,
    name: fileName || `chat-${Date.now()}.jpg`,
    type: mimeType || 'image/jpeg',
  });
  formData.append('ciphertext', ciphertext);
  formData.append('iv', iv);
  formData.append('isOneTimeView', String(!!isOneTimeView));

  const response = await apiClient.post(`/chats/${userId}/image`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data?.message;
};

export const markOneTimeViewed = async (messageId) => {
  const response = await apiClient.post(`/chats/one-time-view/${messageId}`);
  return response.data?.message;
};

let socketRef = null;
let activeToken = null;
let messageHandler = null;
let readReceiptHandler = null;
let statusHandler = null;
let typingHandler = null;
let reactionHandler = null;
let groupMessageHandler = null;
let groupTypingHandler = null;
let groupReactionHandler = null;

export const ensureChatSocket = (token) => {
  if (!token) return null;

  if (socketRef && activeToken === token) {
    return socketRef;
  }

  if (socketRef) {
    socketRef.removeAllListeners();
    socketRef.disconnect();
    socketRef = null;
  }

  activeToken = token;

  socketRef = io(getSocketBaseUrl(), {
    transports: ['websocket'],
    auth: { token },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
  });

  socketRef.on('connect', () => {});

  socketRef.on('disconnect', () => {});

  socketRef.on('connect_error', () => {});

  socketRef.on('chat:message', (payload) => {
    messageHandler?.(payload);
  });

  socketRef.on('chat:read-receipt', (payload) => {
    readReceiptHandler?.(payload);
  });

  socketRef.on('user:status', (payload) => {
    statusHandler?.(payload);
  });

  socketRef.on('chat:typing', (payload) => {
    typingHandler?.(payload);
  });

  socketRef.on('chat:reaction', (payload) => {
    reactionHandler?.(payload);
  });

  socketRef.on('group:message', (payload) => {
    groupMessageHandler?.(payload);
  });

  socketRef.on('group:typing', (payload) => {
    groupTypingHandler?.(payload);
  });

  socketRef.on('group:reaction', (payload) => {
    groupReactionHandler?.(payload);
  });

  return socketRef;
};

export const setChatHandlers = (onMessage, onReadReceipt, onStatus, onTyping, onReaction) => {
  messageHandler = onMessage;
  readReceiptHandler = onReadReceipt;
  statusHandler = onStatus;
  typingHandler = onTyping;
  reactionHandler = onReaction;
};

export const getChatSocket = () => socketRef;

export const sendMessageViaSocket = (payload) => {
  return new Promise((resolve, reject) => {
    if (!socketRef?.connected) {
      reject(new Error('Socket not connected'));
      return;
    }
    socketRef.emit('chat:send', payload, (response) => {
      if (response?.success) {
        resolve(response);
      } else {
        reject(new Error(response?.message || 'Failed to send message'));
      }
    });
  });
};

export const emitReaction = (messageId, emoji) => {
  return new Promise((resolve, reject) => {
    if (!socketRef?.connected) {
      reject(new Error('Socket not connected'));
      return;
    }
    socketRef.emit('chat:react', { messageId, emoji }, (response) => {
      if (response?.success) {
        resolve(response);
      } else {
        reject(new Error(response?.message || 'Failed to react'));
      }
    });
  });
};

export const emitReadReceipt = (peerUserId) => {
  if (!socketRef?.connected || !peerUserId) return;
  socketRef.emit('chat:read', { peerUserId });
};

export const destroyChatSocket = () => {
  if (socketRef) {
    socketRef.removeAllListeners();
    socketRef.disconnect();
    socketRef = null;
  }
  activeToken = null;
  messageHandler = null;
  readReceiptHandler = null;
};

// ── Group Chat ──

export const setGroupChatHandlers = (onMessage, onTyping, onReaction) => {
  groupMessageHandler = onMessage;
  groupTypingHandler = onTyping;
  groupReactionHandler = onReaction;
};

export const joinGroupRoom = (meetupId) => {
  if (!socketRef?.connected || !meetupId) return;
  socketRef.emit('group:join', { meetupId });
};

export const leaveGroupRoom = (meetupId) => {
  if (!socketRef?.connected || !meetupId) return;
  socketRef.emit('group:leave', { meetupId });
};

export const sendGroupMessageViaSocket = (payload) => {
  return new Promise((resolve, reject) => {
    if (!socketRef?.connected) {
      reject(new Error('Socket not connected'));
      return;
    }
    socketRef.emit('group:send', payload, (response) => {
      if (response?.success) resolve(response);
      else reject(new Error(response?.message || 'Failed to send'));
    });
  });
};

export const emitGroupTyping = (meetupId, isTyping) => {
  if (!socketRef?.connected || !meetupId) return;
  socketRef.emit('group:typing', { meetupId, isTyping });
};

export const emitGroupReaction = (messageId, emoji) => {
  return new Promise((resolve, reject) => {
    if (!socketRef?.connected) {
      reject(new Error('Socket not connected'));
      return;
    }
    socketRef.emit('group:react', { messageId, emoji }, (response) => {
      if (response?.success) resolve(response);
      else reject(new Error(response?.message || 'Failed to react'));
    });
  });
};

export const fetchGroupMessages = async (meetupId, { before, limit } = {}) => {
  const params = {};
  if (before) params.before = before;
  if (limit) params.limit = limit;
  const response = await apiClient.get(`/group-chats/${meetupId}/messages`, { params });
  return response.data || [];
};

export const sendGroupImageHttp = async (meetupId, { uri, fileName, mimeType, ciphertext, iv, isOneTimeView }) => {
  const formData = new FormData();
  formData.append('chatImage', {
    uri,
    name: fileName || `group-${Date.now()}.jpg`,
    type: mimeType || 'image/jpeg',
  });
  formData.append('ciphertext', ciphertext || 'image');
  formData.append('iv', iv || 'image');
  formData.append('isOneTimeView', String(!!isOneTimeView));

  const response = await apiClient.post(`/group-chats/${meetupId}/image`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const markGroupOneTimeViewed = async (messageId) => {
  const response = await apiClient.post(`/group-chats/one-time-view/${messageId}`);
  return response.data;
};

export const fetchGroupChatSummaries = async () => {
  const response = await apiClient.get('/group-chats/summaries');
  return response.data || {};
};

export const markGroupChatAsRead = async (meetupId) => {
  const response = await apiClient.post(`/group-chats/${meetupId}/read`);
  return response.data;
};
