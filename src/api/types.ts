// Hand-written from real API responses saved in src/api/__fixtures__
// (FRONTEND_PLAN.md section 2). Field names are exactly what the API returns.

export type AppStatus =
  | 'saved'
  | 'applied'
  | 'interviewing'
  | 'offer'
  | 'rejected'
  | 'not_interested';

/** Why the user passed on a job (Not interested), when they said. */
export type DismissReason = 'too_senior' | 'too_junior' | 'location' | 'field' | 'company' | 'pay' | 'other';

/** A scored job's parts of fit, each 0-10, and whether something rules it out. */
export interface FitParts {
  role: number;
  seniority: number;
  skills: number;
  domain: number;
  location: number;
  blocker: boolean;
}

/** The one person an application is with. Link is an email address or a URL. */
export interface Contact {
  name: string;
  role: string;
  link: string;
}

export type EventKind = 'phone_screen' | 'interview' | 'onsite' | 'assessment' | 'offer_call' | 'other';

/** A dated step in an application: an interview, a screen, a take-home due. */
export interface AppEvent {
  id: number;
  job_id: number;
  at: string;
  kind: EventKind;
  with: string;
  notes: string;
  /** The job's, in lists across jobs. */
  title?: string;
  company?: string;
}

/** An in-app notice. */
export interface AppNotification {
  id: number;
  kind: 'strong_matches' | 'posting_closed' | 'reminder' | 'followed_company';
  job_id: number | null;
  title: string;
  body: string;
  /** A reminder's time: shown in the user's own zone. */
  at: string | null;
  created_at: string;
  read_at: string | null;
}

/** A named set of Jobs filters: query is the Jobs page's query string. */
export interface SavedSearch {
  id: number;
  name: string;
  query: string;
  created_at: string;
}

/** How a user's applications are going (GET /api/analytics/applications). */
export interface AppAnalytics {
  now: Record<string, number>;
  reached: { applied: number; interviewing: number; offer: number };
  weeks: { week: string; applied: number; responded: number; interview: number }[];
  sources: { source: string; applied: number; responded: number; interview: number }[];
  /** The same by resume sent: tailored, base, upload or unknown (older APIs leave it out). */
  resumes?: { source: string; applied: number; responded: number; interview: number }[];
  days_to_interview: number | null;
  days_to_offer: number | null;
}

/** A company's page (GET /api/companies/{id}); h1b is H1BDetail or null. */
export interface CompanyPageData {
  id: number;
  name: string;
  industry: string;
  ats: string;
  logo_url?: string;
  hidden: boolean;
  followed: boolean;
  open_jobs: number;
  /** How many open matches the user has there; matches lists the best of them. */
  match_count?: number;
  matches: Job[];
  roles: { id: number; title: string; location: string; url: string; posted_at: string | null; first_seen_at: string; match: boolean }[];
  sponsorship: Record<string, number>;
  h1b: unknown;
}

