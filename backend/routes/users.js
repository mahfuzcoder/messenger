import express from 'express';
import fs from 'node:fs';
import { User } from '../models/User.js';
import { auth, asyncRoute, publicUser } from '../middleware/auth.js';
import { persistFile, removeStoredFile } from '../utils/upload.js';

export function userRoutes(upload) {
  const router = express.Router();
  router.use(auth);

  router.get('/', asyncRoute(async (req, res) => {
    const q = String(req.query.q || '').trim();
    if (q.length < 2) return res.json({ users: [] });
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const users = await User.find({
      _id: { $ne: req.user._id },
      $or: [{ name: { $regex: escaped, $options: 'i' } }, { email: { $regex: escaped, $options: 'i' } }]
    }).limit(20);
    res.json({ users: users.map(publicUser) });
  }));

  router.patch('/me', asyncRoute(async (req, res) => {
    const name = String(req.body.name || '').trim();
    if (name.length < 2 || name.length > 40) return res.status(400).json({ error: 'Name must be 2 to 40 characters.' });
    req.user.name = name;
    await req.user.save();
    res.json({ user: publicUser(req.user) });
  }));

  router.post('/me/avatar', upload.single('file'), asyncRoute(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Choose an image.' });
    if (!req.file.mimetype.startsWith('image/')) {
      fs.unlink(req.file.path, () => {});
      return res.status(415).json({ error: 'Choose an image.' });
    }
    const stored = await persistFile(req.file);
    await removeStoredFile(req.user.avatar); // the replaced photo must not leave an orphan file
    req.user.avatar = stored.url;
    await req.user.save();
    res.json({ user: publicUser(req.user) });
  }));

  return router;
}
