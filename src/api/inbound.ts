import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

// Email replies (#192): a forwarding address and the suggestions it brings.

export interface InboundSetup {
  available: boolean;
  address: string | null;
  setup: {
    created_at: string;
    last_email_at: string | null;
    confirm_code: string | null;
    confirm_url: string | null;
    confirm_at: string | null;
  } | null;
}

export function useInboundAddress() {
  return useQuery({ queryKey: ['inbound-address'], queryFn: () => api<InboundSetup>('/api/inbound-address') });
}

export function useSetInboundAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (on: boolean) => api<InboundSetup>('/api/inbound-address', { method: on ? 'POST' : 'DELETE' }),
    onSuccess: (data) => qc.setQueryData(['inbound-address'], data),
  });
}

export type ReplyKind = 'rejection' | 'offer' | 'interview' | 'assessment' | 'received';

export interface EmailSuggestion {
  id: number;
  job_id: number;
  company: string;
  title: string;
  current_status: string;
  kind: ReplyKind;
  status: 'applied' | 'interviewing' | 'offer' | 'rejected';
  from_domain: string;
  subject: string;
  received_at: string;
}

export function useEmailSuggestions(enabled = true) {
  return useQuery({
    queryKey: ['email-suggestions'],
    queryFn: () => api<{ suggestions: EmailSuggestion[] }>('/api/email-suggestions'),
    enabled,
  });
}

export function useDecideSuggestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, accept }: { id: number; accept: boolean }) =>
      api<void>(`/api/email-suggestions/${id}/${accept ? 'accept' : 'dismiss'}`, { method: 'POST' }),
    onMutate: ({ id }) => {
      qc.setQueryData<{ suggestions: EmailSuggestion[] }>(['email-suggestions'], (d) => d && { suggestions: d.suggestions.filter((s) => s.id !== id) });
    },
    onSettled: (_d, _e, { accept }) => {
      void qc.invalidateQueries({ queryKey: ['email-suggestions'] });
      if (accept) for (const key of ['jobs', 'today', 'tracker', 'stats', 'job']) void qc.invalidateQueries({ queryKey: [key] });
    },
  });
}
