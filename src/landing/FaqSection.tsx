import { useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';

interface FaqItem {
  q: string;
  a: string;
}

const FAQS: FaqItem[] = [
  {
    q: 'Is Wera free to use?',
    a: 'Yes. Creating an account, getting daily resume-scored job matches, tracking your applications, and looking up US employer wage and H-1B sponsorship records are free.',
  },
  {
    q: 'Does Wera auto-apply to hundreds of jobs in the background?',
    a: 'No. Mass auto-applying hurts response rates and risks wrong answers on employer forms. Wera fills multi-page applications on Workday, Greenhouse, Lever, Ashby, iCIMS, and Oracle through the Chrome extension, drafts open-ended responses in your voice, and hands the page back to you to review and press submit.',
  },
  {
    q: 'Will resume tailoring invent skills or experience I do not have?',
    a: 'No. Tailoring only reorders and rewrites bullets already on your resume so your relevant work stands out and fits cleanly on one page. Every edit is visible side by side before you export a PDF.',
  },
  {
    q: 'How fresh are the job postings and where do they come from?',
    a: 'Wera checks over 5,100 company career pages directly every day instead of scraping recycled job-board reposts. New roles show up quickly, and closed postings drop out when the employer removes them.',
  },
  {
    q: 'Is Wera only for international students or H-1B candidates?',
    a: 'Not at all. Wera is built for every jobseeker. Every US employer is paired with public Department of Labor wage filings so anyone can check real base-pay ranges before applying, and international candidates also get clear sponsorship history without guessing.',
  },
  {
    q: 'How is my resume and personal information handled?',
    a: 'Your resume and profile are used strictly to score roles for you, tailor your documents, and fill forms you initiate. We do not sell candidate profiles to recruiters or third-party data brokers.',
  },
];

/** Editorial Q&A accordion for common questions before signing up. */
export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="scroll-mt-20 border-t border-border">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-4 py-20 sm:px-6 sm:py-24 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)]">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="font-mono text-xs tracking-wider text-faint uppercase">Questions</p>
          <h2 className="font-display mt-3 text-3xl font-normal tracking-[-0.02em] sm:text-4xl">
            Common questions.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Plain answers about how Wera finds roles, handles your resume, and helps you apply. Still have a question? Visit our{' '}
            <Link to="/help" className="text-text underline decoration-border underline-offset-4 hover:decoration-text">help center</Link> or{' '}
            <Link to="/contact" className="text-text underline decoration-border underline-offset-4 hover:decoration-text">contact us</Link>.
          </p>
        </div>

        <div className="divide-y divide-border border-y border-border">
          {FAQS.map((item, i) => {
            const open = openIndex === i;
            const panelId = `faq-panel-${i}`;
            return (
              <div key={item.q}>
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => setOpenIndex(open ? null : i)}
                  className="flex w-full items-center justify-between gap-4 py-5 text-left"
                >
                  <span className="text-base font-medium text-text">{item.q}</span>
                  <ChevronDown
                    className={clsx(
                      'size-4 shrink-0 text-faint transition-transform duration-200',
                      open && 'rotate-180 text-text',
                    )}
                  />
                </button>
                {open && (
                  <div id={panelId} className="pb-5 pr-8 text-sm leading-relaxed text-muted">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
