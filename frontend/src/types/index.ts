// ── User ──────────────────────────────────────────────
export type UserRole = 'ADMIN' | 'FOUNDER' | 'FRONTEND' | 'BACKEND' | 'DEVOPS' | 'AI_ML';

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  bio?: string;
  createdAt: string;
  _count?: { posts: number; comments: number };
}

// ── Post ──────────────────────────────────────────────
export type PostCategory =
  | 'BUG'
  | 'IMPROVEMENT'
  | 'SUGGESTION'
  | 'FEATURE'
  | 'IDEA'
  | 'DISCUSSION'
  | 'PROBLEM';

export type PostStatus = 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'BLOCKED' | 'DONE';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Reaction {
  id: number;
  emoji: string;
  userId: number;
  postId?: number;
  commentId?: number;
}

export interface Attachment {
  id: number;
  url: string;
  filename: string;
  mimeType: string;
}

export interface Post {
  id: number;
  title: string;
  description: string;
  category: PostCategory;
  status: PostStatus;
  priority: Priority;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  author: User;
  authorId: number;
  assignee?: User;
  assigneeId?: number;
  departmentId?: number;
  department?: { id: number; name: string; slug: string };
  workflowMetrics?: {
    slaStatus: 'HEALTHY' | 'AT_RISK' | 'BREACHED';
    totalTimeBlocked: number;
    aiSummaryCache?: any;
  } | null;
  reactions: Reaction[];
  comments?: Comment[];
  attachments?: Attachment[];
  _count?: { comments: number; reactions?: number };
  replyCount?: number;
  reactionCount?: number;
}

// ── Comment ───────────────────────────────────────────
export interface Comment {
  id: number;
  content: string;
  createdAt: string;
  updatedAt: string;
  authorId: number;
  author: User;
  postId: number;
  parentId?: number;
  reactions: Reaction[];
  replies?: Comment[];
}

// ── Notification ──────────────────────────────────────
export interface Notification {
  id: number;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
  userId: number;
}
