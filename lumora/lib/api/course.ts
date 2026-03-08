import { env } from '@/lib/config';
import type { ChapterContent } from '@/lib/types/course';

const BASE = env.apiBaseUrl;

interface GenerateCourseParams {
  goal: string;
  roadmap: { modules: Array<{ title: string; chapters: Array<{ title: string }> }> };
  userId?: string;
  expertise?: string;
}

export async function generateCourse(params: GenerateCourseParams): Promise<string> {
  const res = await fetch(`${BASE}/api/v1/course/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
    },
    body: JSON.stringify({
      goal: params.goal,
      roadmap: params.roadmap,
      user_id: params.userId || 'default-user',
      expertise: params.expertise || 'beginner',
    }),
  });

  if (!res.ok) {
    throw new Error(`Course generation failed: ${res.status}`);
  }

  const data = await res.json();
  return data.course_id;
}

interface StreamCallbacks {
  onChapterReady: (moduleIdx: number, chapterIdx: number, content: ChapterContent) => void;
  onChapterFailed: (moduleIdx: number, chapterIdx: number, error: string) => void;
  onComplete: () => void;
  onError?: (error: string) => void;
}

/**
 * Stream course chapters via SSE using fetch-based ReadableStream.
 * Uses fetch (not EventSource) so we can send custom headers for ngrok.
 */
export async function streamCourse(courseId: string, callbacks: StreamCallbacks): Promise<void> {
  const url = `${BASE}/api/v1/course/${courseId}/stream`;

  try {
    const res = await fetch(url, {
      headers: {
        'Accept': 'text/event-stream',
        'ngrok-skip-browser-warning': 'true',
      },
    });

    if (!res.ok) {
      callbacks.onError?.(`Stream failed: ${res.status}`);
      callbacks.onComplete();
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) {
      callbacks.onError?.('No readable stream');
      callbacks.onComplete();
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Parse SSE events from the buffer
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // keep incomplete last line in buffer

      let currentEvent = '';
      let currentData = '';

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith('data: ')) {
          currentData += line.slice(6);
        } else if (line === '' && currentEvent) {
          // Empty line = end of event
          try {
            if (currentEvent === 'chapter_ready') {
              const parsed = JSON.parse(currentData);
              callbacks.onChapterReady(parsed.module_idx, parsed.chapter_idx, parsed.content);
            } else if (currentEvent === 'chapter_failed') {
              const parsed = JSON.parse(currentData);
              callbacks.onChapterFailed(parsed.module_idx, parsed.chapter_idx, parsed.error || 'Unknown error');
            } else if (currentEvent === 'course_complete') {
              callbacks.onComplete();
              reader.cancel();
              return;
            }
          } catch (e) {
            console.error('Failed to parse SSE event:', currentEvent, e);
          }
          currentEvent = '';
          currentData = '';
        }
      }
    }

    // Stream ended without course_complete — mark complete anyway
    callbacks.onComplete();
  } catch (err) {
    console.error('SSE stream error:', err);
    callbacks.onError?.(String(err));
    callbacks.onComplete();
  }
}
