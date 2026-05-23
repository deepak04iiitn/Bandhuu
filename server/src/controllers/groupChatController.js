import mongoose from 'mongoose';
import GroupMessage from '../models/GroupMessage.js';
import GroupReadReceipt from '../models/GroupReadReceipt.js';
import Meetup from '../models/Meetup.js';
import { getIO } from '../socket/socketServer.js';

const POPULATE_SENDER = '_id fullName username profileImageUri';

const mapGroupMessage = (msg, viewerId) => {
  const m = msg.toObject ? msg.toObject() : msg;
  const viewedBy = (m.oneTimeViewedBy || []).map(id => id.toString());
  return {
    _id: m._id,
    meetupId: m.meetupId,
    sender: m.sender,
    ciphertext: m.ciphertext,
    iv: m.iv,
    messageType: m.messageType || 'text',
    imageUri: m.imageUri || null,
    isOneTimeView: m.isOneTimeView || false,
    oneTimeViewedAt: viewerId && viewedBy.includes(viewerId.toString()) ? true : false,
    replyTo: m.replyTo || null,
    replySnippet: m.replySnippet || null,
    reactions: m.reactions || [],
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  };
};

const assertMember = async (meetupId, userId) => {
  const meetup = await Meetup.findById(meetupId);
  if (!meetup) return { error: 'Meetup not found', status: 404 };
  const isMember = meetup.members.some(m => m.toString() === userId.toString());
  if (!isMember) return { error: 'Not a member of this meetup', status: 403 };
  return { meetup };
};

