import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError, failureMessage, UNAUTHORIZED_EVENT } from './client';

/** The data an answer can rest on, as the answer names it ("[resume]"). */
export type AssistantSource = 'facts' | 'profile' | 'resume' | 'job' | 'fit' | 'h1b' | 'tracker';

export const SOURCE_LABELS: Record<AssistantSource, string> = {
  facts: 'Application details',
  profile: 'Profile',
  resume: 'Resume',
  job: 'The posting',
  fit: 'Fit review',
  h1b: 'H-1B data',
  tracker: 'Tracker',
};

export interface AssistantThread {
  id: number;
  job_id: number | null;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface AssistantMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  sources: AssistantSource[];
  created_at: string;
}

export interface AssistantThreads {
  threads: AssistantThread[];
  daily_limit?: number;
  questions_left?: number;
  enabled?: boolean;
}

export function useAssistantThreads(jobId?: number) {
  return useQuery({
    queryKey: ['assistant', 'threads', jobId ?? null],
    queryFn: () => api<AssistantThreads>(`/api/assistant/threads${jobId ? `?job_id=${jobId}` : ''}`),
  });
}

export function useAssistantThread(id: number | null) {
  return useQuery({
    queryKey: ['assistant', 'thread', id],
    queryFn: () => api<{ thread: AssistantThread; messages: AssistantMessage[] }>(`/api/assistant/threads/${id}`),
    enabled: id != null,
  });
}

export function useDeleteThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api<void>(`/api/assistant/threads/${id}`, { method: 'DELETE' }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['assistant'] }),
  });
}

export function useDeleteAllThreads() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<void>('/api/assistant/threads', { method: 'DELETE' }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['assistant'] }),
  });
}

export interface AskHandlers {
  onThread?: (t: { thread_id: number; title: string; job_id: number | null }) => void;
  onDelta?: (text: string) => void;
}

export interface AskResult {
  message_id: number;
  content: string;
  sources: AssistantSource[];
  cut_short?: boolean;
}

/**
 * Asks Wera a question and reads the streamed answer: the thread first,
 * then pieces of the answer as they come, and the saved answer at the end.
 * Errors before the stream starts come back as ApiError, like api().
 */
export async function askAssistant(
  body: { message: string; thread_id?: number; job_id?: number },
  handlers: AskHandlers = {},
  signal?: AbortSignal,
): Promise<AskResult> {
  const res = await fetch('/api/assistant', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify(body),
    signal,
  });
  if (res.status === 401) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  if (!res.ok || !res.body) throw new ApiError(res.status, failureMessage(res, await res.text().catch(() => '')));
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buf = '';
  let done: AskResult | null = null;
  for (;;) {
    const { value, done: end } = await reader.read();
    if (value) buf += value;
    let cut: number;
    while ((cut = buf.indexOf('\n\n')) >= 0) {
      const block = buf.slice(0, cut);
      buf = buf.slice(cut + 2);
      let event = 'message';
      let data = '';
      for (const line of block.split('\n')) {
        if (line.startsWith('event: ')) event = line.slice(7);
        else if (line.startsWith('data: ')) data += line.slice(6);
      }
      if (!data) continue;
      const parsed = JSON.parse(data) as Record<string, unknown>;
      if (event === 'thread') handlers.onThread?.(parsed as unknown as { thread_id: number; title: string; job_id: number | null });
      else if (event === 'delta') handlers.onDelta?.(typeof parsed.text === 'string' ? parsed.text : '');
      else if (event === 'done') done = parsed as unknown as AskResult;
      else if (event === 'error') throw new ApiError(502, typeof parsed.error === 'string' ? parsed.error : 'The AI service did not answer; try again');
    }
    if (end) break;
  }
  if (!done) throw new ApiError(502, 'The answer was cut off; try again');
  return done;
}

/** Splits an answer into text and the [source] tags it names, for showing them as chips. */
export function answerParts(text: string): ({ text: string } | { source: AssistantSource })[] {
  const out: ({ text: string } | { source: AssistantSource })[] = [];
  const re = /\s?\[(facts|profile|resume|job|fit|h1b|tracker)\]/g;
  let at = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > at) out.push({ text: text.slice(at, m.index) });
    out.push({ source: m[1] as AssistantSource });
    at = m.index + m[0].length;
  }
  if (at < text.length) out.push({ text: text.slice(at) });
  return out;
}
