import express from 'express';
import {
  getUnreadCount,
  listConversationMessages,
  listMyConversations,
  readConversation,
  sendMessage,
  sendImageMessage,
  viewOneTimeMsg,
  clearChat,
  deleteConversation,
} from '../controllers/chatController.js';
import { protect } from '../middleware/authMiddleware.js';
import { handleChatImageUpload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/unread-count', getUnreadCount);
router.get('/conversations', listMyConversations);
router.get('/:userId/messages', listConversationMessages);
router.post('/:userId/messages', sendMessage);
router.post('/:userId/image', handleChatImageUpload, sendImageMessage);
router.post('/one-time-view/:messageId', viewOneTimeMsg);
router.put('/:userId/read', readConversation);
router.delete('/:userId', clearChat);
router.delete('/:userId/conversation', deleteConversation);

export default router;