export interface Job {
  id: number;
  company_id: number;
  company: string;
  industry: string;
  source: string;
  ext_id: string;
  title: string;
  location_raw: string | null;
  is_remote: boolean | null;
  url: string;
  department: string | null;
  posted_at: string | null;
  first_seen_at: string;
  stage: string;
  matched_categories: string[];
  exclude_reason: string | null;
  exclude_evidence: string | null;
  fit_score: number | null;
  verdict: string | null;
  seniority: string | null;
  years_required: number | null;
  sponsorship: 'yes' | 'unknown' | 'no' | null;
  // "unknown" when the posting does not say.
  work_mode: 'remote' | 'hybrid' | 'onsite' | 'unknown' | null;
  location_summary: string | null;
  skills_matched: string[] | null;
  skills_missing: string[] | null;
  reason: string | null;
  application_status: AppStatus | null;
  application_notes: string | null;
  /** The tracker's next step on this application, and when it's due. */
  next_step?: string | null;
  next_step_at?: string | null;
  contact?: Contact | null;
  /** Set when the application is archived: off the board, history kept. */
  archived_at?: string | null;
  /** The resume (and letter) that went with the application: the user's word, else what the extension attached. */
  resume_used?: { kind: '' | 'tailored' | 'base' | 'upload'; name: string; letter: boolean; by: 'you' | 'extension' } | null;
  /**
   * Shown until the full AI score arrives: the AI's quick grade when
   * estimate_ai, else a local relevance estimate (35..85).
   */
  estimated_score: number | null;
  /** The estimate is the AI's quick grade (absent on older servers). */
  estimate_ai?: boolean;
  /** When the Chrome extension last filled an application for it (absent on older servers). */
  autofilled_at?: string | null;
  /** When the posting came down (null: still open). */
  closed_at?: string | null;
  /** The pay the posting states (min = max for one figure); null when it states none. */
  pay_min?: number | null;
  pay_max?: number | null;
  pay_currency?: string | null;
  pay_period?: 'hour' | 'year' | null;
  /** The ratings (0-10) the fit score was computed from; null for older scores. */
  fit_parts?: FitParts | null;
  /** Posted in the last three days and found by Wera within a day of it: applying now is early. */
  early?: boolean;
  /** Where Wera serves the company's logo; absent when it has none. */
  logo_url?: string;
  /** Whether the user follows this job's company. */
  company_followed?: boolean;
  dismiss_reason?: DismissReason | null;
}

export interface DeepGap {
  gap: string;
  address: string;
}

export interface DeepRaw {
  why_fit: string[];
  resume_bullets: string[];
  gaps: DeepGap[];
  interview_topics: string[];
}

export interface DeepAnalysis {
  kind: 'deep';
  model: string;
  created_at: string;
  fit_score: number;
  reason: string;
  prompt_tokens: number;
  cached_tokens: number;
  completion_tokens: number;
  cost_usd: number;
  latency_ms: number;
  raw: DeepRaw;
}

export interface JobDetail extends Job {
  /** Plain text: paragraphs separated by blank lines. */
  description: string;
  deep: DeepAnalysis | null;
}

export interface JobList {
  count: number;
  jobs: Job[];
  /** Today only: matches still waiting for a full AI score. */
  pending?: number;
  /** Today only: of those, the ones without an AI quick grade yet. */
  ungraded?: number;
}

export interface DayCount {
  day: string;
  count: number;
}

export interface Stats {
  by_stage: Record<string, number>;
  by_industry: Record<string, number>;
  by_category: Record<string, number>;
  by_status: Record<string, number>;
  new_per_day: DayCount[];
  applications_per_week: number;
  weekly_goal?: number;
  goal_streak_weeks?: number;
}

export interface Run {
  id: number;
  started_at: string;
  finished_at: string | null;
  // 'ok' | 'partial' | 'failed', or null while the run is in flight
  // (runs rows are inserted bare and only get a status when finished).
  status: 'ok' | 'partial' | 'failed' | null;
  companies_ok: number;
  companies_failed: number;
  jobs_seen: number;
  jobs_new: number;
  jobs_excluded: number;
  jobs_scored: number;
  prompt_tokens: number;
  cached_tokens: number;
  completion_tokens: number;
  cost_usd: number;
  error: string | null;
}

export interface RunsList {
  runs: Run[];
}

export interface Company {
  id: number;
  name: string;
  ats: string;
  token: string;
  industry: string;
  enabled: boolean;
  last_fetch_at: string | null;
  last_fetch_ok: boolean | null;
  last_fetch_error: string | null;
  jobs_open: number;
  jobs_scored: number;
}

export interface CompaniesList {
  companies: Company[];
}

export interface Industry {
  id: string;
  label: string;
  description: string;
  companies: number;
  open_jobs: number;
  /** The user's open, scored matches. */
  matches: number;
  top_score: number | null;
}

export interface IndustriesList {
  industries: Industry[];
}

