// LinkedIn searches for people who could refer the user to a job, the same
// ones the extension offers (wera-extension src/panel/Referrals.tsx). Wera
// only builds the links: it reads nothing from LinkedIn.

export interface ReferralSearch {
  label: string;
  url: string;
}

export type ContactRole = 'alumni' | 'peer' | 'recruiter' | 'hiring_manager';

export const CONTACT_ROLES: { id: ContactRole; label: string }[] = [
  { id: 'alumni', label: 'Alumni' },
  { id: 'peer', label: 'Peer / IC' },
  { id: 'recruiter', label: 'Recruiter' },
  { id: 'hiring_manager', label: 'Hiring manager' },
];

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

/** Instant, under-300-character outreach template tailored to the recipient's role. */
export function referralTemplate(
  role: ContactRole,
  company: string,
  title: string,
  me?: { education?: { school: string }[]; experience?: { company: string }[] } | null,
): string {
  const school = me?.education?.find((e) => e.school.trim())?.school.trim();
  const shortTitle = roleOf(title, company) || title;
  switch (role) {
    case 'alumni':
      return school
        ? `Hi [Name], fellow ${school} alum here! I saw the ${shortTitle} opening at ${company} and would love to hear your take on the team. If it sounds like a fit, would you be open to a quick chat or referral?`
        : `Hi [Name], I noticed we share an alma mater and saw you're at ${company}. I'm applying for the ${shortTitle} role and would love to connect and hear your perspective on the team.`;
    case 'peer':
      return `Hi [Name], I'm applying for the ${shortTitle} role at ${company} and really respect the work your team is shipping. Would you be open to sharing what the team looks for or referring me if my background fits?`;
    case 'recruiter':
      return `Hi [Name], I just applied for the ${shortTitle} role at ${company} and believe my background is a strong match. I'd love to connect and share a quick summary of my experience if you're hiring for this team.`;
    case 'hiring_manager':
      return `Hi [Name], I saw the ${shortTitle} role on your team at ${company}. I've worked on closely related problems and would love to connect and share why I'm excited about what your team is building.`;
  }
}

const ROLE_DESC: Record<ContactRole, string> = {
  alumni: 'a fellow alumnus/alumna who works at',
  peer: 'a peer individual contributor on the team at',
  recruiter: 'a recruiter hiring at',
  hiring_manager: 'the hiring manager for this role at',
};

/** What Wera asks the AI for: a note short enough for a LinkedIn connection request. */
export function referralQuestion(company: string, title: string, role: ContactRole = 'alumni'): string {
  return (
    `Write a LinkedIn connection note, under 300 characters, from me to ${ROLE_DESC[role]} ${company}, ` +
    `for the ${title} role. Be warm and direct, name one specific strength of mine ` +
    'that fits the role, and leave a [Name] placeholder for their name. Do not invent anything we share.'
  );
}
