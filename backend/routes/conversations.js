import express from 'express';
import fs from 'node:fs';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { auth, asyncRoute } from '../middleware/auth.js';
import { persistFile, removeStoredFile } from '../utils/upload.js';

// Membership test shared with the socket layer and message routes.
export async function isMember(conversationId, userId) {
  return Boolean(await Conversation.exists({ _id: conversationId, members: userId }));
}

// Adds the caller's last message and unread count to a conversation document.
async function serializeConversation(conversation, userId) {
  const lastMessage = await Message.findOne({ conversation: conversation._id, deleted: false }).sort({ createdAt: -1 }).populate('sender', 'name avatar');
  const unreadCount = await Message.countDocuments({
    conversation: conversation._id,
    sender: { $ne: userId },
    readBy: { $ne: userId },
    deleted: false
  });
  return { ...conversation.toObject(), id: conversation._id, lastMessage, unreadCount };
}

// Builds the conversation router; io and upload are injected by server.js (photo endpoint).
export function conversationRoutes(io, upload) {
  const router = express.Router();
  router.use(auth);

  // Lists my conversations, newest activity first, each with last message + unread count.
  router.get('/', asyncRoute(async (req, res) => {
    const conversations = await Conversation.find({ members: req.user._id }).sort({ lastMessageAt: -1 }).populate('members', 'name email avatar');
    const rows = await Promise.all(conversations.map((conversation) => serializeConversation(conversation, req.user._id)));
    res.json({ conversations: rows });
  }));

  // Creates (or reopens) the private conversation with another user.
  router.post('/', asyncRoute(async (req, res) => {
    const recipientId = String(req.body.recipientId || '');
    if (!mongoose.isValidObjectId(recipientId) || recipientId === req.user.id) return res.status(400).json({ error: 'Choose a valid recipient.' });
    if (!await User.exists({ _id: recipientId })) return res.status(404).json({ error: 'User not found.' });
    let conversation = await Conversation.findOne({ type: 'private', members: { $all: [req.user._id, recipientId], $size: 2 } });
    if (!conversation) conversation = await Conversation.create({ type: 'private', members: [req.user._id, recipientId] });
    await conversation.populate('members', 'name email avatar');
    res.status(201).json({ conversation: await serializeConversation(conversation, req.user._id) });
  }));

  // Creates a group chat owned by the caller.
  router.post('/group', asyncRoute(async (req, res) => {
    const name = String(req.body.name || '').trim();
    const ids = [...new Set((Array.isArray(req.body.memberIds) ? req.body.memberIds : []).map(String))];
    if (name.length < 2 || name.length > 60 || ids.length < 2 || ids.some((id) => !mongoose.isValidObjectId(id))) {
      return res.status(400).json({ error: 'Provide a group name and at least two valid members.' });
    }
    const memberIds = [...new Set([req.user.id, ...ids])];
    const count = await User.countDocuments({ _id: { $in: memberIds } });
    if (count !== memberIds.length) return res.status(400).json({ error: 'One or more members do not exist.' });
    const conversation = await Conversation.create({ type: 'group', name, members: memberIds, admin: req.user._id });
    await conversation.populate('members', 'name email avatar');
    res.status(201).json({ conversation: await serializeConversation(conversation, req.user._id) });
  }));

  // Replaces the group photo (any member may) and pushes it to every member without a reload.
  router.post('/:id/avatar', upload.single('file'), asyncRoute(async (req, res) => {
    // multer has already written the temp file — remove it on every rejection path
    const reject = (status, error) => {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(status).json({ error });
    };
    if (!mongoose.isValidObjectId(req.params.id)) return reject(404, 'Conversation not found.');
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return reject(404, 'Conversation not found.');
    if (!conversation.members.some((id) => String(id) === String(req.user._id))) return reject(403, 'You are not a member of this conversation.');
    if (conversation.type !== 'group') return reject(403, 'Only group chats have a photo.');
    if (!req.file) return reject(400, 'Choose an image.');
    if (!req.file.mimetype.startsWith('image/')) return reject(415, 'Choose an image.');
    const stored = await persistFile(req.file);
    await removeStoredFile(conversation.avatar); // replaced photo must not leave an orphan file
    conversation.avatar = stored.url;
    await conversation.save();
    for (const member of conversation.members) {
      io.to(`user:${member}`).emit('conversation:updated', { conversationId: conversation._id, avatar: conversation.avatar });
    }
    await conversation.populate('members', 'name email avatar');
    res.json({ conversation: await serializeConversation(conversation, req.user._id) });
  }));

  // Paginated message history: 50 newest messages per page, oldest pages via ?page=2, 3…
  router.get('/:id/messages', asyncRoute(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Conversation not found.' });
    if (!await isMember(req.params.id, req.user._id)) return res.status(403).json({ error: 'You are not a member of this conversation.' });
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const messages = await Message.find({ conversation: req.params.id }).sort({ createdAt: -1 }).skip((page - 1) * 50).limit(50).populate('sender', 'name avatar');
    res.json({ messages, page, hasMore: messages.length === 50 });
  }));

  // Group members (private conversations return their two participants).
  router.get('/:id/members', asyncRoute(async (req, res) => {
    if (!await isMember(req.params.id, req.user._id)) return res.status(403).json({ error: 'You are not a member of this conversation.' });
    const conversation = await Conversation.findById(req.params.id).populate('members', 'name email avatar');
    if (!conversation) return res.status(404).json({ error: 'Conversation not found.' });
    res.json({ members: conversation.members });
  }));

  return router;
}
