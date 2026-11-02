/** Where a word on a looping row lands in a window starting at `left`: from -width, so one leaving the left edge still shows. */
export function wrappedX(wordX: number, width: number, left: number, line: number): number {
  const x = (wordX - left + width) % line;
  return (x < 0 ? x + line : x) - width;
}
