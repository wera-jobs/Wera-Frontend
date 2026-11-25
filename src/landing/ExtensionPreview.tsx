import { CheckCircle2, AlertTriangle, FileText } from 'lucide-react';

const FORM_FIELDS = [
  { label: 'Full name', value: 'Jordan Rivera', filled: true },
  { label: 'Email', value: 'jordan@example.com', filled: true },
  { label: 'LinkedIn', value: 'linkedin.com/in/jrivera', filled: true },
  { label: 'Work authorization', value: 'Authorized to work in the US', filled: true },
];

/** Realistic, grounded preview of Wera's Chrome extension sitting beside an application form. */
export function ExtensionPreview() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface" aria-hidden="true">
      <div className="flex items-center justify-between border-b border-border bg-surface-2/60 px-4 py-2.5 text-[11px] text-faint">
        <span className="font-mono truncate">boards.greenhouse.io / stripe / jobs / 6184920</span>
        <span className="shrink-0 font-mono text-muted">Wera for Chrome</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-[1.15fr_0.85fr]">
        {/* Application form side */}
        <div className="space-y-3 p-5">
          <div>
            <div className="text-xs font-semibold text-text">Backend Engineer, Payments</div>
            <div className="text-[11px] text-faint">Application form</div>
          </div>
          {FORM_FIELDS.map((f) => (
            <div key={f.label}>
              <div className="mb-1 text-[10px] font-medium text-muted">{f.label}</div>
              <div className="rounded-md border border-good/40 bg-good/5 px-2.5 py-1.5 text-xs text-text">
                {f.value}
              </div>
            </div>
          ))}
          <div className="flex items-start gap-2 rounded-md border border-border bg-bg px-2.5 py-2 text-[11px] text-muted">
            <span className="mt-0.5 size-3.5 shrink-0 rounded-sm border border-border bg-surface" />
            <span>I agree to the candidate privacy notice</span>
          </div>
        </div>

        {/* Wera side panel */}
        <div className="flex flex-col justify-between border-t border-border bg-bg p-4 sm:border-t-0 sm:border-l">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <span className="font-mono text-xs font-semibold text-text">wera</span>
              <span className="font-mono text-[11px] text-good">11 / 12 filled</span>
            </div>

            <div className="rounded-lg border border-border bg-surface p-2.5 text-[11px]">
              <div className="flex items-center gap-1.5 font-medium text-text">
                <FileText className="size-3.5 text-muted" />
                <span>Resume attached</span>
              </div>
              <p className="mt-0.5 text-muted">Jordan_Rivera_Stripe.pdf (tailored)</p>
            </div>

            <div className="rounded-lg border border-warn/30 bg-surface p-2.5 text-[11px]">
              <div className="flex items-center gap-1.5 font-medium text-text">
                <AlertTriangle className="size-3.5 text-warn" />
                <span>Needs you (1)</span>
              </div>
              <p className="mt-0.5 text-muted">Privacy notice checkbox: review and tick yourself.</p>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-good">
              <CheckCircle2 className="size-3.5 shrink-0" />
              <span>Multi-page forms supported</span>
            </div>
          </div>

          <div className="mt-4 border-t border-border pt-3 text-[11px] text-faint">
            Review everything on the page, then press <span className="font-medium text-text">Submit</span> yourself.
          </div>
        </div>
      </div>
    </div>
  );
}