export interface User {
  id: number;
  email: string;
  name: string;
  is_admin: boolean;
  created_at: string;
  /** Unix time of the profile picture (null when there is none). */
  avatar_version?: number | null;
}

/** A preference change suggested by the reasons the user gave for passing on jobs. */
export interface TuneSuggestion {
  reason: string;
  count: number;
  text: string;
  /** The full preferences with the change made; null means review them by hand. */
  preferences: Preferences | null;
}

export interface Preferences {
  role_families: string[];
  levels: string[];
  max_years_required: number;
  us_only: boolean;
  needs_sponsorship: boolean;
}

export type WorkAuthorization =
  | 'citizen_or_resident'
  | 'sponsorship_now'
  | 'sponsorship_future'
  | 'outside_us';

export interface Answers {
  current_title?: string;
  years_experience?: number | null;
  work_authorization?: WorkAuthorization | '';
  locations?: string;
  work_modes?: ('remote' | 'hybrid' | 'onsite')[];
  industries?: string[];
  target_roles?: string;
  avoid?: string;
  notes?: string;
}

export interface Profile {
  markdown: string;
  resume_text: string;
  resume_file: { filename: string; uploaded_at: string } | null;
  preferences: Preferences;
  answers: Answers;
  /** Characters of resume text on file; 0 when none was uploaded. */
  resume_chars: number;
  /** Matching runs for this profile (text plus a family and a level). */
  ready: boolean;
  updated_at: string | null;
}

export interface Choice {
  id: string;
  label: string;
  description?: string;
}

/** A role family, filed under a career field ("healthcare"). */
export interface RoleFamilyChoice extends Choice {
  field?: string;
}

export interface ProfileOptions {
  /** Career fields that group the role families; absent on older servers. */
  fields?: Choice[];
  role_families: RoleFamilyChoice[];
  levels: Choice[];
  industries: Choice[];
}

export interface MyUsage {
  monthly_budget_usd: number;
  month_spend_usd: number;
  remaining_usd: number;
}

/** Preferences the AI read off the resume (POST /api/profile/suggest). */
export interface Suggestions {
  role_families: string[];
  levels: string[];
  years_experience: number | null;
  current_title: string;
  locations: string[];
  target_roles: string;
}

export interface NotificationSettings {
  email_digest: boolean;
  frequency: 'daily' | 'weekly';
  strong_matches: boolean;
  min_score: number;
  product_updates: boolean;
}

export interface Settings {
  theme: 'system' | 'light' | 'dark';
  default_sort: 'score' | 'newest';
  weekly_application_goal?: number;
  notifications: NotificationSettings;
}

export interface HiddenCompany {
  id: number;
  name: string;
  industry: string;
}

export interface SettingsView extends Settings {
  hidden_companies: HiddenCompany[];
}

export interface CoverLetter {
  body: string;
  model: string;
  edited: boolean;
  created_at: string;
  updated_at: string;
}

/** One likely interview question, with the user's own talking points or what to prepare. */
export interface PrepQuestion {
  question: string;
  kind: 'role' | 'behavioral' | 'motivation' | 'company';
  why: string;
  points: string[];
  prepare: string;
}

/** Interview prep for one job (GET/POST /api/jobs/{id}/interview-prep). */
export interface InterviewPrep {
  prep: {
    role: string;
    they_value: string[];
    intro: string;
    questions: PrepQuestion[];
    ask: string[];
  };
  model: string;
  created_at: string;
  updated_at: string;
}

/** Feedback on a practice answer (POST /api/jobs/{id}/interview-prep/practice). */
export interface PracticeFeedback {
  strengths: string[];
  improve: string[];
  outline: string[];
  follow_up?: string;
}

export interface PracticeTurn {
  question: string;
  answer: string;
  feedback: PracticeFeedback;
  at: string;
}

export interface PracticeThread {
  question: string;
  turns: PracticeTurn[];
  updated_at: string;
}
