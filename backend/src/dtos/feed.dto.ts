import { Post, Comment, User, Reaction, Attachment } from '@prisma/client';

export type AuthorDTO = {
  id: number;
  name: string;
  role: string;
  avatarUrl: string | null;
};

export type AttachmentDTO = {
  id: number;
  url: string;
  filename: string; // The sanitized original filename
};

export type FeedCardDTO = {
  id: number;
  title: string;
  description: string; // A feed card might truncate this if needed, but we pass the full string for now
  category: string;
  status: string;
  priority: string;
  tags: string[];
  createdAt: Date;
  author: AuthorDTO;
  assignee: AuthorDTO | null;
  replyCount: number;
  department?: { id: number; name: string; slug: string } | null;
  workflowMetrics?: { slaStatus: string; totalTimeBlocked: number } | null;
  // Intentionally excludes full comment tree, raw internal payload blobs, etc.
};

export type CommentDTO = {
  id: number;
  content: string;
  createdAt: Date;
  author: AuthorDTO;
  replyCount: number;
  parentId: number | null;
};

// ----------------------------------------------------------------------
// Mappers
// ----------------------------------------------------------------------

export const mapToAuthorDTO = (user: Pick<User, 'id' | 'name' | 'role' | 'avatarUrl'>): AuthorDTO => ({
  id: user.id,
  name: user.name,
  role: user.role,
  avatarUrl: user.avatarUrl,
});

export const mapToFeedCardDTO = (
  post: Post & {
    author: Pick<User, 'id' | 'name' | 'role' | 'avatarUrl'>;
    assignee: Pick<User, 'id' | 'name' | 'role' | 'avatarUrl'> | null;
    _count?: { comments: number };
  }
): FeedCardDTO => ({
  id: post.id,
  title: post.title,
  description: post.description,
  category: post.category,
  status: post.status,
  priority: post.priority,
  tags: post.tags,
  createdAt: post.createdAt,
  author: mapToAuthorDTO(post.author),
  assignee: post.assignee ? mapToAuthorDTO(post.assignee) : null,
  replyCount: post._count?.comments || 0,
  department: (post as any).department ?? null,
  workflowMetrics: (post as any).workflowMetrics ?? null,
});

export const mapToCommentDTO = (
  comment: Comment & {
    author: Pick<User, 'id' | 'name' | 'role' | 'avatarUrl'>;
    _count?: { replies: number };
  }
): CommentDTO => ({
  id: comment.id,
  content: comment.content,
  createdAt: comment.createdAt,
  author: mapToAuthorDTO(comment.author),
  replyCount: comment._count?.replies || 0,
  parentId: comment.parentId,
});
