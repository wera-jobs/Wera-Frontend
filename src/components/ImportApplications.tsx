// Settings › Import applications: a CSV from a spreadsheet or another
// tracker becomes tracked jobs. The columns are guessed from the header
// and can be changed; the server checks every row before anything is saved.
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Upload } from 'lucide-react';
import { api, errorMessage } from '../api/client';
import { FIELD_LABEL, IMPORT_FIELDS, guessColumns, parseCSV, type ImportField } from '../lib/csv';
import { toast } from '../lib/toast';

interface Result {
  row: number;
  ok: boolean;
  error?: string;
  status?: string;
}

const MAX = 500;
const SELECT = 'rounded-lg border border-border bg-surface-2 px-2 py-1 text-xs text-text';

export function ImportApplications() {
  const qc = useQueryClient();
  const [header, setHeader] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [cols, setCols] = useState<Record<ImportField, number> | null>(null);
  const [checked, setChecked] = useState<Result[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState('');

  const load = async (file: File) => {
    const all = parseCSV(await file.text());
    setFileName(file.name);
    setChecked(null);
    if (all.length < 2) {
      toast.error('That file has no rows under its header.');
      return;
    }
    setHeader(all[0]);
    setRows(all.slice(1, MAX + 1));
    setCols(guessColumns(all[0]));
    if (all.length - 1 > MAX) toast.error(`Only the first ${MAX} rows are imported at a time.`);
  };
  const payload = () =>
    rows.map((r) => Object.fromEntries(IMPORT_FIELDS.map((f) => [f, cols && cols[f] >= 0 ? (r[cols[f]] ?? '') : ''])));
  const send = async (dryRun: boolean) => {
    setBusy(true);
    try {
      const out = await api<{ results: Result[]; imported: number }>('/api/applications/import', {
        method: 'POST',
        body: JSON.stringify({ rows: payload(), dry_run: dryRun }),
      });
      setChecked(out.results);
      if (!dryRun) {
        toast.success(`Imported ${out.imported} job${out.imported === 1 ? '' : 's'} into your tracker.`);
        void qc.invalidateQueries();
      }
    } catch (e) {
      toast.error(`Couldn't import: ${errorMessage(e)}`);
    } finally {
      setBusy(false);
    }
  };
  const ok = checked?.filter((r) => r.ok).length ?? 0;
  const bad = checked?.filter((r) => !r.ok) ?? [];
  const reset = () => {
    setRows([]);
    setChecked(null);
    setCols(null);
  };

  return (
    <div className="space-y-3">
      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium text-text hover:border-accent/40">
        <Upload className="size-3.5" /> {fileName ? 'Choose another CSV' : 'Choose a CSV'}
        <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => e.target.files?.[0] && void load(e.target.files[0])} />
      </label>
      {cols && rows.length > 0 && (
        <div className="space-y-3 rounded-card border border-border p-3">
          <p className="text-xs text-muted">
            {rows.length} row{rows.length === 1 ? '' : 's'} in {fileName}. Check which column holds what:
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {IMPORT_FIELDS.map((f) => (
              <label key={f} className="flex items-center justify-between gap-2 text-xs text-text">
                {FIELD_LABEL[f]}
                <select
                  className={SELECT}
                  value={cols[f]}
                  onChange={(e) => {
                    setCols({ ...cols, [f]: Number(e.target.value) });
                    setChecked(null);
                  }}
                >
                  <option value={-1}>(none)</option>
                  {header.map((h, i) => (
                    <option key={i} value={i}>
                      {h || `Column ${i + 1}`}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          {checked == null ? (
            <button type="button" disabled={busy} onClick={() => void send(true)} className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-bg hover:bg-accent/85 disabled:opacity-60">
              {busy ? 'Checking…' : 'Check the rows'}
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-text">
                {ok} ready to import{bad.length ? `, ${bad.length} can't be read:` : '.'}
              </p>
              {bad.length > 0 && (
                <ul className="max-h-40 space-y-0.5 overflow-y-auto text-xs text-muted">
                  {bad.slice(0, 50).map((r) => (
                    <li key={r.row}>
                      Row {r.row + 1}: {r.error}
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2">
                <button type="button" disabled={busy || ok === 0} onClick={() => void send(false)} className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-bg hover:bg-accent/85 disabled:opacity-60">
                  {busy ? 'Importing…' : `Import ${ok}`}
                </button>
                <button type="button" onClick={reset} className="rounded-lg px-3 py-1.5 text-xs text-muted hover:text-text">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
