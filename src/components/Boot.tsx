import { LogoMark } from './Logo';

/** The screen while the app starts: the same one index.html paints before any code has loaded. */
export function Boot() {
  return (
    <div className="boot">
      <LogoMark size={40} />
    </div>
  );
}
