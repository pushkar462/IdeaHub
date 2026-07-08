import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import 'express-async-errors';

import authRoutes from './routes/auth.routes';
import postRoutes from './routes/post.routes';
import commentRoutes from './routes/comment.routes';
import notificationRoutes from './routes/notification.routes';
import archiveRoutes from './routes/archive.routes';
import userRoutes from './routes/user.routes';
import intelligenceRoutes from './routes/v1/intelligence.route';
import departmentRoutes from './routes/v1/department.route';
import adminRoutes from './routes/admin.routes';
import digestRoutes from './routes/digest.routes';
import campaignRoutes from './routes/campaign.routes';
import searchRoutes from './routes/search.routes';
import { errorHandler } from './middleware/error.middleware';
import { tracingMiddleware } from './middleware/tracing.middleware';
import { config } from './config/env.config';

const app = express();

const allowedOrigins = config.CORS_ORIGIN
  ? config.CORS_ORIGIN.split(',').map((o) => o.trim())
  : null;

app.use(tracingMiddleware());
app.use(cors({
  origin: allowedOrigins ?? '*',
  credentials: true,
}));
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files securely
app.use('/uploads', express.static(path.resolve(__dirname, '../../uploads'), {
  setHeaders: (res) => {
    // Prevent MIME-sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // We could force download by default for everything, or conditionally.
    // Setting nosniff prevents browser from interpreting text/plain as HTML.
  }
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/archive', archiveRoutes);
app.use('/api/intelligence', intelligenceRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/digest', digestRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/search',    searchRoutes);

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Global error handler (must be last)
app.use(errorHandler);

export default app;
