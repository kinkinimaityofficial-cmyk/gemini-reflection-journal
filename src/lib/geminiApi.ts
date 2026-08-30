import { ChatMessage, ReflectionMode } from '../types';

export interface ReflectApiResponse {
  success: boolean;
  response: string;
  modelUsed: string;
  attempts: string[];
}

export interface SummarizeTitleResponse {
  success: boolean;
  title: string;
  tags: string[];
  modelUsed?: string;
}

/**
 * Call server-side Gemini reflection endpoint
 */
export async function sendReflectionPrompt(
  prompt: string,
  mode: ReflectionMode,
  history: ChatMessage[]
): Promise<ReflectApiResponse> {
  const payload = {
    prompt: prompt.trim(),
    mode,
    history: history.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  };

  const res = await fetch('/api/gemini/reflect', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Server responded with status ${res.status}`);
  }

  return await res.json();
}

/**
 * Generate smart title and tags based on entry content
 */
export async function generateEntryMetadata(content: string): Promise<SummarizeTitleResponse> {
  const res = await fetch('/api/gemini/summarize-title', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });

  if (!res.ok) {
    return {
      success: false,
      title: 'Personal Reflection',
      tags: ['reflection', 'journal'],
    };
  }

  return await res.json();
}
