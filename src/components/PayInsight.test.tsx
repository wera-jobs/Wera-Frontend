import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { JobDetail } from '../api/types';
import { fixtures, stubApi } from '../test/fixtures';
import { renderApp } from '../test/render';
import { Insights } from './JobInsights';
import { PayInsight } from './PayInsight';

describe('pay against H-1B wages', () => {
  it('puts the posted range beside the company and state wages, with their filings', async () => {
    stubApi({
      'GET /api/jobs/5/pay-insight': () => ({
        posted: { low: 140000, high: 170000 },
        company: { low: 110000, median: 122500, high: 135000, count: 6, level: 'II' },
        place: { state: 'TX', low: 105000, median: 125000, high: 160000, count: 40 },
        says: ['Even the posted low ($140k) is above the median of what Acme filed for similar titles ($123k).'],
      }),
    });
    renderApp(<PayInsight jobId={5} company="Acme" />);
    expect(await screen.findByRole('img', { name: 'Posted: $140k to $170k' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Acme: $110k to $135k, median $123k' })).toBeInTheDocument();
    expect(screen.getByText(/level II · 6 filings/)).toBeInTheDocument();
    expect(screen.getByText(/all employers, similar titles · 40 filings/)).toBeInTheDocument();
    expect(screen.getByText(/Even the posted low/)).toBeInTheDocument();
  });

  it('shows nothing without both numbers', async () => {
    stubApi({ 'GET /api/jobs/6/pay-insight': () => ({ posted: { low: 1, high: 2 }, company: null, place: null, says: [] }) });
    const { container } = renderApp(<PayInsight jobId={6} company="Acme" />);
    await new Promise((r) => setTimeout(r, 50));
    expect(container.textContent).toBe('');
  });

  it('leaves no empty section in the job view when there is nothing to compare', async () => {
    const job = { ...fixtures.job, id: 7, pay_min: 120000, pay_max: 150000 } as unknown as JobDetail;
    stubApi({ 'GET /api/jobs/7/pay-insight': () => ({ posted: { low: 120000, high: 150000 }, company: null, place: null, says: [] }) });
    renderApp(<Insights job={job} scoring={false} />);
    expect(await screen.findByText('At a glance')).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText('Pay against H-1B wages')).not.toBeInTheDocument();
  });

  it('titles the section in the job view when there is a comparison', async () => {
    const job = { ...fixtures.job, id: 8, pay_min: 140000, pay_max: 170000 } as unknown as JobDetail;
    stubApi({
      'GET /api/jobs/8/pay-insight': () => ({
        posted: { low: 140000, high: 170000 },
        company: null,
        place: { state: 'IL', low: 105000, median: 125000, high: 160000, count: 40 },
        says: [],
      }),
    });
    renderApp(<Insights job={job} scoring={false} />);
    expect(await screen.findByRole('heading', { name: 'Pay against H-1B wages' })).toBeInTheDocument();
    expect(screen.getAllByText('Pay against H-1B wages')).toHaveLength(1);
  });
});
