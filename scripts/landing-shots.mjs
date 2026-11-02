// Takes the product screenshots on the landing page from the real app.
//
// The screens are the real components. Every job, company and person is
// invented here, so no user's data and no employer's name reaches the page.
// Only the resume engine is real, for a true preview.
//
//   WERA_API=http://127.0.0.1:8090 npx vite --port 5174 --strictPort --host 127.0.0.1
//   node scripts/landing-shots.mjs            (API as in e2e/README.md, never the live one)
//
// It signs up a throwaway account for the resume engine and deletes it after.
// Writes public/landing/<screen>-<wide|phone>-<light|dark>.webp.
import { writeFileSync } from 'node:fs';
import { chromium, devices } from '@playwright/test';

const BASE = process.env.BASE ?? 'http://127.0.0.1:5174';
const OUT = new URL('../public/landing/', import.meta.url).pathname;
const PASSWORD = 'landing shots password';
const HEIGHT = 700;
const ago = (days) => new Date(Date.now() - days * 86_400_000).toISOString();
const entry = (id, heading, subheading, dates, location, bullets = []) => ({
  id, heading, subheading, dates, location, bullets: bullets.map((text, i) => ({ id: `${id}-${i}`, text })),
});

const RESUME = {
  name: 'Amara Okoye', headline: 'Machine Learning Engineer', phone: '+1 512 555 0142', email: 'amara@example.com', location: 'Austin, TX',
  links: [{ label: 'example.com/amara', url: 'https://example.com/amara' }],
  sections: [
    { id: 'edu', kind: 'entries', title: 'Education', entries: [
      entry('e1', 'Ridgeline State University', 'M.S. Computer Science, GPA 3.9', 'Aug 2024 – May 2026', 'Austin, TX', ['Coursework: machine learning systems, distributed systems, information retrieval']),
      entry('e2', 'Coastal Institute of Technology', 'B.S. Computer Engineering, first class honors', 'Sep 2019 – Jul 2023', 'Lagos, Nigeria'),
    ] },
    { id: 'exp', kind: 'entries', title: 'Experience', entries: [
      entry('x1', 'Halden Robotics', 'Machine Learning Intern', 'May 2025 – Aug 2025', 'Pittsburgh, PA', [
        'Trained a grasp ranking model in PyTorch on 2.1M labeled attempts, lifting first-try success from 71% to 83%',
        'Cut inference latency from 48 ms to 19 ms on the arm controller by quantizing the model and batching requests',
        'Built a labeling review tool in React and FastAPI that three operators used daily to clear 4,000 images a week',
      ]),
      entry('x2', 'Tidewater Payments', 'Software Engineer', 'Aug 2023 – Jul 2024', 'Lagos, Nigeria', [
        'Moved card settlement from nightly batches to a Kafka pipeline handling 1.2M events a day with no missed payouts',
        'Wrote a Go reconciliation service that found $310K in failed transfers during its first quarter',
        'Reduced on-call pages by 40% with Prometheus alerts tied to customer impact instead of host metrics',
      ]),
    ] },
    { id: 'proj', kind: 'projects', title: 'Projects', entries: [
      { id: 'p1', heading: 'Sift', tech: 'Python, PyTorch, FAISS', dates: '2025', bullets: [
        { id: 'p1-0', text: 'Built a semantic search engine over 900K research abstracts that returns results in under 60 ms' },
        { id: 'p1-1', text: 'Reached recall@10 of 0.91 by fine-tuning a sentence encoder on 40K query pairs' },
      ] },
      { id: 'p2', heading: 'Ledgerline', tech: 'Go, PostgreSQL, Docker', dates: '2024', bullets: [
        { id: 'p2-0', text: 'Wrote a double-entry ledger library with property-based tests, used by two student startups' },
      ] },
    ] },
    { id: 'skills', kind: 'skills', title: 'Skills', skills: [
      { id: 's1', name: 'Languages', items: 'Python, Go, TypeScript, SQL, C++' },
      { id: 's2', name: 'Machine learning', items: 'PyTorch, scikit-learn, FAISS, ONNX, experiment tracking' },
      { id: 's3', name: 'Systems', items: 'Kafka, PostgreSQL, Docker, Kubernetes, AWS, Prometheus' },
    ] },
  ],
};

