import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import type { Layout, ResumeData } from '../api/resumes';
import { Toasts } from '../lib/toast';
import { jsonBody, mockApi, renderApp } from '../test/render';
import { LatexEditor } from './LatexEditor';

const data = { name: 'Ada Lovelace', sections: [] } as unknown as ResumeData;

/** The editor with a template switch, as the resume toolbar drives it. */
function WithToolbar() {
  const [template, setTemplate] = useState('ivy');
  const layout = { template, accent: '#000000', paper: 'us-letter', font_size: 11, spacing: 1, margin: 0.5 } as Layout;
  return (
    <>
      <button type="button" onClick={() => setTemplate('ledger')}>Ledger</button>
      <LatexEditor data={data} layout={layout} filename="resume.tex" onApply={() => {}} onPreview={() => {}} />
      <Toasts />
    </>
  );
}

function stub() {
  mockApi({
    'POST /api/resumes/tex': (init) => {
      const t = jsonBody<{ layout: Layout }>(init).layout.template;
      return { tex: '', preamble: `% ${t} preamble\n`, body: `\\resumeHeader{Ada Lovelace} % ${t} body` };
    },
    'POST /api/resumes/parse-tex': () => ({ data, warnings: [] }),
  });
}

describe('LatexEditor and a new look', () => {
  it('keeps unsaved edits when the template changes', async () => {
    stub();
    renderApp(<WithToolbar />);
    const editor = await screen.findByLabelText('LaTeX');
    await waitFor(() => expect(editor).toHaveValue('\\resumeHeader{Ada Lovelace} % ivy body'));
    await userEvent.type(editor, ' my edit');
    await userEvent.click(screen.getByRole('button', { name: 'Ledger' }));
    expect(await screen.findByText(/Your LaTeX edits are kept/)).toBeInTheDocument();
    expect(screen.getByLabelText('LaTeX')).toHaveValue('\\resumeHeader{Ada Lovelace} % ivy body my edit');
  });

  it('follows the new look when there are no edits', async () => {
    stub();
    renderApp(<WithToolbar />);
    const editor = await screen.findByLabelText('LaTeX');
    await waitFor(() => expect(editor).toHaveValue('\\resumeHeader{Ada Lovelace} % ivy body'));
    await userEvent.click(screen.getByRole('button', { name: 'Ledger' }));
    await waitFor(() => expect(screen.getByLabelText('LaTeX')).toHaveValue('\\resumeHeader{Ada Lovelace} % ledger body'));
  });
});
