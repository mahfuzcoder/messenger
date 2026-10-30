import express from 'express';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { auth, asyncRoute } from '../middleware/auth.js';
import { persistFile } from '../utils/upload.js';
import { isMember } from './conversations.js';

function emitToMembers(io, conversation, event, payload) {
  for (const member of conversation.members || []) {
    io.to(`user:${member._id || member}`).emit(event, payload);
  }
}

export function messageRoutes(io, upload) {
  const router = express.Router();

  router.post('/conversations/:id/messages', auth, asyncRoute(async (req, res) => {
    const id = req.params.id;
    if (!await isMember(id, req.user._id)) return res.status(403).json({ error: 'You are not a member of this conversation.' });
    const text = String(req.body.text || '').trim();
    const type = ['text', 'image', 'video', 'audio', 'file'].includes(req.body.type) ? req.body.type : 'text';
    const mediaUrl = String(req.body.mediaUrl || '');
    if ((!text && !mediaUrl) || text.length > 4000) return res.status(400).json({ error: 'Message text or media is required.' });
    const message = await Message.create({
      conversation: id,
      sender: req.user._id,
      text,
      type,
      mediaUrl,
      fileName: String(req.body.fileName || '').slice(0, 255),
      readBy: [req.user._id]
    });
    await Conversation.findByIdAndUpdate(id, { lastMessageAt: message.createdAt });
    const result = await message.populate('sender', 'name avatar');
    const conversation = await Conversation.findById(id).populate('members', 'name email avatar');
    emitToMembers(io, conversation, 'message:new', result);
    emitToMembers(io, conversation, 'conversation:updated', { conversationId: id, lastMessage: result });
    res.status(201).json({ message: result });
  }));

  router.delete('/messages/:id', auth, asyncRoute(async (req, res) => {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ error: 'Message not found.' });
    if (String(message.sender) !== String(req.user._id)) return res.status(403).json({ error: 'You can delete only your own messages.' });
    if (!await isMember(message.conversation, req.user._id)) return res.status(403).json({ error: 'You are not a member of this conversation.' });
    message.deleted = true;
    message.text = '';
    message.mediaUrl = '';
    await message.save();
    const conversationId = message.conversation.toString();
    const conversation = await Conversation.findById(conversationId);
    emitToMembers(io, conversation, 'message:deleted', { messageId: message.id, conversationId });
    res.status(204).end();
  }));

  router.post('/upload', auth, upload.single('file'), asyncRoute(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Choose a file to upload.' });
    const stored = await persistFile(req.file);
    res.status(201).json(stored);
  }));

  return router;
}
