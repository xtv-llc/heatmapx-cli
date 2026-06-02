export interface Suggestion {
  index: number;
  title: string;
  body: string;
}

const SUGGESTIONS_HEADING = /^##\s+改善提案/m;
const NEXT_TOP_HEADING = /^##\s+/m;
const ITEM_HEADING = /^###\s+(\d+)\.\s+(.+?)\s*$/gm;

export function extractSuggestions(markdown: string): Suggestion[] {
  const startMatch = markdown.match(SUGGESTIONS_HEADING);
  if (!startMatch || startMatch.index === undefined) return [];

  const sectionStart = startMatch.index + startMatch[0].length;
  const rest = markdown.slice(sectionStart);
  const nextTop = rest.match(NEXT_TOP_HEADING);
  const sectionEnd = nextTop?.index ?? rest.length;
  const section = rest.slice(0, sectionEnd);

  const headings: Array<{ index: number; title: string; offset: number; endOfHeading: number }> = [];
  for (const m of section.matchAll(ITEM_HEADING)) {
    if (m.index === undefined) continue;
    headings.push({
      index: Number(m[1]),
      title: m[2].trim(),
      offset: m.index,
      endOfHeading: m.index + m[0].length,
    });
  }

  return headings.map((h, i) => {
    const bodyEnd = headings[i + 1]?.offset ?? section.length;
    const body = section.slice(h.endOfHeading, bodyEnd).trim();
    return { index: h.index, title: h.title, body };
  });
}
