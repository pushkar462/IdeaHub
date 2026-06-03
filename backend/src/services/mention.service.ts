import prisma from '../config/db';
import { notificationService } from './notification.service';
import { NotificationType } from '@prisma/client';

export class MentionService {
  // Regex to extract @username (3-20 chars alphanumeric + underscore)
  private readonly MENTION_REGEX = /@([a-zA-Z0-9_]{3,20})/g;
  private readonly MAX_MENTIONS = 10;

  /**
   * Parses text for mentions, resolves them case-insensitively,
   * prevents self-mentions, and inserts safely using a transaction.
   */
  public async processMentions(params: {
    text: string;
    authorId: number;
    postId?: number;
    commentId?: number;
  }) {
    const { text, authorId, postId, commentId } = params;

    // 1. Extract matches (unique set to avoid processing same name twice)
    const matches = Array.from(text.matchAll(this.MENTION_REGEX)).map((m) => m[1]);
    const uniqueUsernames = Array.from(new Set(matches)).slice(0, this.MAX_MENTIONS);

    if (uniqueUsernames.length === 0) return;

    // 2. Resolve usernames case-insensitively (e.g. '@ved' matches 'Ved')
    const users = await prisma.user.findMany({
      where: {
        name: { in: uniqueUsernames, mode: 'insensitive' },
      },
      select: { id: true, name: true },
    });

    // 3. Filter out self-mentions
    const targetIds = users.filter((u) => u.id !== authorId).map((u) => u.id);

    if (targetIds.length === 0) return;

    // 4. Execute Transaction to prevent desync (Mentions + Notifications)
    await prisma.$transaction(async (tx) => {
      // a) We rely on the DB constraints (@@unique([mentionedToId, postId])) to prevent dupes.
      // However, createMany doesn't silently ignore conflicts in standard PG unless we use raw queries.
      // We will loop and catch, or since we deduplicated names and filtered author, 
      // the only conflict is if they edit a post and re-mention.
      // For now, we manually filter existing mentions.
      
      const existingMentions = await tx.mention.findMany({
        where: {
          mentionedToId: { in: targetIds },
          ...(postId ? { postId } : { commentId }),
        },
        select: { mentionedToId: true },
      });
      
      const existingIds = new Set(existingMentions.map((m) => m.mentionedToId));
      const newTargetIds = targetIds.filter((id) => !existingIds.has(id));

      if (newTargetIds.length === 0) return;

      // b) Insert Mentions
      await tx.mention.createMany({
        data: newTargetIds.map((id) => ({
          mentionedById: authorId,
          mentionedToId: id,
          postId,
          commentId,
        })),
      });

      // c) Fire Notifications
      for (const id of newTargetIds) {
        await notificationService.createNotification(
          {
            userId: id,
            type: NotificationType.MENTION,
            actorId: authorId,
            postId,
            commentId,
          },
          tx
        );
      }
    });
  }
}

export const mentionService = new MentionService();
