// LinkedIn searches for people who could refer the user to a job, the same
// ones the extension offers (wera-extension src/panel/Referrals.tsx). Wera
// only builds the links: it reads nothing from LinkedIn.

export interface ReferralSearch {
  label: string;
  url: string;
}

const people = (words: string) => `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(words)}&origin=GLOBAL_SEARCH_HEADER`;
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * The role a title names, without its team, level notes and company:
 * "Account Executive - Commercial, Spotify Technology" is "Account
 * Executive", "Senior SRE (Platform)" is "Senior SRE".
 */
export function roleOf(title: string, company: string): string {
  let t = title.replace(/\([^)]*\)|\[[^\]]*\]/g, ' ').split(/\s+[-–—|]\s+|,\s*|\s+\/\s+/)[0] ?? '';
  if (company) t = t.replace(new RegExp(`\\b${company.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'), '');
  t = t.replace(/\s+/g, ' ').trim();
  return t.split(' ').length <= 6 ? t : '';
}

/**
 * Searches for people at the company: schoolmates first (alumni answer
 * strangers most), then former colleagues, then recruiters and people in
 * the role. At most six.
 */
export function referralSearches(
  company: string,
  title: string,
  me: { education?: { school: string }[]; experience?: { company: string }[] } | null | undefined,
): ReferralSearch[] {
  if (!company.trim()) return [];
  const out: ReferralSearch[] = [];
  const schools = [...new Set((me?.education ?? []).map((e) => e.school.trim()).filter(Boolean))].slice(0, 2);
  for (const s of schools) out.push({ label: `${s} alumni at ${company}`, url: people(`${company} ${s}`) });
  const employers = [...new Set((me?.experience ?? []).map((e) => e.company.trim()).filter((c) => c && !same(c, company)))].slice(0, 2);
  for (const c of employers) out.push({ label: `Former ${c} people at ${company}`, url: people(`${company} ${c}`) });
  out.push({ label: `Recruiters at ${company}`, url: people(`${company} recruiter`) });
  const role = roleOf(title, company);
  if (role) out.push({ label: `${role} people at ${company}`, url: people(`${company} ${role}`) });
  return out.slice(0, 6);
}

/** What Wera asks the AI for: a note short enough for a LinkedIn connection request. */
export function referralQuestion(company: string, title: string): string {
  return (
    `Write a LinkedIn connection note, under 300 characters, from me to someone who works at ${company}, ` +
    `asking if they would be open to referring me for the ${title} role. Be warm and direct, name one specific strength of mine ` +
    'that fits the role, and leave a [Name] placeholder for their name. Do not invent anything we share.'
  );
}
