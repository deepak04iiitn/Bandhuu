import mongoose from 'mongoose';
import Message from '../models/Message.js';
import User from '../models/User.js';
import Block from '../models/Block.js';
import Conversation from '../models/Conversation.js';

const toIdString = (value) => value?.toString();

export const buildConversationKey = (a, b) => [toIdString(a), toIdString(b)].sort().join(':');

export const areUsersConnected = async (userId, targetUserId) => {
  const me = await User.findById(userId).select('connections');
  if (!me) return false;
  return me.connections?.some((id) => toIdString(id) === toIdString(targetUserId));
};

export const isBlocked = async (userA, userB) => {
  const count = await Block.countDocuments({
    $or: [
      { blocker: userA, blocked: userB },
      { blocker: userB, blocked: userA },
    ],
  });
  return count > 0;
};

export const assertConnected = async (userId, targetUserId) => {
  const ok = await areUsersConnected(userId, targetUserId);
  if (!ok) {
    const error = new Error('You can only chat with your connections');
    error.statusCode = 403;
    throw error;
  }
};

export const sendEncryptedMessage = async ({
  senderId,
  receiverId,
  ciphertext,
  iv,
  replyTo = null,
  replySnippet = null,
  messageType = 'text',
  imageUri = null,
  isOneTimeView = false,
}) => {
  if (await isBlocked(senderId, receiverId)) {
    const err = new Error('You cannot message this user');
    err.statusCode = 403;
    throw err;
  }

  await assertConnected(senderId, receiverId);

  const senderOid = new mongoose.Types.ObjectId(toIdString(senderId));
  const receiverOid = new mongoose.Types.ObjectId(toIdString(receiverId));
  const conversationKey = buildConversationKey(senderId, receiverId);

  const message = await Message.create({
    conversationKey,
    participants: [senderOid, receiverOid],
    sender: senderOid,
    receiver: receiverOid,
    ciphertext,
    iv,
    replyTo: replyTo ? new mongoose.Types.ObjectId(replyTo) : null,
    replySnippet,
    messageType,
    imageUri,
    isOneTimeView,
  });

  await Conversation.findOneAndUpdate(
    { conversationKey },
    {
      $set: { lastActivity: new Date() },
      $addToSet: { participants: { $each: [senderOid, receiverOid] } },
      $pull: { deletedFor: { $in: [senderOid, receiverOid] } },
    },
    { upsert: true }
  );

  return message;
};

export const viewOneTimeImage = async ({ messageId, userId }) => {
  const message = await Message.findById(messageId);
  if (!message) {
    const error = new Error('Message not found');
    error.statusCode = 404;
    throw error;
  }

  if (toIdString(message.receiver) !== toIdString(userId)) {
    const error = new Error('You are not the recipient of this message');
    error.statusCode = 403;
    throw error;
  }

  if (!message.isOneTimeView || message.messageType !== 'image') {
    const error = new Error('This is not a one-time view image');
    error.statusCode = 400;
    throw error;
  }

  if (message.oneTimeViewedAt) {
    const error = new Error('This image has already been viewed');
    error.statusCode = 410;
    throw error;
  }

  message.oneTimeViewedAt = new Date();
  await message.save();

  return message;
};

export const getConversationMessages = async ({ userId, targetUserId, before, limit = 50 }) => {
  await assertConnected(userId, targetUserId);

  const conversationKey = buildConversationKey(userId, targetUserId);
  const userOid = new mongoose.Types.ObjectId(toIdString(userId));
  const query = { conversationKey, deletedFor: { $ne: userOid } };
  if (before) {
    query.createdAt = { $lt: new Date(before) };
  }

  const safeLimit = Math.max(1, Math.min(100, Number(limit) || 50));
  const messages = await Message.find(query).sort({ createdAt: -1 }).limit(safeLimit);

  await Message.updateMany(
    { conversationKey, receiver: userOid, readAt: null },
    { $set: { readAt: new Date() } }
  );

  return [...messages].reverse();
};

export const markConversationRead = async ({ userId, targetUserId }) => {
  const conversationKey = buildConversationKey(userId, targetUserId);
  const userOid = new mongoose.Types.ObjectId(toIdString(userId));
  await Message.updateMany(
    { conversationKey, receiver: userOid, readAt: null },
    { $set: { readAt: new Date() } }
  );
};

export const getTotalUnreadCount = async (userId) => {
  const userOid = new mongoose.Types.ObjectId(toIdString(userId));
  const result = await Message.countDocuments({ 
    receiver: userOid, 
    readAt: null,
    deletedFor: { $ne: userOid }
  });
  return result;
};

