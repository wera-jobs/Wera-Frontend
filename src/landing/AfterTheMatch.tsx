import { useState } from 'react';
import clsx from 'clsx';
import { useTheme } from '../lib/theme';

const ITEMS = [
  {
    id: 'resume',
    title: 'Resume editor',
    body: 'Edit your resume as a form and watch the page change beside it. Pick one of four designs, fit it to one page in a click, and download a PDF or LaTeX. A review flags weak bullets as you write.',
    alt: 'The resume editor: a form on the left and the finished page on the right, with a review score of 98.',
  },
  {
    id: 'tailor',
    title: 'A copy for each job',
    body: 'Wera reorders your skills and rewords your bullets for one posting, and it can only use what is already on your resume. No new roles, numbers or skills. A cover letter for the same job takes about five seconds, and you can edit every word.',
    alt: 'A job with a tailored resume that covers 86 percent of the keywords in the posting.',
  },
  {
    id: 'tracker',
    title: 'Application tracker',
    body: 'Saved, applied, interviewing, offer, rejected. Drag cards across one board. When you submit through the extension, the job moves to Applied on its own.',
    alt: 'A board of job applications in columns from Saved to Rejected.',
  },
  {
    id: 'interview',
    title: 'Interview prep',
    body: 'Short multiple-choice rounds on algorithms, system design, databases, operating systems, machine learning and behavioral questions. Every answer comes with an explanation.',
    alt: 'A system design question, answered correctly, with the explanation below it.',
  },
  {
    id: 'community',
    title: 'Community',
    body: 'Offers, interview stories and hard-won tips from people in the same search. Every post is reviewed before it goes live, so the feed stays useful.',
    alt: 'The community feed with posts about offers, interviews and sponsorship.',
  },
];

function screen(id: string, size: 'wide' | 'phone', theme: string) {
  return `/landing/${id}-${size}-${theme}.webp`;
}

/**
 * The features section: a plain list beside one real screen of the product.
 * On phones each row opens onto the same screen as it looks on a phone. The
 * pictures come from scripts/landing-shots.mjs.
 */
export function AfterTheMatch() {
  const { theme } = useTheme();
  const [active, setActive] = useState(0);
  return (
    <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-28 sm:px-6">
      <div className="grid items-start gap-x-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Everything after the match.</h2>
          <p className="mt-3 max-w-md leading-relaxed text-muted">
            Your resume, your applications and your interview prep sit next to your jobs, so nothing ends up in a spreadsheet.
          </p>
          <ul className="mt-9 border-b border-border">
            {ITEMS.map((item, i) => {
              const open = i === active;
              return (
                <li key={item.id} className={clsx('border-t transition-colors', open ? 'border-text' : 'border-border')}>
                  <h3>
                    <button
                      type="button"
                      aria-expanded={open}
                      aria-controls={`feature-${item.id}`}
                      onClick={() => setActive(i)}
                      className={clsx('w-full py-3.5 text-left text-[15px] font-medium transition-colors', open ? 'text-text' : 'text-muted hover:text-text')}
                    >
                      {item.title}
                    </button>
                  </h3>
                  <div id={`feature-${item.id}`} className={clsx('grid transition-[grid-template-rows] duration-200 ease-out', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
                    <div className="min-h-0 overflow-hidden" inert={!open}>
                      <p className="max-w-md pb-5 text-sm leading-relaxed text-muted">{item.body}</p>
                      {open && (
                        <div className="mb-6 flex h-[26rem] justify-center overflow-hidden rounded-lg bg-surface-2 px-6 pt-6 lg:hidden">
                          <img src={screen(item.id, 'phone', theme)} alt={item.alt} width={390} height={700} decoding="async"
                            className="h-auto w-full max-w-[17.5rem] self-start rounded-t-[1.25rem] border border-b-0 border-border" />
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
        {/* Every screen is stacked here so changing rows never waits for a picture. */}
        <div className="relative hidden aspect-[6/5] overflow-hidden rounded-lg bg-surface-2 lg:block">
          {ITEMS.map((item, i) => (
            <img
              key={item.id}
              src={screen(item.id, 'wide', theme)}
              alt={i === active ? item.alt : ''}
              aria-hidden={i !== active}
              loading="lazy"
              decoding="async"
              className={clsx(
                'absolute top-9 left-9 w-[125%] max-w-none rounded-tl-lg border-t border-l border-border transition-opacity duration-200',
                i === active ? 'opacity-100' : 'opacity-0',
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
