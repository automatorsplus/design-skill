// Adaptive type scaling for the design engine. Original implementation.
//
// Headlines and body copy auto-fit so they fill the content column without
// overflowing it. Each size is the SMALLEST cap implied by the text's
// character count, line count and (for headlines) its longest single line.

type Threshold = readonly [over: number, size: number];

/** Walk thresholds (ordered largest-`over` first); return the first match, else `base`. */
function step(value: number, thresholds: readonly Threshold[], base: number): number {
  for (const [over, size] of thresholds) {
    if (value > over) return size;
  }
  return base;
}

function metrics(text: string) {
  const lines = text.split("\n");
  return {
    chars: text.replace(/\n/g, "").length,
    lineCount: lines.length,
    longestLine: lines.reduce((max, line) => Math.max(max, line.length), 0),
  };
}

/** Headline / hook size, 88–170px. */
export function hookSize(text: string): number {
  const { chars, lineCount, longestLine } = metrics(text);
  const byChars = step(chars, [[70, 104], [50, 120], [30, 140], [20, 156]], 170);
  const byLines = step(lineCount, [[4, 104], [3, 120], [2, 144]], 170);
  // Wide display faces can overflow on a long single word — cap by longest line.
  const byWidth =
    lineCount > 1 ? step(longestLine, [[14, 88], [12, 108], [10, 124], [8, 140]], 170) : 170;
  return Math.min(byChars, byLines, byWidth);
}

/** Body copy size, 48–88px. */
export function bodySize(text: string): number {
  const { chars, lineCount } = metrics(text);
  const byChars = step(chars, [[160, 48], [120, 56], [80, 64], [40, 76]], 88);
  const byLines = step(lineCount, [[6, 48], [5, 54], [4, 62], [3, 72]], 88);
  return Math.min(byChars, byLines);
}

/** Pros/cons points size, 44–62px. */
export function pointsSize(points: ReadonlyArray<{ text: string }>): number {
  const count = points.length;
  const longest = points.reduce((max, p) => Math.max(max, p.text.length), 0);
  const byCount =
    count >= 6 ? 44 : count >= 5 ? 48 : count >= 4 ? 54 : count >= 3 ? 58 : 62;
  const byLength = step(longest, [[50, 44], [40, 50], [30, 56]], 62);
  return Math.min(byCount, byLength);
}
