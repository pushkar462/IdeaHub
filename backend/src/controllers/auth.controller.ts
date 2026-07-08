import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { StatusCodes } from 'http-status-codes';
import prisma from '../config/db';
import { JwtPayload } from '../utils/jwt';
import { AppError } from '../utils/AppError';
import { successResponse } from '../utils/response.util';
import { config } from '../config/env.config';

/* ---------- REGISTER ---------- */
export const register = async (req: Request, res: Response) => {
  const { email, password, name, role, bio, avatarUrl } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError('Email already registered', StatusCodes.CONFLICT, 'EMAIL_EXISTS');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, passwordHash, name, role, bio, avatarUrl },
  });

  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  };
  
  const token = jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: '7d',
  });

  return successResponse(res, 'Registration successful', {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      createdAt: user.createdAt,
    },
  }, {}, StatusCodes.CREATED);
};

/* ---------- LOGIN ---------- */
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError('Invalid credentials', StatusCodes.UNAUTHORIZED, 'INVALID_CREDENTIALS');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new AppError('Invalid credentials', StatusCodes.UNAUTHORIZED, 'INVALID_CREDENTIALS');
  }

  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  };
  
  const token = jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: '7d',
  });

  return successResponse(res, 'Login successful', {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      createdAt: user.createdAt,
    },
  });
};

/* ---------- GET ME ---------- */
export const getMe = async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatarUrl: true,
      bio: true,
      createdAt: true,
      _count: { select: { posts: true, comments: true } },
    },
  });
  return successResponse(res, 'User profile retrieved', user);
};

/* ---------- UPDATE PROFILE ---------- */
export const updateProfile = async (req: Request, res: Response) => {
  const { name, bio, avatarUrl } = req.body;
  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: { name, bio, avatarUrl },
    select: {
      id: true, email: true, name: true, role: true,
      avatarUrl: true, bio: true, createdAt: true,
    },
  });
  return successResponse(res, 'Profile updated successfully', user);
};

/* ---------- GET USER BY ID ---------- */
export const getUserById = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, email: true, name: true, role: true,
      avatarUrl: true, bio: true, createdAt: true,
      _count: { select: { posts: true, comments: true } },
    },
  });
  
  if (!user) {
    throw new AppError('User not found', StatusCodes.NOT_FOUND, 'USER_NOT_FOUND');
  }
  
  return successResponse(res, 'User retrieved', user);
};

/* ---------- LIST ALL USERS ---------- */
export const listUsers = async (req: Request, res: Response) => {
  const search = req.query.search as string;
  const limitParam = Number(req.query.limit);
  const take = !isNaN(limitParam) && limitParam > 0 ? Math.min(limitParam, 100) : 10;

  const where = search ? {
    name: {
      contains: search,
      mode: 'insensitive' as const,
    }
  } : {};

  const users = await prisma.user.findMany({
    where,
    select: { id: true, name: true, role: true, avatarUrl: true, email: true },
    orderBy: { name: 'asc' },
    take,
  });
  return successResponse(res, 'Users retrieved', users);
};

/* ---------- LIST USERS FOR ROLE MANAGEMENT (Admin/Founder only) ---------- */
export const listUsersForManagement = async (req: Request, res: Response) => {
  if (req.user!.role !== 'FOUNDER' && req.user!.role !== 'ADMIN') {
    throw new AppError('Forbidden. Admin access required.', StatusCodes.FORBIDDEN, 'FORBIDDEN');
  }

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, avatarUrl: true, createdAt: true },
    orderBy: { name: 'asc' },
  });
  return successResponse(res, 'Users retrieved', users);
};

/* ---------- UPDATE USER ROLE (Admin/Founder only) ---------- */
export const updateUserRole = async (req: Request, res: Response) => {
  if (req.user!.role !== 'FOUNDER' && req.user!.role !== 'ADMIN') {
    throw new AppError('Forbidden. Admin access required.', StatusCodes.FORBIDDEN, 'FORBIDDEN');
  }

  const id = Number(req.params.id);
  const { role } = req.body;

  if (isNaN(id)) {
    throw new AppError('Invalid user ID', StatusCodes.BAD_REQUEST, 'INVALID_ID');
  }

  if (id === req.user!.id) {
    throw new AppError('You cannot change your own role.', StatusCodes.BAD_REQUEST, 'SELF_ROLE_CHANGE');
  }

  const targetUser = await prisma.user.findUnique({ where: { id } });
  if (!targetUser) {
    throw new AppError('User not found', StatusCodes.NOT_FOUND, 'USER_NOT_FOUND');
  }

  // Prevent demoting the only founder (if changing away from FOUNDER)
  if (targetUser.role === 'FOUNDER' && role !== 'FOUNDER') {
    const founderCount = await prisma.user.count({ where: { role: 'FOUNDER' } });
    if (founderCount <= 1) {
      throw new AppError('Cannot change role of the only founder account.', StatusCodes.BAD_REQUEST, 'LAST_FOUNDER');
    }
  }

  const user = await prisma.user.update({
    where: { id },
    data: { role },
    select: { id: true, name: true, email: true, role: true, avatarUrl: true, createdAt: true },
  });

  return successResponse(res, 'Role updated successfully', user);
};
