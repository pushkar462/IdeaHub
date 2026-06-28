import { socket } from './socket';
import { useNotificationStore } from '@/stores/notification.store';
import { usePostStore } from '@/stores/post.store';
import toast from 'react-hot-toast';

// To prevent toast spam
let lastToastTime = 0;
const TOAST_COOLDOWN = 3000; // 3 seconds

/**
 * Transforms a raw socket notification DTO into the frontend's Notification shape.
 * The backend socket emits: {id, type, metadata, createdAt, readAt, actorId, postId, commentId}
 * The frontend expects:      {id, type, message, read, createdAt, userId}
 */
function transformSocketNotification(dto: any) {
  const typeMessages: Record<string, string> = {
    MENTION: 'Someone mentioned you in a comment.',
    ASSIGNMENT: 'You have been assigned to a post.',
    COMMENT_REPLY: 'Someone replied to your comment.',
    POST_UPDATE: 'A post you follow was updated.',
  };

  return {
    id: dto.id,
    type: dto.type,
    message: typeMessages[dto.type] ?? 'You have a new notification.',
    read: dto.readAt !== null && dto.readAt !== undefined,
    createdAt: dto.createdAt,
    userId: 0, // Not needed for display, but satisfies the type
  };
}

export const bindSocketEvents = () => {
  // Ensure strict cleanup before binding to avoid duplicates
  unbindSocketEvents();

  socket.on('notification:new', (notification) => {
    // 1. Transform raw DTO to frontend shape and update state
    const formatted = transformSocketNotification(notification);
    useNotificationStore.getState().addNotification(formatted);
    
    // 2. Throttled UI Alert
    const now = Date.now();
    if (now - lastToastTime > TOAST_COOLDOWN) {
      toast.success(formatted.message, { id: 'new-notification' });
      lastToastTime = now;
    }
  });

  // BUG 1 FIX: Changed from 'workflow:status:changed' to 'workflow:statusChanged'
  // to match the backend's SOCKET_EVENTS.WORKFLOW_STATUS_CHANGED constant
  socket.on('workflow:statusChanged', (payload: { postId: number; status: string; departmentId: number; ownerId: number | null }) => {
    // Optimistically update the store if the post is in feed or current
    usePostStore.getState().optimisticUpdate(payload.postId, {
      status: payload.status as any,
      ownerId: payload.ownerId === null ? undefined : payload.ownerId
    });
    usePostStore.getState().fetchStats();
  });

  socket.on('timeline:new', (timelineEvent) => {
    // Optional: Could append to a timeline store if we had one active
    console.log('Timeline event:', timelineEvent);
  });

  socket.on('workflow:summary_generated', (payload: { postId: number; aiSummary: any }) => {
    const currentPost = usePostStore.getState().current;
    if (currentPost && currentPost.id === payload.postId) {
      usePostStore.getState().optimisticUpdate(payload.postId, {
        workflowMetrics: {
          ...currentPost.workflowMetrics,
          slaStatus: currentPost.workflowMetrics?.slaStatus || 'HEALTHY',
          aiSummaryCache: payload.aiSummary
        }
      });
      toast.success('AI Summary Generated', { id: `summary-${payload.postId}` });
    }
  });
};

export const unbindSocketEvents = () => {
  socket.off('notification:new');
  socket.off('workflow:statusChanged');
  socket.off('timeline:new');
  socket.off('workflow:summary_generated');
};