export const getConversationList = async (userId) => {
  const userOid = new mongoose.Types.ObjectId(toIdString(userId));
  const userIdStr = toIdString(userId);

  const [activeConversations, blockedByMe, blockedMe] = await Promise.all([
    Conversation.find({
      participants: userOid,
      deletedFor: { $ne: userOid },
    })
      .sort({ lastActivity: -1 })
      .limit(100)
      .populate('participants', 'fullName username profileImageUri city isOnline lastSeenAt'),
    Block.find({ blocker: userOid }).select('blocked').lean(),
    Block.find({ blocked: userOid }).select('blocker').lean(),
  ]);

  const blockedSet = new Set();
  blockedByMe.forEach((b) => blockedSet.add(b.blocked.toString()));
  blockedMe.forEach((b) => blockedSet.add(b.blocker.toString()));

  const unreadRows = await Message.aggregate([
    { $match: { receiver: userOid, readAt: null, deletedFor: { $ne: userOid } } },
    { $group: { _id: '$conversationKey', count: { $sum: 1 } } },
  ]);

  const unreadMap = {};
  for (const row of unreadRows) {
    unreadMap[row._id] = row.count;
  }

  const list = await Promise.all(
    activeConversations.map(async (conv) => {
      const peer = conv.participants.find((p) => toIdString(p._id) !== userIdStr);
      if (!peer) return null;

      const peerIdStr = toIdString(peer._id);
      const peerBlocked = blockedSet.has(peerIdStr);

      const lastMsg = await Message.findOne({
        conversationKey: conv.conversationKey,
        deletedFor: { $ne: userOid },
      }).sort({ createdAt: -1 });

      return {
        conversationKey: conv.conversationKey,
        isBlocked: peerBlocked,
        peer: peerBlocked
          ? {
              _id: peer._id,
              fullName: 'Unknown User',
              username: 'unknown',
              profileImageUri: '',
              city: '',
              isOnline: false,
              lastSeenAt: null,
            }
          : {
              _id: peer._id,
              fullName: peer.fullName,
              username: peer.username,
              profileImageUri: peer.profileImageUri || '',
              city: peer.city || '',
              isOnline: peer.isOnline,
              lastSeenAt: peer.lastSeenAt,
            },
        lastMessage: lastMsg
          ? {
              _id: lastMsg._id,
              sender: lastMsg.sender?._id,
              receiver: lastMsg.receiver?._id,
              ciphertext: lastMsg.ciphertext,
              iv: lastMsg.iv,
              createdAt: lastMsg.createdAt,
              readAt: lastMsg.readAt,
              messageType: lastMsg.messageType || 'text',
              imageUri: lastMsg.imageUri || null,
              isOneTimeView: lastMsg.isOneTimeView || false,
              oneTimeViewedAt: lastMsg.oneTimeViewedAt || null,
            }
          : null,
      };
    })
  );

  return list
    .filter(Boolean)
    .map((item) => ({
      ...item,
      unreadCount: unreadMap[item.conversationKey] || 0,
    }))
    .sort((a, b) => {
      const dateA = a.lastMessage?.createdAt || new Date(0);
      const dateB = b.lastMessage?.createdAt || new Date(0);
      return dateB - dateA;
    });
};

export const reactToMessage = async ({ messageId, userId, emoji }) => {
  const message = await Message.findById(messageId);
  if (!message) {
    const error = new Error('Message not found');
    error.statusCode = 404;
    throw error;
  }

  const userOid = new mongoose.Types.ObjectId(toIdString(userId));
  const isParticipant = message.participants.some(
    (p) => toIdString(p) === toIdString(userId)
  );
  if (!isParticipant) {
    const error = new Error('You are not a participant in this conversation');
    error.statusCode = 403;
    throw error;
  }

  const existingIdx = message.reactions.findIndex(
    (r) => toIdString(r.userId) === toIdString(userId)
  );

  if (existingIdx !== -1) {
    if (message.reactions[existingIdx].emoji === emoji) {
      message.reactions.splice(existingIdx, 1);
    } else {
      message.reactions[existingIdx].emoji = emoji;
      message.reactions[existingIdx].createdAt = new Date();
    }
  } else {
    message.reactions.push({ userId: userOid, emoji, createdAt: new Date() });
  }

  await message.save();
  return message;
};

export const clearChatForUser = async ({ userId, targetUserId }) => {
  const conversationKey = buildConversationKey(userId, targetUserId);
  const userOid = new mongoose.Types.ObjectId(toIdString(userId));

  await Message.updateMany(
    { conversationKey, deletedFor: { $ne: userOid } },
    { $addToSet: { deletedFor: userOid } }
  );
};

export const deleteConversationForUser = async ({ userId, targetUserId }) => {
  const conversationKey = buildConversationKey(userId, targetUserId);
  const userOid = new mongoose.Types.ObjectId(toIdString(userId));

  // 1. Mark for removal from list
  await Conversation.updateOne(
    { conversationKey },
    { $addToSet: { deletedFor: userOid } }
  );

  // 2. Also clear all messages for this user (they won't see them if they restart the chat)
  await Message.updateMany(
    { conversationKey, deletedFor: { $ne: userOid } },
    { $addToSet: { deletedFor: userOid } }
  );
};
