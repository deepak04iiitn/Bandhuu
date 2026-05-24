import User from '../models/User.js';
import Post from '../models/Post.js';
import Meetup from '../models/Meetup.js';
import { createNotification } from '../services/notificationService.js';
import { getBlockedIdSet } from './blockReportController.js';

const userSummarySelect =
  '_id fullName username profileImageUri occupationType gender city state country hometownCity hometownState hometownCountry organization studyOrPost bio isOnline lastSeenAt';

const includesId = (list = [], id) =>
  list.some((item) => item?.toString() === id?.toString());

const connectionStatusBetween = (currentUser, targetUserId) => {
  if (!currentUser || !targetUserId) return 'none';
  if (currentUser._id?.toString() === targetUserId?.toString()) return 'self';
  if (includesId(currentUser.connections, targetUserId)) return 'connected';
  if (includesId(currentUser.connectionRequestsSent, targetUserId)) return 'request_sent';
  if (includesId(currentUser.connectionRequestsReceived, targetUserId)) return 'request_received';
  return 'none';
};

// @desc    Search users by username or name
// @route   GET /api/users/search
// @access  Private
export const searchUsers = async (req, res) => {
  try {
    const { q, hometown, city, gender } = req.query;
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 5;

    const blockedIds = await getBlockedIdSet(req.user._id);
    const excludeIds = [req.user._id.toString(), ...blockedIds];

    const filter = { _id: { $nin: excludeIds } };

    if (q?.trim()) {
      const rx = new RegExp(q.trim(), 'i');
      filter.$or = [
        { username:    rx },
        { fullName:    rx },
        { hometownCity: rx },
        { city:        rx },
      ];
    }
    if (hometown?.trim()) filter.hometownCity = { $regex: hometown.trim(), $options: 'i' };
    if (city?.trim())     filter.city         = { $regex: city.trim(),     $options: 'i' };
    if (gender?.trim())   filter.gender       = gender.trim();

    // require at least one filter or search term
    if (!q?.trim() && !hometown?.trim() && !city?.trim() && !gender?.trim()) {
      return res.json({ users: [], hasMore: false, total: 0 });
    }

    const currentUser = await User.findById(req.user._id).select(
      '_id connections connectionRequestsSent connectionRequestsReceived'
    );

    const [users, total] = await Promise.all([
      User.find(filter).select(userSummarySelect).skip((page - 1) * limit).limit(limit),
      User.countDocuments(filter),
    ]);

    const usersWithStatus = users.map((u) => ({
      ...u.toObject(),
      connectionStatus: connectionStatusBetween(currentUser, u._id),
    }));

    res.json({ users: usersWithStatus, hasMore: total > page * limit, total });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get user profile by username
// @route   GET /api/users/:username
// @access  Private
export const getUserProfile = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id).select(
      '_id connections connectionRequestsSent connectionRequestsReceived'
    );
    const user = await User.findOne({ username: req.params.username })
      .select(`${userSummarySelect} connections`);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const blockedIds = await getBlockedIdSet(req.user._id);
    if (blockedIds.has(user._id.toString())) {
      return res.status(404).json({ message: 'User not found' });
    }

    const [postsCount, meetupsCount] = await Promise.all([
      Post.countDocuments({ user: user._id }),
      Meetup.countDocuments({ user: user._id }),
    ]);
    const totalYaaris = user.connections?.length || 0;

    res.json({
      ...user.toObject(),
      connectionStatus: connectionStatusBetween(currentUser, user._id),
      postsCount,
      meetupsCount,
      yaariCount: totalYaaris,
      connectionsCount: totalYaaris,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Send a connection request to a user
// @route   POST /api/users/:userId/connection-request
// @access  Private
export const sendConnectionRequest = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    if (currentUserId.toString() === userId) {
      return res.status(400).json({ message: 'You cannot connect with yourself' });
    }

    const [currentUser, targetUser] = await Promise.all([
      User.findById(currentUserId),
      User.findById(userId),
    ]);

    if (!targetUser) return res.status(404).json({ message: 'Target user not found' });
    if (!currentUser) return res.status(404).json({ message: 'Current user not found' });

    if (includesId(currentUser.connections, targetUser._id)) {
      return res.status(400).json({ message: 'You are already connected' });
    }

    if (includesId(currentUser.connectionRequestsSent, targetUser._id)) {
      return res.status(200).json({ message: 'Connection request already sent' });
    }

    currentUser.connectionRequestsSent.push(targetUser._id);
    targetUser.connectionRequestsReceived.push(currentUser._id);

    await Promise.all([currentUser.save(), targetUser.save()]);
    await createNotification({
      recipientId: targetUser._id,
      actorId: currentUser._id,
      type: 'connection_request',
      message: `${currentUser.fullName} sent you a connection request`,
      entityType: 'user',
      entityId: currentUser._id,
    });

    return res.status(200).json({ message: 'Connection request sent' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Respond to a connection request (accept or decline)
// @route   POST /api/users/:userId/connection-request/respond
// @access  Private
export const respondToConnectionRequest = async (req, res) => {
  try {
    const { userId } = req.params; // requester
    const { action } = req.body;
    const currentUserId = req.user._id;

    if (!['accept', 'decline'].includes(action)) {
      return res.status(400).json({ message: 'Action must be accept or decline' });
    }

    const [currentUser, requester] = await Promise.all([
      User.findById(currentUserId),
      User.findById(userId),
    ]);

    if (!requester) return res.status(404).json({ message: 'Requesting user not found' });
    if (!currentUser) return res.status(404).json({ message: 'Current user not found' });

    if (!includesId(currentUser.connectionRequestsReceived, requester._id)) {
      return res.status(400).json({ message: 'No pending request from this user' });
    }

    currentUser.connectionRequestsReceived = currentUser.connectionRequestsReceived.filter(
      (id) => id.toString() !== requester._id.toString()
    );
    requester.connectionRequestsSent = requester.connectionRequestsSent.filter(
      (id) => id.toString() !== currentUser._id.toString()
    );

    if (action === 'accept') {
      if (!includesId(currentUser.connections, requester._id)) {
        currentUser.connections.push(requester._id);
      }
      if (!includesId(requester.connections, currentUser._id)) {
        requester.connections.push(currentUser._id);
      }
    }

    await Promise.all([currentUser.save(), requester.save()]);
    if (action === 'accept') {
      await createNotification({
        recipientId: requester._id,
        actorId: currentUser._id,
        type: 'connection_accepted',
        message: `${currentUser.fullName} accepted your connection request`,
        entityType: 'user',
        entityId: currentUser._id,
      });
    }

    return res.status(200).json({
      message: action === 'accept' ? 'Connection request accepted' : 'Connection request declined',
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get incoming connection requests (notification feed)
// @route   GET /api/users/me/connection-requests
// @access  Private
export const getConnectionRequests = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'connectionRequestsReceived',
      select: '_id fullName username profileImageUri city state hometownCity hometownState occupationType',
    });

    if (!user) return res.status(404).json({ message: 'User not found' });

    return res.json({
      incoming: user.connectionRequestsReceived || [],
      count: user.connectionRequestsReceived?.length || 0,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get all connections for current user
// @route   GET /api/users/me/connections
// @access  Private
export const getMyConnections = async (req, res) => {
  try {
    const { q } = req.query;
    const populateOptions = {
      path: 'connections',
      select: '_id fullName username profileImageUri city state hometownCity hometownState occupationType isOnline lastSeenAt',
    };
    if (q?.trim()) {
      const regex = new RegExp(q.trim(), 'i');
      populateOptions.match = {
        $or: [
          { fullName: regex },
          { username: regex },
          { hometownCity: regex },
          { city: regex },
        ],
      };
    }

    const user = await User.findById(req.user._id).populate(populateOptions);
    if (!user) return res.status(404).json({ message: 'User not found' });

    return res.json({
      connections: user.connections || [],
      count: user.connections?.length || 0,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Remove a connection
// @route   DELETE /api/users/:userId/connections
// @access  Private
export const removeConnection = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    const [currentUser, targetUser] = await Promise.all([
      User.findById(currentUserId),
      User.findById(userId),
    ]);

    if (!targetUser) return res.status(404).json({ message: 'Target user not found' });
    if (!currentUser) return res.status(404).json({ message: 'Current user not found' });

    currentUser.connections = currentUser.connections.filter(
      (id) => id.toString() !== targetUser._id.toString()
    );
    targetUser.connections = targetUser.connections.filter(
      (id) => id.toString() !== currentUser._id.toString()
    );

    await Promise.all([currentUser.save(), targetUser.save()]);

    return res.status(200).json({ message: 'Connection removed' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get current user's posts (normal + meetup when available)
// @route   GET /api/users/me/posts
// @access  Private
export const getMyPosts = async (req, res) => {
  try {
    const [posts, meetups] = await Promise.all([
      Post.find({ user: req.user._id })
        .populate('user', '_id username fullName profileImageUri')
        .sort({ createdAt: -1 }),
      Meetup.find({ user: req.user._id })
        .populate('user', '_id username fullName profileImageUri')
        .populate('members', '_id username fullName profileImageUri')
        .sort({ createdAt: -1 }),
    ]);

    const normalizedPosts = posts.map((p) => ({
      ...p.toObject(),
      kind: 'Post',
    }));
    const normalizedMeetups = meetups.map((m) => ({
      ...m.toObject(),
      kind: 'Meetup',
    }));
    const combined = [...normalizedPosts, ...normalizedMeetups].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    return res.json({
      posts: combined,
      count: combined.length,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get current user's saved posts
// @route   GET /api/users/me/saved-posts
// @access  Private
export const getMySavedPosts = async (req, res) => {
  try {
    const savedPosts = await Post.find({ savedBy: req.user._id })
      .populate('user', '_id username fullName profileImageUri')
      .sort({ createdAt: -1 });

    return res.json({
      posts: savedPosts,
      count: savedPosts.length,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get public posts for a specific user (for profile preview)
// @route   GET /api/users/:userId/posts
// @access  Private
export const getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 6, 20);

    const posts = await Post.find({ user: userId })
      .select('_id title category imageUri createdAt likes')
      .sort({ createdAt: -1 })
      .limit(limit);

    return res.json({ posts, count: posts.length });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Activity summary for account UI
// @route   GET /api/users/me/activity-summary
// @access  Private
export const getMyActivitySummary = async (req, res) => {
  try {
    const [user, postsCount, meetupsCount, savedCount] = await Promise.all([
      User.findById(req.user._id).select('connections'),
      Post.countDocuments({ user: req.user._id }),
      Meetup.countDocuments({ user: req.user._id }),
      Post.countDocuments({ savedBy: req.user._id }),
    ]);

    if (!user) return res.status(404).json({ message: 'User not found' });

    return res.json({
      connections: user.connections?.length || 0,
      posts: postsCount + meetupsCount,
      savedPosts: savedCount,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server Error' });
  }
};