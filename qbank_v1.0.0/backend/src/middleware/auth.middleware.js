// src/middleware/auth.middleware.js
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Chưa xác thực. Vui lòng đăng nhập.' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Tài khoản không hợp lệ hoặc đã bị vô hiệu.' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token không hợp lệ hoặc đã hết hạn.' });
  }
};

// Role-based authorization: pass allowed roles
exports.authorize = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Chưa xác thực.' });
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Bạn không có quyền thực hiện thao tác này.' });
  }
  next();
};

const ROLE_HIERARCHY = {
  super_admin: 5,
  academic_admin: 4,
  exam_creator: 3,
  teacher: 2,
  student: 1,
};

exports.authorizeMinRole = (minRole) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Chưa xác thực.' });
  const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
  const minLevel = ROLE_HIERARCHY[minRole] || 99;
  if (userLevel < minLevel) {
    return res.status(403).json({ error: 'Bạn không có quyền thực hiện thao tác này.' });
  }
  next();
};
