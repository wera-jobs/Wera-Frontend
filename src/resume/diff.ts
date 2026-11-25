import type { ResumeData } from '../api/resumes';

export interface ResumeChange {
  section: string;
  context: string;
  kind: 'changed' | 'added' | 'hidden';
  before?: string;
  after?: string;
}

/** Compares a base resume against a tailored copy to surface exact bullet, skill, and summary edits. */
export function diffResume(base: ResumeData, tailored: ResumeData): ResumeChange[] {
  const changes: ResumeChange[] = [];
  const baseSections = new Map(base.sections.map((s) => [s.id, s]));

  for (const sec of tailored.sections) {
    const bSec = baseSections.get(sec.id);
    if (!bSec) continue;

    if (sec.kind === 'summary' && (bSec.text ?? '').trim() !== (sec.text ?? '').trim()) {
      changes.push({
        section: sec.title,
        context: 'Summary',
        kind: 'changed',
        before: bSec.text ?? '',
        after: sec.text ?? '',
      });
    }

    if (sec.kind === 'skills' && sec.skills && bSec.skills) {
      const bGroups = new Map(bSec.skills.map((g) => [g.id, g]));
      for (const g of sec.skills) {
        const bg = bGroups.get(g.id);
        if (!bg) {
          changes.push({ section: sec.title, context: g.name, kind: 'added', after: g.items });
        } else if (bg.items.trim() !== g.items.trim()) {
          changes.push({ section: sec.title, context: g.name, kind: 'changed', before: bg.items, after: g.items });
        }
      }
    }

    if (sec.entries && bSec.entries) {
      const bEntries = new Map(bSec.entries.map((e) => [e.id, e]));
      for (const entry of sec.entries) {
        const be = bEntries.get(entry.id);
        if (!be) continue;
        const label = [entry.heading, entry.subheading].filter(Boolean).join(' · ');
        if (entry.hidden && !be.hidden) {
          changes.push({ section: sec.title, context: label, kind: 'hidden', before: 'Shown on base resume' });
          continue;
        }
        const bBullets = new Map((be.bullets ?? []).map((b) => [b.id, b]));
        for (const bul of entry.bullets ?? []) {
          const bb = bBullets.get(bul.id);
          if (!bb) {
            if (!bul.hidden) changes.push({ section: sec.title, context: label, kind: 'added', after: bul.text });
          } else if (bul.hidden && !bb.hidden) {
            changes.push({ section: sec.title, context: label, kind: 'hidden', before: bb.text });
          } else if (!bul.hidden && bb.text.trim() !== bul.text.trim()) {
            changes.push({ section: sec.title, context: label, kind: 'changed', before: bb.text, after: bul.text });
          }
        }
      }
    }
  }

  return changes;
}