const job = (id, title, company, status, score, extra = {}) => ({
  id, company_id: id, company, industry: 'ai_ml', source: 'greenhouse', ext_id: String(id), title, location_raw: 'San Francisco, CA',
  is_remote: false, url: 'https://example.com/job', department: 'Engineering', posted_at: ago(extra.days ?? 2), first_seen_at: ago(extra.days ?? 2),
  stage: 'scored', matched_categories: [], exclude_reason: null, exclude_evidence: null, fit_score: score, verdict: 'strong', seniority: 'entry',
  years_required: 0, sponsorship: 'yes', work_mode: 'hybrid', location_summary: 'San Francisco, CA (hybrid)', skills_matched: [], skills_missing: [], reason: '',
  application_status: status, application_notes: null, estimated_score: null, autofilled_at: null, closed_at: null, ...extra,
});

const FILLED = { autofilled_at: ago(3) };
const JOBS = [
  job(101, 'Machine Learning Engineer, New Grad', 'Orchard AI', 'saved', 94, { days: 1 }),
  job(102, 'Software Engineer, Search', 'Tessera Labs', 'saved', 88, { days: 1 }),
  job(103, 'Backend Engineer I', 'Kestrel Payments', 'saved', 83, { days: 2 }),
  job(104, 'ML Platform Engineer', 'Halcyon Bio', 'saved', 79, { days: 3 }),
  job(105, 'Software Engineer, Flight Software', 'Perigee Aerospace', 'applied', 91, { days: 4, ...FILLED }),
  job(106, 'Data Engineer', 'Brightwater Health', 'applied', 80, { days: 5, ...FILLED }),
  job(107, 'Site Reliability Engineer', 'Marlow Cloud', 'applied', 84, { days: 6, ...FILLED }),
  job(108, 'Applied Scientist I', 'Lumenfield', 'interviewing', 90, { days: 8 }),
  job(109, 'Backend Engineer', 'Northgate Freight', 'interviewing', 86, { days: 9 }),
  job(110, 'Software Engineer', 'Fieldnote', 'offer', 89, { days: 15 }),
  job(111, 'Quant Developer', 'Ashgrove Capital', 'rejected', 74, { days: 12 }),
];

const DETAIL = {
  ...JOBS[0],
  description: 'About the role\n\nJoin the ranking team and take models from notebook to production. You will train, ship and monitor the models behind our recommendations.\n\nWhat you will do\n\n- Train and evaluate ranking models in PyTorch\n- Build feature pipelines on Kafka and PostgreSQL\n- Own latency and quality in production\n\nWe sponsor visas for this role.',
  reason: 'Your grasp ranking work in PyTorch and your Kafka pipeline map directly to this team, and the role is entry level with visa sponsorship.',
  skills_matched: ['PyTorch', 'Python', 'Kafka', 'PostgreSQL', 'model evaluation'],
  skills_missing: ['Spark'],
  deep: null,
};
const TAILORED = { id: 2, title: 'Orchard AI', job_id: 101, job_title: DETAIL.title, job_company: 'Orchard AI', data: RESUME, layout: { font_size: 10.5, spacing: 1, margin: 0.6, template: 'ivy' }, fit: null, notes: [], updated_at: ago(0) };

const POSTS = [
  { id: 1, title: 'How I went from 0 callbacks to 4 offers on OPT', excerpt: 'I sent 200 applications before I changed anything. These are the three things that moved the numbers, and what I would skip next time.', tags: ['offers', 'opt'], read_minutes: 6, days: 1, name: 'Tunde A.', reactions: { celebrate: 41, insightful: 28 }, comment_count: 17 },
  { id: 2, title: 'What a system design round at a robotics company looks like', excerpt: 'They cared less about scale than I expected. Most of the hour was failure modes, and what happens when a sensor lies to you.', tags: ['interviews'], read_minutes: 4, days: 3, name: 'Priya S.', reactions: { insightful: 33 }, comment_count: 9 },
  { id: 3, title: 'Which hospitals in Texas sponsor new grad nurses', excerpt: 'I went through the filings for twelve systems. Here are the ones that hired on H-1B this year and the units they hired for.', tags: ['sponsorship', 'nursing'], read_minutes: 5, days: 6, name: 'Grace M.', reactions: { like: 22, insightful: 19 }, comment_count: 6 },
].map((p) => ({ ...p, author: { id: p.id + 10, name: p.name, avatar_version: null }, created_at: ago(p.days), my_reactions: [], is_mine: false }));

