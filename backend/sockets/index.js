import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Message } from '../models/Message.js';
import { isMember } from '../routes/conversations.js';

const onlineUsers = new Map();

export function registerSockets(io) {
  io.use(async (socket, next) => {
    try {
      const headerCookie = socket.handshake.headers.cookie?.split(';').map((part) => part.trim()).find((part) => part.startsWith('token='))?.slice(6);
      const token = socket.handshake.auth?.token || headerCookie;
      if (!token) return next(new Error('Authentication required'));
      const payload = jwt.verify(decodeURIComponent(token), process.env.JWT_SECRET);
      const user = await User.findById(payload.sub).select('_id name avatar');
      if (!user) return next(new Error('Authentication required'));
      socket.user = user;
      next();
    } catch {
      next(new Error('Authentication required'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;
    socket.join(`user:${userId}`);
    const count = onlineUsers.get(userId) || 0;
    onlineUsers.set(userId, count + 1);
    if (!count) io.emit('presence:update', { userId, online: true });
    socket.emit('presence:snapshot', { onlineUserIds: [...onlineUsers.keys()] });

    socket.on('conversation:join', async (conversationId, done) => {
      try {
        if (await isMember(conversationId, userId)) {
          socket.join(conversationId);
          if (typeof done === 'function') done({ ok: true });
        } else if (typeof done === 'function') done({ ok: false });
      } catch {
        if (typeof done === 'function') done({ ok: false });
      }
    });

    socket.on('message:read', async (conversationId) => {
      if (!await isMember(conversationId, userId)) return;
      await Message.updateMany(
        { conversation: conversationId, sender: { $ne: userId }, readBy: { $ne: userId }, deleted: false },
        { $addToSet: { readBy: userId } }
      );
      io.to(conversationId).emit('message:read', { conversationId, userId });
      io.to(`user:${userId}`).emit('conversation:updated', { conversationId, unreadCount: 0 });
    });

    socket.on('typing', async (conversationId) => {
      if (!await isMember(conversationId, userId)) return;
      socket.to(conversationId).emit('typing', { conversationId, userId, name: socket.user.name });
    });

    socket.on('typing:stop', async (conversationId) => {
      if (!await isMember(conversationId, userId)) return;
      socket.to(conversationId).emit('typing:stop', { conversationId, userId });
    });

    socket.on('disconnect', () => {
      const remaining = (onlineUsers.get(userId) || 1) - 1;
      if (remaining <= 0) {
        onlineUsers.delete(userId);
        io.emit('presence:update', { userId, online: false });
      } else onlineUsers.set(userId, remaining);
    });
  });
}
