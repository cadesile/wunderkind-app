import { apiRequest } from '@/api/client';
import type { ApiInboxResponse, ApiInboxMessage } from '@/types/api';

/**
 * GET /api/inbox
 * Returns the 50 most recent inbox messages.
 */
export async function getInbox(): Promise<ApiInboxResponse> {
  return apiRequest<ApiInboxResponse>('/api/inbox');
}

/**
 * GET /api/inbox/:messageId
 * Returns a single message by ID.
 */
export async function getMessage(messageId: string): Promise<ApiInboxMessage> {
  return apiRequest<ApiInboxMessage>(`/api/inbox/${messageId}`);
}

/**
 * POST /api/inbox/:messageId/accept
 * Accepts an offer message.
 * For sponsor/investor offers this adds funds to the academy balance on the server.
 */
export async function acceptMessage(messageId: string): Promise<{ status: string }> {
  return apiRequest<{ status: string }>(`/api/inbox/${messageId}/accept`, {
    method: 'POST',
  });
}

/**
 * POST /api/inbox/:messageId/reject
 * Rejects an offer message.
 */
export async function rejectMessage(messageId: string): Promise<{ status: string }> {
  return apiRequest<{ status: string }>(`/api/inbox/${messageId}/reject`, {
    method: 'POST',
  });
}

/**
 * POST /api/inbox/:messageId/read
 * Marks a message as read without responding.
 */
export async function markAsRead(messageId: string): Promise<{ status: string }> {
  return apiRequest<{ status: string }>(`/api/inbox/${messageId}/read`, {
    method: 'POST',
  });
}
