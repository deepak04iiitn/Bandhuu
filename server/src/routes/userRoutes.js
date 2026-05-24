import express from 'express';
import {
  searchUsers,
  getUserProfile,
  getUserPosts,
  sendConnectionRequest,
  respondToConnectionRequest,
  getConnectionRequests,
  getMyConnections,
  removeConnection,
  getMyPosts,
  getMySavedPosts,
  getMyActivitySummary,
} from '../controllers/userController.js';
import {
  blockUser,
  unblockUser,
  getBlockedUsers,
  reportUser,
} from '../controllers/blockReportController.js';
import { protect, requireCompleteProfile } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/search', protect, searchUsers);
router.get('/me/activity-summary', protect, getMyActivitySummary);
router.get('/me/connections', protect, getMyConnections);
router.get('/me/posts', protect, getMyPosts);
router.get('/me/saved-posts', protect, getMySavedPosts);
router.get('/me/blocked', protect, getBlockedUsers);
router.get('/me/connection-requests', protect, getConnectionRequests);
router.post('/:userId/block', protect, blockUser);
router.delete('/:userId/block', protect, unblockUser);
router.post('/:userId/report', protect, reportUser);
router.get('/:userId/posts', protect, getUserPosts);
router.post('/:userId/connection-request', protect, requireCompleteProfile, sendConnectionRequest);
router.post('/:userId/connection-request/respond', protect, respondToConnectionRequest);
router.delete('/:userId/connections', protect, removeConnection);
router.get('/:username', protect, getUserProfile);

export default router;