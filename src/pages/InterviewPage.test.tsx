import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { trackForTitle, quizQuery, type ScenarioCard } from '../api/interview';
import { practiceKey } from '../components/interview/text';
import { upNext } from '../components/interview/next';
import { jsonBody, mockApi, renderApp } from '../test/render';
import InterviewPage from './InterviewPage';

const questions = [
  { id: 1, domain: 'Databases', kind: 'technical', difficulty: 'easy', question: 'What does an index speed up?',
    choices: ['Inserts', 'Lookups', 'Backups', 'Schema changes'], tags: ['sql'] },
  { id: 2, domain: 'Behavioral', kind: 'behavioral', difficulty: 'medium', question: 'What does R stand for in STAR?',
    choices: ['Reflection', 'Result', 'Role', 'Risk'], tags: [] },
];

const tracks = {
  suggested: 'backend',
  tracks: [
    { id: 'backend', label: 'Backend engineer', blurb: 'APIs and databases.', domains: ['APIs & backend', 'Databases', 'Behavioral'],
      stack: [{ tag: 'sql', count: 6 }, { tag: 'go', count: 2 }], scenarios: ['backend-first-week'] },
    { id: 'frontend', label: 'Frontend engineer', blurb: 'The browser.', domains: ['Web & frontend', 'Behavioral'],
      stack: [{ tag: 'react', count: 3 }], scenarios: [] },
  ],
};

const card: ScenarioCard = {
  id: 'backend-first-week', tracks: ['backend'], title: 'Your first week on the API team', role: 'Backend engineer',
  blurb: 'You join the API team.', difficulty: 'medium', steps: 2, max_points: 4, skills: ['Ramping up', 'Ownership under pressure'],
  cast: [{ name: 'Amara Osei', role: 'Senior backend engineer' }, { name: 'Priya Nair', role: 'Engineering manager' }],
  progress: { answered: 0, points: 0, best: -1 },
};

const steps = [
  { skill: 'Ramping up', prompt: 'How do you reply to Amara?', choices: ['Thanks, on it.', 'A plan and an ask', 'An ORM rewrite', 'Go quiet'],
    email: { from: 'Amara Osei', to: 'You', subject: 'Welcome! Your first ticket', when: 'Monday, 9:12 AM', body: 'Welcome to Wera!\n\nTake WERA-412.' } },
  { skill: 'Ownership under pressure', prompt: 'What do you send back?', choices: ['Not me', 'Sorry!!', 'Looking', 'Status and fix'],
    email: { from: 'Priya Nair', to: 'You', cc: ['Amara Osei'], subject: 'Staging is down?', when: 'Thursday', body: 'What is going on?' } },
];

const reveal = (step: number, choice: number, rating: 'best' | 'okay' | 'weak', points: number) => ({
  step, choice, rating, points, takeaway: `Takeaway ${step + 1}`,
  choices: steps[step].choices.map((text, i) => ({
    text, rating: i === (step === 0 ? 1 : 3) ? 'best' : i === 0 ? 'okay' : 'weak', feedback: `Why ${step + 1}${'ABCD'[i]}`,
  })),
});

function routes(extra: Parameters<typeof mockApi>[0] = {}) {
  return mockApi({
    'GET /api/interview/tracks': () => tracks,
    'GET /api/interview/domains': () => ({
      domains: [
        { domain: 'Databases', kind: 'technical', questions: 6, answered: 2, correct: 1 },
        { domain: 'Behavioral', kind: 'behavioral', questions: 8, answered: 0, correct: 0 },
        { domain: 'Web & frontend', kind: 'technical', questions: 10, answered: 0, correct: 0 },
      ],
      practice: { streak: 3, week: 12, missed: 2 },
    }),
    'GET /api/interview/scenarios': () => ({ scenarios: [card] }),
    'GET /api/jobs': () => ({ count: 0, jobs: [] }),
    ...extra,
  });
}

afterEach(() => {
  localStorage.clear();
});

