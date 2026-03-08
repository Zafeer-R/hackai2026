import { flags, mockDelays } from '@/lib/config';
import type { ChatResponse } from '@/lib/types/chat';
import chatResponses from '@/mocks/chat-responses.json';

let mockIndex = 0;

export async function sendChatMessage(
  sessionId: string,
  message: string,
  userProfile: unknown
): Promise<ChatResponse> {
  if (flags.useMocks) {
    await new Promise(r => setTimeout(r, mockDelays.chatReply));
    const response = chatResponses[Math.min(mockIndex, chatResponses.length - 1)] as ChatResponse;
    mockIndex++;
    return response;
  }

  const { endpoints } = await import('@/lib/config');
  const res = await fetch(endpoints.chat.sendMessage, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, message, user_profile: userProfile }),
  });
  return res.json();
}

export function resetChatMockIndex(to: number = 0) {
  mockIndex = to;
}
