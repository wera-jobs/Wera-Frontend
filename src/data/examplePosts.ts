import type { Post } from '../api/community';

export interface ExamplePost extends Post {
  slug: string;
  is_example: true;
}

export const EXAMPLE_POSTS: ExamplePost[] = [
  {
    id: -1,
    slug: 'example-lca-offer-negotiation',
    is_example: true,
    title: 'How I negotiated a $24k bump on a backend offer using H-1B LCA data',
    excerpt:
      'When my first written offer came in at $148k base, I pulled the company H-1B LCA filings for the same city and level before replying. Here is the exact email structure and timeline that moved the base to $172k.',
    tags: ['offers', 'visa', 'big-tech'],
    author: { id: -101, name: 'Amara Okoye', avatar_version: null },
    created_at: '2026-11-18T15:20:00Z',
    read_minutes: 4,
    reactions: { like: 24, insightful: 18, celebrate: 11 },
    my_reactions: [],
    comment_count: 2,
    is_mine: false,
    body: `When I got the verbal offer for a mid-level backend role in Seattle, the recruiter framed $148,000 base as "top of band for this level." I almost accepted on the spot because I was tired after six weeks of loops.

Instead, I asked for 48 hours to review the full package in writing and checked their public US DOL H-1B LCA filings for Software Engineer II roles in Seattle over the past 12 months.

## What the data actually showed

Out of 64 certified filings for that title and metro area:

- **25th percentile:** $154,000
- **Median:** $169,000
- **75th percentile:** $184,000

My offer was below the 25th percentile for the exact role and city. Having real numbers kept me calm. I did not need a competing offer to ask a reasonable question.

## The reply I sent

I kept it short, polite, and specific. I thanked the recruiter for the written offer, reaffirmed that the team was my first choice, and wrote:

- Based on current market data and public Seattle filings for comparable backend roles at this level, I was expecting a base closer to **$175,000**.
- If we can get close to that number, I am ready to sign this week.

No ultimatum, no bluffing about fake competing offers, and no long essay.

## What happened next

Two days later, the recruiter came back with **$172,000 base** and kept the original equity grant and $15,000 sign-on bonus intact. They never asked for a competing offer letter.

## Takeaways if you are negotiating this month

- Always ask for the offer in writing and take at least 24 hours before responding.
- Anchor on **location-adjusted base pay**, not just total comp headlines from random forums.
- Keep the tone collaborative. Recruiters usually need a clean justification to take back to the compensation committee, and public filing ranges give them one.`,
    comments: [
      {
        id: -1001,
        body: 'The point about giving the recruiter a clean justification for the comp committee is so true. Once I stopped treating negotiation like a debate and just shared the median range for my city, the whole conversation got easier.',
        author: { id: -201, name: 'Nadia Benali', avatar_version: null },
        created_at: '2026-11-19T09:10:00Z',
        is_mine: false,
      },
      {
        id: -1002,
        body: 'Congrats Amara! Did you mention the H-1B filings directly by name, or just phrase it as public market data for Seattle?',
        author: { id: -202, name: 'Devon Brooks', avatar_version: null },
        created_at: '2026-11-19T14:45:00Z',
        is_mine: false,
      },
    ],
  },
  {
    id: -2,
    slug: 'example-two-base-resumes',
    is_example: true,
    title: 'From 180 cold applications to 6 loops: why I split my resume into two tracks',
    excerpt:
      'For two months I sent the same general full-stack resume to every posting and got almost zero callbacks. Splitting into a backend platform version and a product engineering version tripled my screen rate.',
    tags: ['resume', 'startups', 'interviews'],
    author: { id: -102, name: 'Mateo Delgado', avatar_version: null },
    created_at: '2026-11-15T18:00:00Z',
    read_minutes: 3,
    reactions: { like: 19, insightful: 15 },
    my_reactions: [],
    comment_count: 1,
    is_mine: false,
    body: `In September I tracked 180 applications and got 3 recruiter screens. I thought the market was just frozen, until a hiring manager friend read my resume for 20 seconds and asked: "Are you applying as an infrastructure engineer or a product engineer?"

My resume tried to do both at once. The top half talked about React design systems and onboarding conversion, and the bottom half talked about Kafka consumers and Postgres query tuning. Neither type of hiring manager saw a clear match in the first six seconds.

## The change that moved the needle

I stopped editing one master document from scratch for every job and built **two focused base resumes**:

- **Product Engineering base:** Led with TypeScript, React, GraphQL, experimentation, and customer-facing metrics.
- **Backend Platform base:** Led with Go, PostgreSQL, distributed queues, latency reductions, and incident reliability.

Same real jobs, same real dates, zero fabrication. I only changed which bullets got top billing and cut the unrelated details down to one line.

## Results over the next four weeks

- **58 applications** sent (down from 180, because I skipped poor fits)
- **9 recruiter screens** (15.5% callback rate)
- **6 full interview loops** and 2 final-stage offers at Series B startups

## What I would do differently

Do not spend 45 minutes rewriting your resume for every single posting. Build two or three crisp base resumes for the role families you genuinely target, then make small 3-minute adjustments only for roles you are excited about.`,
    comments: [
      {
        id: -1003,
        body: 'Splitting into two base resumes saved me hours every week. I did the exact same thing for data engineering vs analytics engineering and finally started passing the initial screen.',
        author: { id: -203, name: 'Soraia Ferreira', avatar_version: null },
        created_at: '2026-11-16T11:30:00Z',
        is_mine: false,
      },
    ],
  },
  {
    id: -3,
    slug: 'example-staff-system-design-prep',
    is_example: true,
    title: 'What senior and staff system design rounds actually test (and what I cut from prep)',
    excerpt:
      'I wasted three weeks memorizing textbook architectures I never got asked. Once I shifted to practicing trade-offs, failure modes, and back-of-the-envelope bottlenecks, my design feedback flipped completely.',
    tags: ['interviews', 'big-tech'],
    author: { id: -103, name: 'Priya Subramanian', avatar_version: null },
    created_at: '2026-11-12T20:15:00Z',
    read_minutes: 4,
    reactions: { like: 31, insightful: 27, celebrate: 4 },
    my_reactions: [],
    comment_count: 2,
    is_mine: false,
    body: `After failing two senior backend loops earlier this year, I asked both recruiters for honest feedback. Both gave me almost the same note: "Solid high-level diagram, but did not go deep enough on operational trade-offs."

Looking back, I had spent weeks watching videos on how to design Twitter and YouTube from scratch. In the actual interviews, nobody cared whether I remembered a buzzword. They cared how I reasoned when constraints changed mid-interview.

## Four things interviewers kept probing

- **Write paths vs read paths:** Where does the data actually live, what is the primary key, and what query pattern breaks your schema first?
- **Failure modes:** If a downstream queue or third-party webhook stalls for 10 minutes, do you drop events, retry with backoff, or shed load?
- **Idempotency:** How do you stop a retried payment or job submission from running twice?
- **Observability:** Which two metrics would wake you up at 3 a.m. before customers notice?

## What I cut from my prep

I stopped memorizing 20 different system templates. Instead, I picked **five core building blocks** (rate limiter, job queue, notification pipeline, search index, and multi-tenant billing ledger) and practiced explaining each one out loud in 35 minutes while timing myself.

## A simple 5-minute opening script

Spend the first five minutes aligning on three numbers: **scale** (requests per second and payload size), **consistency** (strong vs eventual), and **scope** (which two endpoints we are actually designing today). That single habit stopped me from wandering into irrelevant boxes on the whiteboard.`,
    comments: [
      {
        id: -1004,
        body: 'Idempotency and failure modes come up in almost every loop now. Asking "what happens when this call times out after the write succeeds?" usually turns a standard answer into a strong hire signal.',
        author: { id: -204, name: 'Tarek Al-Mansoor', avatar_version: null },
        created_at: '2026-11-13T08:20:00Z',
        is_mine: false,
      },
      {
        id: -1005,
        body: 'Bookmarking the 5-minute opening script. I always rush straight into drawing a load balancer before confirming what consistency the interviewer actually wants.',
        author: { id: -205, name: 'Mei-Ling Zhou', avatar_version: null },
        created_at: '2026-11-14T16:05:00Z',
        is_mine: false,
      },
    ],
  },
  {
    id: -4,
    slug: 'example-f1-opt-sponsorship-search',
    is_example: true,
    title: 'Navigating F-1 OPT to H-1B sponsorship as a new grad without burning out',
    excerpt:
      'Applying blindly to every entry-level job on OPT is exhausting when half of them auto-reject on sponsorship. Filtering by verified filing history first cut my wasted applications in half.',
    tags: ['visa', 'new-grad', 'offers'],
    author: { id: -104, name: 'Kofi Mensah', avatar_version: null },
    created_at: '2026-11-10T13:40:00Z',
    read_minutes: 4,
    reactions: { like: 28, insightful: 16, celebrate: 9 },
    my_reactions: [],
    comment_count: 1,
    is_mine: false,
    body: `Graduating on F-1 OPT adds a real clock to your job search. When I started applying in August, I treated it like a numbers game and submitted to every new-grad posting I saw. Half of my rejections arrived within two hours because of the sponsorship checkbox.

By October I changed my workflow completely so my energy went only to employers that actually sponsor.

## My weekly filter routine

- **Check filing history before writing a cover letter:** If a company had zero H-1B filings in the last two fiscal years and is under 50 people, I moved it to the bottom of my list unless the posting explicitly welcomed OPT/CPT.
- **Look at E-Verify early:** For STEM OPT extensions, E-Verify is non-negotiable. Checking that upfront saved me from awkward late-stage surprises.
- **Ask the sponsorship question cleanly on the first call:** I used to wait until the final round out of fear. Asking in the recruiter screen ("I am currently on F-1 STEM OPT with 3 years of work authorization and will need H-1B sponsorship down the line. Does this role support that?") saved everyone's time.

## Keeping a sustainable pace

Setting a realistic weekly goal of **12 high-fit applications** beat doing 60 rushed ones. I spent the time I saved practicing behavioral stories and shipping one small portfolio project with real tests and documentation.

If you are on OPT right now, do not let the automated rejections wreck your confidence. Most of them are policy filters, not a verdict on your engineering ability.`,
    comments: [
      {
        id: -1006,
        body: 'That exact phrasing for the recruiter screen is gold. Mentioning the 3 years of STEM OPT authorization upfront immediately clears up confusion for smaller teams that think you need an H-1B on day one.',
        author: { id: -206, name: 'Samuel Boateng', avatar_version: null },
        created_at: '2026-11-11T10:15:00Z',
        is_mine: false,
      },
    ],
  },
  {
    id: -5,
    slug: 'example-cold-outreach-messages',
    is_example: true,
    title: 'Three short outreach notes that actually got hiring managers to reply',
    excerpt:
      'Long "I am passionate about your mission" messages got ignored every time. Switching to 4-sentence notes tied to a real product detail or open role got me a 35% reply rate.',
    tags: ['networking', 'startups'],
    author: { id: -105, name: 'Hanna Lindqvist', avatar_version: null },
    created_at: '2026-11-08T17:05:00Z',
    read_minutes: 3,
    reactions: { like: 22, insightful: 19 },
    my_reactions: [],
    comment_count: 1,
    is_mine: false,
    body: `I used to dread networking because every template online sounded stiff and salesy. When I sent generic "Would love to pick your brain" messages, almost nobody wrote back.

Over the last two months I tested a much simpler rule: **every message had to fit on a phone screen without scrolling**, and it had to mention one specific thing about the team's actual work.

## 1. The hiring manager note (after applying)

"Hi [Name], I just applied for the Senior Frontend role on your billing team. At my last company I rebuilt our invoice export flow in React and TypeScript, cutting support tickets by 40%. Happy to send a quick link to a similar open-source table component I wrote if useful. Either way, appreciate your time."

## 2. The alumni warm intro

"Hi [Name], fellow [School] alum here. I saw you moved to the data platform team at [Company] last year and noticed you are hiring for a mid-level analytics engineer. Would you mind if I asked two quick questions over email about how the team splits dbt ownership with product?"

## 3. The follow-up (5 business days later)

"Hi [Name], bubbling this up once in case it got buried during sprint planning. Still very interested in the [Role] opening, and no worries at all if the team is already deep in final rounds."

## Why these worked

- **Low friction:** No immediate calendar link demanding a 30-minute call.
- **Proof in one sentence:** One concrete project beats five adjectives.
- **Easy out:** People reply more often when they do not feel cornered.`,
    comments: [
      {
        id: -1007,
        body: 'Fitting on a phone screen without scrolling is such a good constraint. Most hiring managers check LinkedIn or email between meetings on their phone.',
        author: { id: -101, name: 'Amara Okoye', avatar_version: null },
        created_at: '2026-11-09T12:00:00Z',
        is_mine: false,
      },
    ],
  },
  {
    id: -6,
    slug: 'example-interview-debrief-checklist',
    is_example: true,
    title: 'My 15-minute interview debrief checklist after bombing two final rounds',
    excerpt:
      'I used to close my laptop after a rough interview and try to forget it. Writing down five specific notes right after each call helped me spot a recurring gap and pass my next two loops.',
    tags: ['interviews', 'resume', 'new-grad'],
    author: { id: -106, name: 'Kenji Takahashi', avatar_version: null },
    created_at: '2026-11-05T16:15:00Z',
    read_minutes: 3,
    reactions: { like: 17, insightful: 14, celebrate: 5 },
    my_reactions: [],
    comment_count: 1,
    is_mine: false,
    body: `After bombing two final rounds back to back, my instinct was to grind 50 more LeetCode mediums. Before doing that, I forced myself to review what actually went wrong in those two loops.

It was not algorithms. In both loops, I had passed the coding rounds cleanly and lost momentum in the behavioral and project deep-dive rounds because my answers rambled past four minutes.

## The 5-line debrief I write right after every interview

Before closing my notebook, I spend 15 minutes logging five things in my tracker notes:

- **Exact questions asked:** Especially the follow-ups that caught me off guard.
- **Where I hesitated:** Which concept, metric, or project detail felt fuzzy?
- **Time check:** Did I leave 5 minutes at the end for thoughtful questions, or run out of time?
- **One thing that landed well:** So I remember to keep doing it.
- **One drill before the next call:** A single 20-minute fix, not a huge study plan.

## What changed after three weeks

Looking at my notes side by side made the pattern obvious. I trimmed my four core project stories down to **90 seconds each** (context, what I personally built, measurable result, and one trade-off I would revisit).

In my next two loops, interviewers spent the extra time asking deeper follow-ups on my work instead of cutting me off to move on. Keeping a short written log turned painful rejections into a clear checklist.`,
    comments: [
      {
        id: -1008,
        body: 'Timing project stories to 90 seconds is underrated. Once I stopped spending two minutes on company backstory, my behavioral rounds went way better.',
        author: { id: -102, name: 'Mateo Delgado', avatar_version: null },
        created_at: '2026-11-06T19:40:00Z',
        is_mine: false,
      },
    ],
  },
];

export function getExamplePost(idOrSlug: string | undefined): ExamplePost | undefined {
  if (!idOrSlug) return undefined;
  return EXAMPLE_POSTS.find((p) => p.slug === idOrSlug || String(p.id) === idOrSlug);
}