const QUESTION = {
  id: 1, domain: 'System design', kind: 'technical', difficulty: 'medium',
  question: 'A read-heavy service caches user profiles. Which approach best keeps stale data off the page after a profile is edited?',
  choices: ['Lower the cache TTL to one second', 'Delete the cache entry when the profile is written', 'Add more cache replicas', 'Cache only the most read profiles'],
};
const DOMAINS = [
  ['Data structures & algorithms', 'technical', 6, 4, 3], ['System design', 'technical', 4, 2, 2], ['Databases', 'technical', 3, 1, 1],
  ['Machine learning', 'technical', 3, 2, 2], ['Operating systems & networking', 'technical', 3, 0, 0], ['Behavioral', 'behavioral', 4, 3, 3],
].map(([domain, kind, questions, answered, correct]) => ({ domain, kind, questions, answered, correct }));

const USER = { id: 1, email: 'amara@example.com', name: 'Amara Okoye', is_admin: false, created_at: ago(60) };
const PROFILE = { markdown: '# Candidate Profile', resume_text: 'Amara Okoye', resume_file: { filename: 'resume.pdf', uploaded_at: ago(30) }, preferences: { role_families: ['ml'], levels: ['entry'], max_years_required: 3, us_only: true, needs_sponsorship: true }, answers: {}, resume_chars: 3000, ready: true, updated_at: ago(30) };

/** First match wins; anything else goes to the real API (the resume engine). */
function mocks(resumeId) {
  const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) });
  return [
    [/^GET \/api\/auth\/me$/, () => json({ user: USER, avatar_version: null, email_verified: true })],
    [/^GET \/api\/auth\/config$/, () => json({ signup_enabled: true, mail_enabled: true })],
    [/^GET \/api\/profile$/, () => json(PROFILE)],
    [/^GET \/api\/runs/, () => json({ runs: [{ id: 1, started_at: ago(0.05), finished_at: ago(0.04), status: 'ok' }] })],
    [/^GET \/api\/jobs\/101$/, () => json(DETAIL)],
    [/^GET \/api\/jobs\/101\/keywords$/, () => json({ keywords: ['PyTorch', 'Kafka'], coverage: { matched: ['PyTorch', 'Python', 'Kafka', 'PostgreSQL', 'ranking', 'latency'], missing: ['Spark'], percent: 86 }, resume_id: resumeId })],
    [/^GET \/api\/jobs\/101\/resume$/, () => json(TAILORED)],
    [/^GET \/api\/jobs\/101\/(h1b|cover-letter)/, () => json({ error: 'none' }, 404)],
    [/^GET \/api\/autofill-runs/, () => json({ runs: [] })],
    [/^GET \/api\/jobs/, (url) => {
      const status = url.searchParams.get('status');
      const jobs = status ? JOBS.filter((j) => j.application_status === status) : JOBS;
      return json({ count: jobs.length, jobs });
    }],
    [/^GET \/api\/interview\/domains$/, () => json({ domains: DOMAINS })],
    [/^GET \/api\/interview\/quiz/, () => json({ questions: Array.from({ length: 10 }, (_, i) => ({ ...QUESTION, id: i + 1 })) })],
    [/^POST \/api\/interview\/questions\/\d+\/answer$/, () => json({ correct: true, answer: 1, explanation: 'Deleting on write means the next read loads the new profile. A short TTL only narrows the window, and replicas or partial caching do not touch it.' })],
    [/^GET \/api\/posts/, () => json({ posts: POSTS, tags: [{ tag: 'interviews', count: 48 }, { tag: 'offers', count: 31 }, { tag: 'opt', count: 22 }, { tag: 'sponsorship', count: 19 }, { tag: 'nursing', count: 8 }] })],
    [/^GET \/healthz$/, () => json({ status: 'ok', version: 'demo', commit: 'demo' })],
  ];
}

/** The part of a wide screen to keep: its width, from `top` of what is shown, as tall as the landing page's frame needs. */
async function frame(page, target, top = target) {
  const box = await target.boundingBox(), start = await top.boundingBox();
  return { x: box.x, y: start.y, width: box.width, height: Math.min(HEIGHT, box.y + box.height - start.y) };
}

