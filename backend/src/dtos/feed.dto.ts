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
  postNumber: string;
  title: string;
  description: string;
  type: string;
  section: string;
  status: string;
  resolution: string | null;
  createdAt: Date;
  updatedAt: Date;
  authorId: number;
  author: AuthorDTO;
  owner: AuthorDTO | null;
  attachments: AttachmentDTO[];
  replyCount: number;
  reactionCount: number;
  voteCount: number;
  hasVoted: boolean;
  department?: { id: number; name: string; slug: string } | null;
  campaign?: { id: number; title: string; status: string } | null;
  workflowMetrics?: { slaStatus: string } | null;
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
    owner: Pick<User, 'id' | 'name' | 'role' | 'avatarUrl'> | null;
    attachments?: Pick<Attachment, 'id' | 'url' | 'filename' | 'mimeType'>[];
    _count?: { comments: number; reactions?: number; votes?: number };
    votes?: { userId: number }[];
  },
  viewerId?: number,
): FeedCardDTO => ({
  id: post.id,
  postNumber: post.postNumber,
  title: post.title,
  description: post.description,
  type: post.type,
  section: post.section,
  status: post.status,
  resolution: post.resolution,
  createdAt: post.createdAt,
  updatedAt: post.updatedAt,
  authorId: post.authorId,
  author: mapToAuthorDTO(post.author),
  owner: post.owner ? mapToAuthorDTO(post.owner) : null,
  attachments: (post.attachments ?? []).map((a) => ({
    id: a.id,
    url: a.url,
    filename: a.filename,
    mimeType: a.mimeType,
  })),
  replyCount: post._count?.comments || 0,
  reactionCount: post._count?.reactions || 0,
  voteCount: post._count?.votes ?? 0,
  hasVoted: viewerId ? (post.votes ?? []).some((v) => v.userId === viewerId) : false,
  department: (post as any).department ?? null,
  campaign: (post as any).campaign
    ? { id: (post as any).campaign.id, title: (post as any).campaign.title, status: (post as any).campaign.status }
    : null,
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
