import Meetup from '../models/Meetup.js';
import GroupMessage from '../models/GroupMessage.js';
import { getIO } from '../socket/socketServer.js';

const POPULATE_USER = '_id fullName username profileImageUri city isOnline lastSeenAt';

export const createMeetup = async (req, res) => {
  try {
    const { title, details, category, maxMembers, hometown, meetupLocation, venue, date, time } = req.body;
    if (!title?.trim() || !details?.trim()) {
      return res.status(400).json({ message: 'Title and details are required' });
    }
    if (!maxMembers || Number(maxMembers) < 2) {
      return res.status(400).json({ message: 'Max members must be at least 2' });
    }
    if (!date || !time?.trim()) {
      return res.status(400).json({ message: 'Date and time are required' });
    }

    let imageUri = '';
    if (req.file) {
      imageUri = `/uploads/meetup-images/${req.file.filename}`;
    }

    const locationParts = [venue, meetupLocation].filter(Boolean);

    const meetup = await Meetup.create({
      user: req.user._id,
      title: title.trim(),
      details: details.trim(),
      category: category?.trim() || 'Meetup',
      maxMembers: Number(maxMembers),
      hometown: hometown?.trim() || '',
      meetupLocation: meetupLocation?.trim() || '',
      venue: venue?.trim() || '',
      date: new Date(date),
      time: time.trim(),
      location: locationParts.join(', '),
      imageUri,
      members: [req.user._id],
    });

    const populated = await Meetup.findById(meetup._id)
      .populate('user', POPULATE_USER)
      .populate('members', POPULATE_USER);

    return res.status(201).json({ message: 'Meetup created', meetup: populated });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getMeetups = async (req, res) => {
  try {
    const { status, q, date } = req.query;
    const conditions = [];

    if (status) conditions.push({ status });

    if (q?.trim()) {
      const regex = new RegExp(q.trim(), 'i');
      conditions.push({
        $or: [
          { title: regex },
          { details: regex },
          { hometown: regex },
          { venue: regex },
          { meetupLocation: regex },
        ],
      });
    }

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      conditions.push({ date: { $gte: start, $lte: end } });
    }

    const query = conditions.length > 0 ? { $and: conditions } : {};

    const meetups = await Meetup.find(query)
      .populate('user', POPULATE_USER)
      .populate('members', POPULATE_USER)
      .sort({ date: 1 });

    return res.json(meetups);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getMeetupById = async (req, res) => {
  try {
    const meetup = await Meetup.findById(req.params.id)
      .populate('user', POPULATE_USER)
      .populate('members', POPULATE_USER);
    if (!meetup) return res.status(404).json({ message: 'Meetup not found' });
    return res.json(meetup);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getMyMeetups = async (req, res) => {
  try {
    const meetups = await Meetup.find({ members: req.user._id })
      .populate('user', POPULATE_USER)
      .populate('members', POPULATE_USER)
      .sort({ date: 1 });
    return res.json(meetups);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const rsvpMeetup = async (req, res) => {
  try {
    const meetup = await Meetup.findById(req.params.id);
    if (!meetup) return res.status(404).json({ message: 'Meetup not found' });

    const userId = req.user._id.toString();
    if (meetup.members.some(m => m.toString() === userId)) {
      return res.status(400).json({ message: 'Already joined this meetup' });
    }
    if (meetup.members.length >= meetup.maxMembers) {
      return res.status(400).json({ message: 'Meetup is full' });
    }
    if (meetup.status !== 'upcoming') {
      return res.status(400).json({ message: 'Cannot join a completed or cancelled meetup' });
    }

    meetup.members.push(req.user._id);
    await meetup.save();

    const populated = await Meetup.findById(meetup._id)
      .populate('user', POPULATE_USER)
      .populate('members', POPULATE_USER);

    const joinerName = req.user.fullName || req.user.username || 'Someone';
    const sysMsg = await GroupMessage.create({
      meetupId: meetup._id,
      sender: req.user._id,
      ciphertext: `${joinerName} joined the meetup`,
      iv: 'system',
      messageType: 'system',
    });

    const populatedMsg = await GroupMessage.findById(sysMsg._id)
      .populate('sender', '_id fullName username profileImageUri');

    const io = getIO();
    if (io) {
      io.to(`meetup:${meetup._id}`).emit('group:message', {
        _id: populatedMsg._id,
        meetupId: populatedMsg.meetupId,
        sender: populatedMsg.sender,
        ciphertext: populatedMsg.ciphertext,
        iv: 'system',
        messageType: 'system',
        reactions: [],
        createdAt: populatedMsg.createdAt,
        updatedAt: populatedMsg.updatedAt,
      });
    }

    return res.json({ message: 'RSVP successful', meetup: populated });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const leaveMeetup = async (req, res) => {
  try {
    const meetup = await Meetup.findById(req.params.id);
    if (!meetup) return res.status(404).json({ message: 'Meetup not found' });

    const userId = req.user._id.toString();
    if (meetup.user.toString() === userId) {
      return res.status(400).json({ message: 'Creator cannot leave the meetup' });
    }
    if (!meetup.members.some(m => m.toString() === userId)) {
      return res.status(400).json({ message: 'Not a member of this meetup' });
    }

    meetup.members = meetup.members.filter(m => m.toString() !== userId);
    await meetup.save();

    const populated = await Meetup.findById(meetup._id)
      .populate('user', POPULATE_USER)
      .populate('members', POPULATE_USER);

    return res.json({ message: 'Left meetup', meetup: populated });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const updateMeetup = async (req, res) => {
  try {
    const meetup = await Meetup.findById(req.params.id);
    if (!meetup) return res.status(404).json({ message: 'Meetup not found' });
    if (meetup.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this meetup' });
    }

    const { title, details, category, location, maxMembers, hometown, meetupLocation, venue, date, time, status } = req.body;
    if (typeof title === 'string') meetup.title = title.trim();
    if (typeof details === 'string') meetup.details = details.trim();
    if (typeof category === 'string') meetup.category = category.trim();
    if (typeof location === 'string') meetup.location = location.trim();
    if (maxMembers) meetup.maxMembers = Number(maxMembers);
    if (typeof hometown === 'string') meetup.hometown = hometown.trim();
    if (typeof meetupLocation === 'string') meetup.meetupLocation = meetupLocation.trim();
    if (typeof venue === 'string') meetup.venue = venue.trim();
    if (date) meetup.date = new Date(date);
    if (typeof time === 'string') meetup.time = time.trim();
    if (status && ['upcoming', 'completed', 'cancelled'].includes(status)) meetup.status = status;

    const updated = await meetup.save();
    const populated = await Meetup.findById(updated._id)
      .populate('user', POPULATE_USER)
      .populate('members', POPULATE_USER);

    return res.json({ message: 'Meetup updated', meetup: populated });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const deleteMeetup = async (req, res) => {
  try {
    const meetup = await Meetup.findById(req.params.id);
    if (!meetup) return res.status(404).json({ message: 'Meetup not found' });
    if (meetup.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this meetup' });
    }

    await Meetup.deleteOne({ _id: meetup._id });
    return res.json({ message: 'Meetup deleted' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