/** Screens: where to go, what to do there, and what to photograph at which width. */
const SCREENS = {
  resume: {
    url: (id) => `/profile/resume/${id}`, width: 1280,
    wait: async (p) => p.getByText('One page').first().waitFor({ timeout: 15_000 }),
    phone: async (p) => {
      await p.locator('#resume-preview').evaluate((e) => e.scrollIntoView());
      await p.evaluate(() => window.scrollBy(0, -64));
    },
    clip: (p) => frame(p, p.locator('main'), p.getByRole('button', { name: 'Fit to one page' }).locator('xpath=ancestor::div[contains(@class, "sticky") or contains(@class, "rounded")][1]')),
  },
  tailor: {
    url: () => '/jobs/101', width: 1280,
    act: async (p) => p.getByRole('tab', { name: /Resume/ }).click(),
    wait: async (p) => p.getByText('One page').first().waitFor({ timeout: 15_000 }),
    clip: (p) => frame(p, p.getByRole('dialog')),
  },
  tracker: { url: () => '/tracker', width: 1240, clip: (p) => frame(p, p.locator('main')) },
  interview: {
    url: () => '/interview', width: 1000,
    act: async (p) => {
      await p.getByRole('button', { name: /Start \d+ questions/ }).click();
      await p.getByRole('button', { name: /Delete the cache entry/ }).click();
    },
    clip: (p) => frame(p, p.locator('main')),
  },
  community: { url: () => '/community', width: 1000, clip: (p) => frame(p, p.locator('main')) },
};

async function webp(browser, png) {
  const page = await browser.newPage();
  const data = await page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    c.getContext('2d').drawImage(img, 0, 0);
    return c.toDataURL('image/webp', 0.82);
  }, png.toString('base64'));
  await page.close();
  return Buffer.from(data.split(',')[1], 'base64');
}

const browser = await chromium.launch();
const seed = await browser.newContext();
const origin = { Origin: BASE };
const email = `landing-shots-${Date.now()}@example.com`;
const up = await seed.request.post(`${BASE}/api/auth/signup`, { headers: origin, data: { email, password: PASSWORD, name: 'Landing Shots' } });
if (!up.ok()) throw new Error(`signup: ${up.status()} ${await up.text()}`);
const doc = await (await seed.request.post(`${BASE}/api/resumes/import`, { headers: origin, data: { source: 'blank' } })).json();
const saved = await seed.request.put(`${BASE}/api/resumes/${doc.id}`, { headers: origin, data: { data: RESUME, layout: { ...doc.layout, template: 'ivy' }, title: 'My resume' } });
if (!saved.ok()) throw new Error(`save resume: ${saved.status()} ${await saved.text()}`);
const cookies = await seed.cookies();
const table = mocks(doc.id);

const SIZES = {
  wide: { viewport: { width: 1280, height: 1100 }, deviceScaleFactor: 2 },
  phone: { ...devices['iPhone 13'], viewport: { width: 390, height: 700 } },
};
const only = process.argv[2];
for (const [size, options] of Object.entries(SIZES)) {
  for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({ ...options, reducedMotion: 'reduce' });
    await context.addCookies(cookies);
    await context.addInitScript((t) => localStorage.setItem('wera-theme', t), theme);
    await context.route(/\/(api\/|healthz)/, async (route) => {
      const url = new URL(route.request().url());
      const key = `${route.request().method()} ${url.pathname}`;
      const hit = table.find(([re]) => re.test(key));
      if (hit) await route.fulfill(hit[1](url));
      else await route.continue();
    });
    for (const [name, screen] of Object.entries(SCREENS)) {
      if (only && only !== name) continue;
      const page = await context.newPage();
      if (size === 'wide') await page.setViewportSize({ width: screen.width, height: 1100 });
      await page.goto(BASE + screen.url(doc.id));
      await page.waitForLoadState('networkidle');
      await screen.act?.(page);
      await screen.wait?.(page);
      if (size === 'phone') await screen.phone?.(page);
      await page.waitForTimeout(1200);
      const png = await page.screenshot({ type: 'png', clip: size === 'wide' ? await screen.clip(page) : undefined });
      const out = await webp(browser, png);
      writeFileSync(`${OUT}${name}-${size}-${theme}.webp`, out);
      console.log(name, size, theme, `${Math.round(out.length / 1024)} KB`);
      await page.close();
    }
    await context.close();
  }
}
await seed.request.delete(`${BASE}/api/auth/account`, { headers: origin, data: { password: PASSWORD } });
await browser.close();