describe('InterviewPage', () => {
  it('opens on the suggested role: where the user stands, one next step, and the rounds', async () => {
    routes();
    renderApp(<InterviewPage />);
    const role = await screen.findByRole('combobox', { name: 'Role' });
    expect(role).toHaveValue('backend');
    expect(within(role).getByRole('option', { name: 'Backend engineer (for you)' })).toBeInTheDocument();
    expect(screen.getByText('APIs and databases.')).toBeInTheDocument();
    // Where the user stands is one line.
    const progress = within(screen.getByRole('list', { name: 'Your practice' }));
    expect(progress.getByText('3')).toBeInTheDocument(); // the streak
    expect(progress.getByText('50%')).toBeInTheDocument(); // 1 of 2 in the role's domains
    // One next step: the missed questions come before new topics.
    expect(screen.getByRole('heading', { name: 'Review 2 questions you missed' })).toBeInTheDocument();
    // The rounds tab: only the role's topics, each with its own Start, and the stack.
    expect(screen.getByRole('tab', { name: /Question rounds/ })).toHaveAttribute('aria-selected', 'true');
    const topics = within(screen.getByRole('list', { name: 'Topics' }));
    expect(topics.getByRole('button', { name: 'Start 10 questions: Databases' })).toBeInTheDocument();
    expect(topics.queryByRole('button', { name: /Web & frontend/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'SQL' })).toBeInTheDocument();
    expect(topics.getByRole('button', { name: /Review 2 missed/ })).toBeInTheDocument();
    // Simulations wait behind their tab.
    expect(screen.queryByText('Your first week on the API team')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: /Work simulations/ }));
    expect(screen.getByText('Your first week on the API team')).toBeInTheDocument();

    await userEvent.selectOptions(role, 'frontend');
    expect(await screen.findByText('The browser.')).toBeInTheDocument();
    expect(screen.getByText('No simulations for this role yet.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: /Question rounds/ }));
    expect(screen.getByRole('button', { name: 'Start 10 questions: Web & frontend' })).toBeInTheDocument();
    expect(localStorage.getItem('wera.interview.track')).toBe('frontend');
  });

  it("links an interview to its prep and shows the prep's questions", async () => {
    routes({
      'GET /api/jobs': () => ({ count: 1, jobs: [{ id: 42, title: 'Backend Engineer', company: 'Acme' }] }),
      'GET /api/jobs/42': () => ({ id: 42, title: 'Backend Engineer', company: 'Acme', deep: null }),
      'GET /api/jobs/42/interview-prep': () => ({
        prep: { role: 'Backend', they_value: [], intro: '', ask: [], questions: [{ question: 'How would you shard the orders table?', kind: 'role', why: '', points: [], prepare: '' }] },
        model: 'm', created_at: '', updated_at: '',
      }),
    });
    renderApp(<InterviewPage />);
    expect(await screen.findByRole('link', { name: 'Backend Engineer' })).toHaveAttribute('href', '/jobs?job=42&tab=prep');
    expect(await screen.findByText('How would you shard the orders table?')).toBeInTheDocument();
  });

  it('runs a round for the track and stack: answer, see why, finish with a score', async () => {
    const fetchMock = routes({
      'GET /api/interview/quiz': (_init, url) => {
        expect(url.searchParams.get('track')).toBe('backend');
        expect(url.searchParams.get('difficulty')).toBe('easy');
        expect(url.searchParams.get('stack')).toBe('sql');
        return { questions };
      },
      'POST /api/interview/questions/1/answer': () => ({ correct: true, answer: 1, explanation: 'Indexes find rows fast.' }),
      'POST /api/interview/questions/2/answer': () => ({ correct: false, answer: 1, explanation: 'Close with the result.' }),
    });
    renderApp(<InterviewPage />);

    await userEvent.click(await screen.findByRole('button', { name: 'SQL' }));
    await userEvent.click(screen.getByRole('radio', { name: 'Easy' }));
    await userEvent.click(screen.getByRole('button', { name: 'Start 10 questions: All topics' }));

    expect(await screen.findByText('What does an index speed up?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Lookups/ }));
    expect(await screen.findByText('Indexes find rows fast.')).toBeInTheDocument();
    expect(screen.getByText('Correct')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Next/ }));

    // Keyboard answers work too: "a" picks the first choice.
    expect(await screen.findByText('What does R stand for in STAR?')).toBeInTheDocument();
    await userEvent.keyboard('a');
    expect(await screen.findByText(/The answer is B/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Finish/ }));

    expect(await screen.findByText('1/2')).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([u]) => (u as string | URL).toString().includes('/answer'))).toHaveLength(2);
  });

  it('ends a round with what was missed: the question, the pick, the answer and why', async () => {
    routes({
      'GET /api/interview/quiz': () => ({ questions }),
      'POST /api/interview/questions/1/answer': () => ({ correct: true, answer: 1, explanation: 'Indexes find rows fast.' }),
      'POST /api/interview/questions/2/answer': () => ({ correct: false, answer: 1, explanation: 'Close with the result.' }),
    });
    renderApp(<InterviewPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Start 10 questions: All topics' }));
    await userEvent.click(await screen.findByRole('button', { name: /Lookups/ }));
    await userEvent.click(await screen.findByRole('button', { name: /Next/ }));
    await userEvent.click(await screen.findByRole('button', { name: /Reflection/ }));
    await userEvent.click(await screen.findByRole('button', { name: /Finish/ }));
    const missed = within(await screen.findByRole('region', { name: 'What you missed (1)' }));
    expect(missed.getByText('What does R stand for in STAR?')).toBeInTheDocument();
    expect(missed.getByText('Reflection')).toBeInTheDocument();
    expect(missed.getByText('Result')).toBeInTheDocument();
    expect(missed.getByText('Close with the result.')).toBeInTheDocument();
    // The question answered right is not listed.
    expect(missed.queryByText('What does an index speed up?')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /Back to practice/ }));
    expect(await screen.findByRole('tab', { name: /Question rounds/ })).toBeInTheDocument();
  });

  it('leaves browser shortcuts alone: Ctrl+C copies, it does not pick C', async () => {
    const fetchMock = routes({ 'GET /api/interview/quiz': () => ({ questions }) });
    renderApp(<InterviewPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Start 10 questions: All topics' }));
    await screen.findByText('What does an index speed up?');
    await userEvent.keyboard('{Control>}c{/Control}');
    await userEvent.keyboard('{Meta>}a{/Meta}');
    await userEvent.keyboard('{Alt>}d{/Alt}');
    expect(fetchMock.mock.calls.some(([u]) => (u as string | URL).toString().includes('/answer'))).toBe(false);
    expect(screen.getByRole('button', { name: /Backups/ })).toBeEnabled();
  });

  it('opens the question again when an answer could not be saved, and says so', async () => {
    let fail = true;
    routes({
      'GET /api/interview/quiz': () => ({ questions }),
      'POST /api/interview/questions/1/answer': () => (fail ? new Response('{"error":"down"}', { status: 503 }) : { correct: true, answer: 1, explanation: 'Indexes find rows fast.' }),
    });
    renderApp(<InterviewPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Start 10 questions: All topics' }));
    await userEvent.click(await screen.findByRole('button', { name: /Lookups/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Could not save your answer/);
    // Not stuck: the choices take a press again.
    fail = false;
    await userEvent.click(screen.getByRole('button', { name: /Lookups/ }));
    expect(await screen.findByText('Correct')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('says so when a round cannot start', async () => {
    routes({ 'GET /api/interview/quiz': () => new Response('{"error":"down"}', { status: 503 }) });
    renderApp(<InterviewPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Start 10 questions: All topics' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start 10 questions: All topics' })).toBeEnabled();
  });

  it('plays a simulation: read the email, reply, see every rating and the debrief', async () => {
    const sent: unknown[] = [];
    routes({
      'GET /api/interview/scenarios/backend-first-week': () => ({ scenario: card, steps, answered: [] }),
      'POST /api/interview/scenarios/backend-first-week/steps/0/answer': (init) => {
        sent.push(jsonBody(init));
        return reveal(0, 1, 'best', 2);
      },
      'POST /api/interview/scenarios/backend-first-week/steps/1/answer': (init) => {
        sent.push(jsonBody(init));
        return reveal(1, 0, 'okay', 1);
      },
    });
    renderApp(<InterviewPage />);
    await userEvent.click(await screen.findByRole('tab', { name: /Work simulations/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Start: Your first week on the API team' }));

    const email = await screen.findByRole('article', { name: /Welcome! Your first ticket/ });
    expect(within(email).getByText('Senior backend engineer')).toBeInTheDocument();
    expect(within(email).getByText(/Take WERA-412/)).toBeInTheDocument();
    expect(screen.getByRole('list', { name: "Who's who" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /^B: A plan and an ask/ }));
    expect(await screen.findByText('Why 1B')).toBeInTheDocument();
    expect(screen.getByText('Why 1C')).toBeInTheDocument(); // every reply explains itself
    expect(screen.getByText(/Best reply · your pick/)).toBeInTheDocument();
    expect(screen.getByText('Takeaway 1')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Next email/ }));

    const second = await screen.findByRole('article', { name: /Staging is down/ });
    expect(within(second).getByText(/Cc: Amara Osei/)).toBeInTheDocument();
    await userEvent.keyboard('a');
    expect(await screen.findByText(/Okay · your pick/)).toBeInTheDocument();
    await userEvent.keyboard('{Enter}');

    expect(await screen.findByText('3/4')).toBeInTheDocument();
    expect(screen.getByText('Your debrief')).toBeInTheDocument();
    expect(screen.getByText('Takeaway 2')).toBeInTheDocument();
    expect(sent).toEqual([{ choice: 1 }, { choice: 0 }]);
  });

  it('picks a half-done simulation back up where it stopped', async () => {
    routes({
      'GET /api/interview/scenarios/backend-first-week': () => ({
        scenario: { ...card, progress: { answered: 1, points: 2, best: -1, choices: [1, -1] } }, steps, answered: [reveal(0, 1, 'best', 2)],
      }),
    });
    renderApp(<InterviewPage />, { path: '/interview?sim=backend-first-week' });
    expect(await screen.findByRole('article', { name: /Staging is down/ })).toBeInTheDocument();
    expect(screen.getByText('Email 2 of 2')).toBeInTheDocument();
  });

  it('puts jobs being interviewed for on top, with their topics and a track to practice', async () => {
    routes({
      'GET /api/jobs': (_init, url) => {
        expect(url.searchParams.get('status')).toBe('interviewing');
        return { count: 1, jobs: [{ id: 7, title: 'Senior Frontend Engineer', company: 'Acme' }] };
      },
      'GET /api/jobs/7': () => ({ id: 7, title: 'Senior Frontend Engineer', company: 'Acme', deep: { raw: { interview_topics: ['React rendering and state'] } } }),
    });
    renderApp(<InterviewPage />);
    expect(await screen.findByText('React rendering and state')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Practice for it/ }));
    expect(screen.getByRole('combobox', { name: 'Role' })).toHaveValue('frontend');
  });
});

describe('interview helpers', () => {
  it('picks one next step: a half-done simulation, then missed questions, then the least-done topic, then a new simulation', () => {
    const t = tracks.tracks[0];
    const d = [
      { domain: 'APIs & backend', kind: 'technical' as const, questions: 10, answered: 6, correct: 3 },
      { domain: 'Databases', kind: 'technical' as const, questions: 6, answered: 1, correct: 1 },
      { domain: 'Behavioral', kind: 'behavioral' as const, questions: 8, answered: 8, correct: 4 },
    ];
    const going = { ...card, progress: { answered: 1, points: 2, best: -1 } };
    expect(upNext(t, d, [going], { streak: 0, week: 0, missed: 3 })).toMatchObject({ kind: 'sim' });
    expect(upNext(t, d, [card], { streak: 0, week: 0, missed: 3 })).toEqual({ kind: 'missed', count: 3 });
    // Databases has the most left to see (1 of 6); Behavioral is done.
    expect(upNext(t, d, [card], { streak: 0, week: 0, missed: 0 })).toMatchObject({ kind: 'topic', domain: { domain: 'Databases' } });
    const done = d.map((x) => ({ ...x, answered: x.questions }));
    expect(upNext(t, done, [card])).toMatchObject({ kind: 'start-sim', sim: { id: 'backend-first-week' } });
    expect(upNext(t, done, [{ ...card, progress: { answered: 0, points: 0, best: 3 } }])).toBeNull();
  });


  it('reads a key press as a reply, next, or nothing', () => {
    const key = (init: KeyboardEventInit, target: HTMLElement = document.body) => {
      const e = new KeyboardEvent('keydown', { bubbles: true, ...init });
      Object.defineProperty(e, 'target', { value: target });
      return practiceKey(e);
    };
    expect(key({ key: 'b' })).toBe(1);
    expect(key({ key: 'D' })).toBe(3);
    expect(key({ key: 'Enter' })).toBe('next');
    expect(key({ key: 'ArrowRight' })).toBe('next');
    expect(key({ key: 'c', ctrlKey: true })).toBeNull();
    expect(key({ key: 'a', metaKey: true })).toBeNull();
    expect(key({ key: 'a', repeat: true })).toBeNull();
    expect(key({ key: 'e' })).toBeNull();
    // Typing in a field is typing, and Enter on a button is that button's press.
    expect(key({ key: 'a' }, document.createElement('textarea'))).toBeNull();
    expect(key({ key: 'Enter' }, document.createElement('button'))).toBeNull();
    expect(key({ key: 'a' }, document.createElement('button'))).toBe(0);
  });

  it('maps job titles to tracks', () => {
    expect(trackForTitle('Senior Backend Engineer')).toBe('backend');
    expect(trackForTitle('Software Engineer II')).toBe('backend');
    expect(trackForTitle('Frontend Developer (React)')).toBe('frontend');
    expect(trackForTitle('Full-Stack Engineer')).toBe('fullstack');
    expect(trackForTitle('Site Reliability Engineer')).toBe('infra');
    expect(trackForTitle('Data Analyst')).toBe('data');
    expect(trackForTitle('iOS Engineer')).toBe('mobile');
    expect(trackForTitle('Product Manager, Growth')).toBe('product');
    expect(trackForTitle('Registered Nurse')).toBe('general');
  });

  it('builds a round query: a domain wins over its track', () => {
    expect(quizQuery({ track: 'backend', stack: ['go', 'sql'], missed: true })).toBe('limit=10&track=backend&stack=go%2Csql&missed=1');
    expect(quizQuery({ track: 'backend', domain: 'Databases', difficulty: 'hard' })).toBe('limit=10&domain=Databases&difficulty=hard');
  });
});
