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
export type PostType = 'QUESTION' | 'PROBLEM' | 'IDEA';
export type PostSection = 'BILLS' | 'INVOICING' | 'PATIENTS' | 'CASES' | 'PARTNERS' | 'HOSPITALS' | 'DOCTORS' | 'WHATSAPP' | 'PLATFORM' | 'GENERAL';
export type PostStatus = 'OPEN' | 'DISCUSSING' | 'RESOLVED';

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
  postNumber: string;
  title: string;
  description: string;
  type: PostType;
  section: PostSection;
  status: PostStatus;
  resolution?: string;
  resolutionReason?: string;
  isUseCase: boolean;
  linkedEntityType?: 'BILL' | 'CASE' | 'PARTNER';
  linkedEntityId?: string;
  buildIssueUrl?: string | null;
  campaignId?: number | null;
  campaign?: { id: number; title: string; status: 'ACTIVE' | 'CLOSED' } | null;
  acknowledgedAt?: string;
  createdAt: string;
  updatedAt: string;
  author: User;
  authorId: number;
  owner?: User;
  ownerId?: number;
  departmentId?: number;
  department?: { id: number; name: string; slug: string };
  workflowMetrics?: {
    slaStatus: 'HEALTHY' | 'AT_RISK' | 'BREACHED';
    aiSummaryCache?: any;
  } | null;
  reactions: Reaction[];
  comments?: Comment[];
  attachments?: Attachment[];
  _count?: { comments: number; reactions?: number; votes?: number };
  replyCount?: number;
  reactionCount?: number;
  voteCount?: number;
  hasVoted?: boolean;
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
  isCanonical?: boolean;
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
