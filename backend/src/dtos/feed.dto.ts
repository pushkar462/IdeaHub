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
  filename: string;
  mimeType: string;
};

export type FeedCardDTO = {
  id: number;
  title: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  authorId: number;
  author: AuthorDTO;
  assignee: AuthorDTO | null;
  attachments: AttachmentDTO[];
  replyCount: number;
  reactionCount: number;
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
    attachments?: Pick<Attachment, 'id' | 'url' | 'filename' | 'mimeType'>[];
    _count?: { comments: number; reactions?: number };
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
  updatedAt: post.updatedAt,
  authorId: post.authorId,
  author: mapToAuthorDTO(post.author),
  assignee: post.assignee ? mapToAuthorDTO(post.assignee) : null,
  attachments: (post.attachments ?? []).map((a) => ({
    id: a.id,
    url: a.url,
    filename: a.filename,
    mimeType: a.mimeType,
  })),
  replyCount: post._count?.comments || 0,
  reactionCount: post._count?.reactions || 0,
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
