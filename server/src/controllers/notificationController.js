import Notification from '../models/Notification.js';
import User from '../models/User.js';

// @desc    Get notifications for current user
// @route   GET /api/notifications
// @access  Private
export const getMyNotifications = async (req, res) => {
  try {
    const { type } = req.query;
    const notifFilter = { recipient: req.user._id };
    if (type) {
      const types = type.split(',').map((t) => t.trim()).filter(Boolean);
      if (types.length > 0) notifFilter.type = { $in: types };
    }

    const [notifications, user] = await Promise.all([
      Notification.find(notifFilter)
        .sort({ createdAt: -1 })
        .limit(100)
        .populate('actor', '_id fullName username profileImageUri city'),
      User.findById(req.user._id).select('connectionRequestsReceived'),
    ]);

    const pendingRequestSet = new Set(
      (user?.connectionRequestsReceived || []).map((id) => id.toString())
    );

    const mapped = notifications.map((n) => {
      const raw = n.toObject();
      const actorId = raw.actor?._id?.toString();
      return {
        ...raw,
        isRead: !!raw.readAt,
        actionable:
          raw.type === 'connection_request'
            ? pendingRequestSet.has(actorId)
            : false,
      };
    });

    return res.json({
      notifications: mapped,
      count: mapped.length,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Get unread notifications count
// @route   GET /api/notifications/unread-count
// @access  Private
export const getUnreadNotificationsCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.user._id,
      readAt: null,
    });
    return res.json({ count });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const now = new Date();
    await Notification.updateMany(
      { recipient: req.user._id, readAt: null },
      { $set: { readAt: now } }
    );
    return res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};