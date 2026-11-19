import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Referrals } from '../components/Referrals';
import { applicant, stubApi } from '../test/fixtures';
import { jsonBody, renderApp } from '../test/render';
import { referralQuestion, referralSearches, roleOf } from './referrals';

// The same cases as the extension's, so the two offer the same searches.
const me = {
  education: [{ school: 'University of Texas at Austin' }, { school: 'University of Texas at Austin' }, { school: 'Austin Community College' }],
  experience: [
    { title: 'SRE', company: 'Globex', current: true },
    { title: 'Intern', company: 'Acme', current: false },
    { title: 'Ops', company: 'Initech', current: false },
    { title: 'Ops', company: 'Hooli', current: false },
  ],
};

describe('referralSearches', () => {
  it('starts with schoolmates, then former colleagues, then recruiters and the role', () => {
    const s = referralSearches('Acme', 'Site Reliability Engineer', me);
    expect(s.map((x) => x.label)).toEqual([
      'University of Texas at Austin alumni at Acme',
      'Austin Community College alumni at Acme',
      'Former Globex people at Acme',
      'Former Initech people at Acme',
      'Recruiters at Acme',
      'Site Reliability Engineer people at Acme',
    ]);
    expect(s[0].url).toBe('https://www.linkedin.com/search/results/people/?keywords=Acme%20University%20of%20Texas%20at%20Austin&origin=GLOBAL_SEARCH_HEADER');
  });

  it('still helps without a profile, and needs a company', () => {
    expect(referralSearches('Acme', 'SRE', null).map((x) => x.label)).toEqual(['Recruiters at Acme', 'SRE people at Acme']);
    expect(referralSearches('', 'SRE', me)).toEqual([]);
  });

  it.each([
    ['Account Executive - Commercial, Spotify Technology', 'Spotify', 'Account Executive'],
    ['Senior SRE (Platform)', 'Acme', 'Senior SRE'],
    ['Acme Software Engineer', 'Acme', 'Software Engineer'],
    ['Data Scientist | Ads', 'Acme', 'Data Scientist'],
    ['Engineer II, Data Platform', 'Acme', 'Engineer II'],
  ])('names the role in %s', (title, company, want) => {
    expect(roleOf(title, company)).toBe(want);
  });

  it('asks for a note that invents nothing', () => {
    expect(referralQuestion('Acme', 'SRE')).toMatch(/under 300 characters.*Acme.*SRE.*Do not invent/s);
  });
});

describe('Referrals in the job view', () => {
  it('lists the searches from the profile and drafts a note to copy', async () => {
    const asked: unknown[] = [];
    stubApi({
      'GET /api/applicant': () => ({ applicant, saved: true, ...me }),
      'POST /api/ext/answer': (init) => {
        asked.push(jsonBody(init));
        return { answer: 'Hi [Name], I am applying for the SRE role at Acme and would value a referral.' };
      },
    });
    renderApp(<Referrals jobId={9} company="Acme" title="Site Reliability Engineer" />);
    expect(await screen.findByRole('link', { name: /University of Texas at Austin alumni at Acme/ })).toHaveAttribute('target', '_blank');
    await userEvent.click(screen.getByRole('button', { name: /Draft a note/ }));
    expect(await screen.findByLabelText('Your note')).toHaveValue('Hi [Name], I am applying for the SRE role at Acme and would value a referral.');
    await waitFor(() => expect(asked[0]).toMatchObject({ job_id: 9, max_words: 60, question: referralQuestion('Acme', 'Site Reliability Engineer') }));
  });
});
