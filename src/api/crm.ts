import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from './client';

export interface JobContact {
  id: number;
  job_id: number;
  name: string;
  role: string;
  email: string;
  linkedin_url: string;
  notes: string;
  last_contacted_at: string | null;
  follow_up_at: string | null;
  created_at: string;
  updated_at: string;
  job_title?: string;
  company?: string;
  company_id?: number;
  application_status?: string | null;
}

export interface ContactPatch {
  name?: string;
  role?: string;
  email?: string;
  linkedin_url?: string;
  notes?: string;
  last_contacted_at?: string | null;
  follow_up_at?: string | null;
}

export interface OfferBenchmark {
  employer_filings: number;
  employer_median_wage: number | null;
  title_median_wage: number | null;
  title_low_wage: number | null;
  title_high_wage: number | null;
  title_filings: number;
  period?: { from: string; to: string };
}

export interface JobOffer {
  job_id: number;
  base_salary: number | null;
  bonus_pct: number | null;
  annual_equity: number | null;
  sign_on: number | null;
  currency: string;
  work_mode: string;
  location: string;
  deadline_at: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
  job_title?: string;
  company?: string;
  company_id?: number;
  application_status?: string | null;
  annual_total: number | null;
  first_year_total: number | null;
  benchmark: OfferBenchmark | null;
}

export interface OfferInput {
  base_salary: number | null;
  bonus_pct: number | null;
  annual_equity: number | null;
  sign_on: number | null;
  currency?: string;
  work_mode?: string;
  location?: string;
  deadline_at?: string | null;
  notes?: string;
}

export function useJobContacts(jobId: number) {
  return useQuery({
    queryKey: ['job-contacts', jobId],
    queryFn: () => api<{ contacts: JobContact[] }>(`/api/jobs/${jobId}/contacts`),
    retry: false,
  });
}

export function useAllContacts() {
  return useQuery({
    queryKey: ['all-contacts'],
    queryFn: () => api<{ contacts: JobContact[] }>('/api/contacts'),
  });
}

export function useAddJobContact(jobId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ContactPatch) =>
      api<JobContact>(`/api/jobs/${jobId}/contacts`, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['job-contacts', jobId] });
      void qc.invalidateQueries({ queryKey: ['all-contacts'] });
    },
  });
}

export function usePatchJobContact(jobId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ cid, ...body }: ContactPatch & { cid: number }) =>
      api<JobContact>(`/api/jobs/${jobId}/contacts/${cid}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['job-contacts', jobId] });
      void qc.invalidateQueries({ queryKey: ['all-contacts'] });
    },
  });
}

export function useDeleteJobContact(jobId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cid: number) => api<void>(`/api/jobs/${jobId}/contacts/${cid}`, { method: 'DELETE' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['job-contacts', jobId] });
      void qc.invalidateQueries({ queryKey: ['all-contacts'] });
    },
  });
}

export function useJobOffer(jobId: number) {
  return useQuery({
    queryKey: ['job-offer', jobId],
    queryFn: async () => {
      try {
        return await api<JobOffer>(`/api/jobs/${jobId}/offer`);
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    },
    retry: false,
  });
}

export function useAllOffers() {
  return useQuery({
    queryKey: ['all-offers'],
    queryFn: () => api<{ offers: JobOffer[] }>('/api/offers'),
  });
}

export function useSaveJobOffer(jobId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: OfferInput) =>
      api<JobOffer>(`/api/jobs/${jobId}/offer`, { method: 'PUT', body: JSON.stringify(body) }),
    onSuccess: (saved) => {
      qc.setQueryData(['job-offer', jobId], saved);
      void qc.invalidateQueries({ queryKey: ['all-offers'] });
    },
  });
}

export function useDeleteJobOffer(jobId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<void>(`/api/jobs/${jobId}/offer`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.setQueryData(['job-offer', jobId], null);
      void qc.invalidateQueries({ queryKey: ['all-offers'] });
    },
  });
}
