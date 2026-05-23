import {
  getConversationList,
  getConversationMessages,
  getTotalUnreadCount,
  markConversationRead,
  sendEncryptedMessage,
  clearChatForUser,
  deleteConversationForUser,
  viewOneTimeImage,
} from '../services/chatService.js';
import { getIO, mapSocketMessage } from '../socket/socketServer.js';

const mapMessage = (msg) => ({
  _id: msg._id,
  sender: msg.sender,
  receiver: msg.receiver,
  ciphertext: msg.ciphertext,
  iv: msg.iv,
  conversationKey: msg.conversationKey,
  readAt: msg.readAt,
  createdAt: msg.createdAt,
  replyTo: msg.replyTo,
  replySnippet: msg.replySnippet,
  messageType: msg.messageType || 'text',
  imageUri: msg.imageUri || null,
  isOneTimeView: msg.isOneTimeView || false,
  oneTimeViewedAt: msg.oneTimeViewedAt || null,
  reactions: (msg.reactions || []).map((r) => ({
    userId: String(r.userId),
    emoji: r.emoji,
    createdAt: r.createdAt,
  })),
});

const withError = (res, error, fallbackMessage) => {
  const status = error?.statusCode || 500;
  return res.status(status).json({
    message: error?.message || fallbackMessage,
  });
};

export const listMyConversations = async (req, res) => {
  try {
    const items = await getConversationList(req.user._id);
    res.json({ conversations: items });
  } catch (error) {
    withError(res, error, 'Failed to fetch conversations');
  }
};

export const listConversationMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const { before, limit } = req.query;
    const messages = await getConversationMessages({
      userId: req.user._id,
      targetUserId: userId,
      before,
      limit,
    });

    res.json({ messages: messages.map(mapMessage) });
  } catch (error) {
    withError(res, error, 'Failed to fetch messages');
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { userId } = req.params;
    const { ciphertext, iv, replyTo, replySnippet } = req.body;

    if (!ciphertext || !iv) {
      return res.status(400).json({ message: 'ciphertext and iv are required' });
    }

    const message = await sendEncryptedMessage({
      senderId: req.user._id,
      receiverId: userId,
      ciphertext,
      iv,
      replyTo,
      replySnippet,
    });

    res.status(201).json({ message: mapMessage(message) });
  } catch (error) {
    withError(res, error, 'Failed to send message');
  }
};

export const sendImageMessage = async (req, res) => {
  try {
    const { userId } = req.params;
    const { ciphertext, iv, isOneTimeView } = req.body;

    if (!ciphertext || !iv) {
      return res.status(400).json({ message: 'ciphertext and iv are required' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Image file is required' });
    }

    const imageUri = `/uploads/chat-images/${req.file.filename}`;

    const message = await sendEncryptedMessage({
      senderId: req.user._id,
      receiverId: userId,
      ciphertext,
      iv,
      messageType: 'image',
      imageUri,
      isOneTimeView: isOneTimeView === 'true' || isOneTimeView === true,
    });

    const io = getIO();
    if (io) {
      const eventPayload = {
        message: mapSocketMessage(message),
        clientTempId: null,
      };
      io.to(`user:${req.user._id}`).emit('chat:message', eventPayload);
      io.to(`user:${userId}`).emit('chat:message', eventPayload);
    }

    res.status(201).json({ message: mapMessage(message) });
  } catch (error) {
    withError(res, error, 'Failed to send image');
  }
};

export const viewOneTimeMsg = async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await viewOneTimeImage({
      messageId,
      userId: req.user._id,
    });
    res.json({ message: mapMessage(message) });
  } catch (error) {
    withError(res, error, 'Failed to view image');
  }
};

export const clearChat = async (req, res) => {
  try {
    const { userId } = req.params;
    await clearChatForUser({
      userId: req.user._id,
      targetUserId: userId,
    });
    res.json({ message: 'Chat cleared' });
  } catch (error) {
    withError(res, error, 'Failed to clear chat');
  }
};

export const deleteConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    await deleteConversationForUser({
      userId: req.user._id,
      targetUserId: userId,
    });
    res.json({ message: 'Conversation deleted' });
  } catch (error) {
    withError(res, error, 'Failed to delete conversation');
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    const count = await getTotalUnreadCount(req.user._id);
    res.json({ count });
  } catch (error) {
    withError(res, error, 'Failed to fetch unread count');
  }
};

export const readConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    await markConversationRead({
      userId: req.user._id,
      targetUserId: userId,
    });
    res.json({ success: true });
  } catch (error) {
    withError(res, error, 'Failed to mark conversation as read');
  }
};