export const getGroupMessages = async (req, res) => {
  try {
    const { meetupId } = req.params;
    const { before, limit = 50 } = req.query;
    const check = await assertMember(meetupId, req.user._id);
    if (check.error) return res.status(check.status).json({ message: check.error });

    const query = { meetupId: new mongoose.Types.ObjectId(meetupId) };
    if (before) query.createdAt = { $lt: new Date(before) };

    const safeLimit = Math.max(1, Math.min(100, Number(limit)));
    const messages = await GroupMessage.find(query)
      .sort({ createdAt: -1 })
      .limit(safeLimit)
      .populate('sender', POPULATE_SENDER)
      .populate('replyTo');

    const mapped = messages.reverse().map(m => mapGroupMessage(m, req.user._id));
    return res.json(mapped);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const sendGroupMessage = async (req, res) => {
  try {
    const { meetupId } = req.params;
    const { ciphertext, iv, replyTo, replySnippet } = req.body;
    const check = await assertMember(meetupId, req.user._id);
    if (check.error) return res.status(check.status).json({ message: check.error });

    if (!ciphertext || !iv) {
      return res.status(400).json({ message: 'ciphertext and iv are required' });
    }

    const msg = await GroupMessage.create({
      meetupId,
      sender: req.user._id,
      ciphertext,
      iv,
      messageType: 'text',
      replyTo: replyTo || null,
      replySnippet: replySnippet || null,
    });

    const populated = await GroupMessage.findById(msg._id)
      .populate('sender', POPULATE_SENDER);

    const mapped = mapGroupMessage(populated, req.user._id);
    const io = getIO();
    if (io) {
      io.to(`meetup:${meetupId}`).emit('group:message', mapped);
    }

    return res.status(201).json(mapped);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const sendGroupImage = async (req, res) => {
  try {
    const { meetupId } = req.params;
    const { ciphertext, iv, isOneTimeView } = req.body;
    const check = await assertMember(meetupId, req.user._id);
    if (check.error) return res.status(check.status).json({ message: check.error });

    if (!req.file) {
      return res.status(400).json({ message: 'Image file is required' });
    }

    const imageUri = `/uploads/chat-images/${req.file.filename}`;

    const msg = await GroupMessage.create({
      meetupId,
      sender: req.user._id,
      ciphertext: ciphertext || 'image',
      iv: iv || 'image',
      messageType: 'image',
      imageUri,
      isOneTimeView: isOneTimeView === 'true' || isOneTimeView === true,
    });

    const populated = await GroupMessage.findById(msg._id)
      .populate('sender', POPULATE_SENDER);

    const mapped = mapGroupMessage(populated, req.user._id);
    const io = getIO();
    if (io) {
      io.to(`meetup:${meetupId}`).emit('group:message', mapped);
    }

    return res.status(201).json(mapped);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const markGroupOneTimeViewed = async (req, res) => {
  try {
    const { messageId } = req.params;
    const msg = await GroupMessage.findById(messageId);
    if (!msg) return res.status(404).json({ message: 'Message not found' });

    const check = await assertMember(msg.meetupId, req.user._id);
    if (check.error) return res.status(check.status).json({ message: check.error });

    if (!msg.isOneTimeView) {
      return res.status(400).json({ message: 'Not a one-time view message' });
    }

    const userId = req.user._id.toString();
    const alreadyViewed = msg.oneTimeViewedBy.some(id => id.toString() === userId);
    if (!alreadyViewed) {
      msg.oneTimeViewedBy.push(req.user._id);
      await msg.save();
    }

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getGroupChatSummaries = async (req, res) => {
  try {
    const userId = req.user._id;
    const meetups = await Meetup.find({ members: userId }).select('_id');
    const meetupIds = meetups.map(m => m._id);

    const [results, receipts] = await Promise.all([
      GroupMessage.aggregate([
        { $match: { meetupId: { $in: meetupIds } } },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: '$meetupId',
            lastMessage: { $first: '$$ROOT' },
            totalCount: { $sum: 1 },
          },
        },
      ]),
      GroupReadReceipt.find({ meetupId: { $in: meetupIds }, userId }),
    ]);

    const receiptMap = {};
    for (const r of receipts) {
      receiptMap[r.meetupId.toString()] = r.lastReadAt;
    }

    const unreadCounts = await Promise.all(
      meetupIds.map(async (mid) => {
        const lastRead = receiptMap[mid.toString()];
        if (!lastRead) {
          const count = await GroupMessage.countDocuments({ meetupId: mid });
          return { meetupId: mid.toString(), count };
        }
        const count = await GroupMessage.countDocuments({
          meetupId: mid,
          createdAt: { $gt: lastRead },
          sender: { $ne: userId },
        });
        return { meetupId: mid.toString(), count };
      })
    );

    const unreadMap = {};
    for (const u of unreadCounts) {
      unreadMap[u.meetupId] = u.count;
    }

    const summaries = {};
    for (const meetup of meetups) {
      const mid = meetup._id;
      const key = mid.toString();
      const result = results.find(r => r._id.toString() === key);
      
      summaries[key] = {
        meetupId: mid,
        lastMessage: result?.lastMessage ? {
          _id: result.lastMessage._id,
          ciphertext: result.lastMessage.ciphertext,
          iv: result.lastMessage.iv,
          messageType: result.lastMessage.messageType,
          sender: result.lastMessage.sender,
          createdAt: result.lastMessage.createdAt,
        } : null,
        totalCount: result?.totalCount || 0,
        unreadCount: unreadMap[key] || 0,
      };
    }

    return res.json(summaries);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const markGroupAsRead = async (req, res) => {
  try {
    const { meetupId } = req.params;
    const userId = req.user._id;

    await GroupReadReceipt.findOneAndUpdate(
      { meetupId, userId },
      { lastReadAt: new Date() },
      { upsert: true, new: true }
    );

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const reactToGroupMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    if (!emoji) return res.status(400).json({ message: 'Emoji is required' });

    const msg = await GroupMessage.findById(messageId);
    if (!msg) return res.status(404).json({ message: 'Message not found' });

    const check = await assertMember(msg.meetupId, req.user._id);
    if (check.error) return res.status(check.status).json({ message: check.error });

    const userId = req.user._id.toString();
    const existingIdx = msg.reactions.findIndex(r => r.userId.toString() === userId);

    if (existingIdx >= 0) {
      if (msg.reactions[existingIdx].emoji === emoji) {
        msg.reactions.splice(existingIdx, 1);
      } else {
        msg.reactions[existingIdx].emoji = emoji;
        msg.reactions[existingIdx].createdAt = new Date();
      }
    } else {
      msg.reactions.push({ userId: req.user._id, emoji });
    }

    await msg.save();

    const io = getIO();
    if (io) {
      io.to(`meetup:${msg.meetupId}`).emit('group:reaction', {
        messageId: msg._id,
        reactions: msg.reactions,
      });
    }

    return res.json({ reactions: msg.reactions });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
