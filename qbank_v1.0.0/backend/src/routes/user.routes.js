// src/routes/user.routes.js
const express = require('express');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();
const prisma = new PrismaClient();

// All user routes require authentication
router.use(authenticate);

// GET /api/users — list users (admin only)
router.get('/', authorize('super_admin', 'academic_admin'), async (req, res, next) => {
  try {
    const { role, isActive, search } = req.query;
    const where = {};
    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) where.OR = [
      { fullName: { contains: search } },
      { email: { contains: search } },
    ];
    const users = await prisma.user.findMany({
      where,
      select: { id: true, email: true, fullName: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (err) { next(err); }
});

// GET /api/users/students — list student users for session assignment
router.get('/students', authorize('super_admin', 'academic_admin', 'exam_creator'), async (req, res, next) => {
  try {
    const students = await prisma.user.findMany({
      where: { role: 'student', isActive: true },
      select: { id: true, email: true, fullName: true },
      orderBy: { fullName: 'asc' },
    });
    res.json(students);
  } catch (err) { next(err); }
});

// POST /api/users — create user (super_admin only)
router.post('/', authorize('super_admin'), async (req, res, next) => {
  try {
    const { email, password, fullName, role } = req.body;
    if (!email || !password || !fullName || !role) {
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc.' });
    }
    const validRoles = ['super_admin', 'academic_admin', 'teacher', 'exam_creator', 'student'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Vai trò không hợp lệ.' });
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email đã được sử dụng.' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash, fullName, role },
      select: { id: true, email: true, fullName: true, role: true, isActive: true, createdAt: true },
    });
    res.status(201).json(user);
  } catch (err) { next(err); }
});

// PUT /api/users/:id — update user
router.put('/:id', authorize('super_admin'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { fullName, role, isActive, password } = req.body;
    const updateData = {};
    if (fullName) updateData.fullName = fullName;
    if (role) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (password) updateData.passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, email: true, fullName: true, role: true, isActive: true, createdAt: true },
    });
    res.json(user);
  } catch (err) { next(err); }
});

// DELETE /api/users/:id
router.delete('/:id', authorize('super_admin'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (id === req.user.id) return res.status(400).json({ error: 'Không thể xóa tài khoản đang đăng nhập.' });
    await prisma.user.update({ where: { id }, data: { isActive: false } });
    res.json({ message: 'Đã vô hiệu hóa tài khoản.' });
  } catch (err) { next(err); }
});

module.exports = router;
