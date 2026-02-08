const SUFFIXES = [
  "ning","ni","ga","da","dan","lar","lari","imiz","ingiz","miz","siz",
  "lik","chi","kor","viy","iy","cha","ku","mi","mikan","dir"
];

function normalizeUz(s: string) {
  return s
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/o‘|oʻ/g, "o'")
    .replace(/g‘|gʻ/g, "g'")
    .replace(/[^a-z0-9o'g'\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripSuffix(word: string) {
  let w = word;
  for (const suf of SUFFIXES) {
    if (w.length > suf.length + 2 && w.endsWith(suf)) {
      w = w.slice(0, -suf.length);
      break;
    }
  }
  return w;
}

export function tokenize(text: string) {
  const norm = normalizeUz(text);
  return norm.split(/\s+/).filter(Boolean);
}

/**
 * OLD: faqat word + count
 */
export function detectLoanwords(tokens: string[], loanwordSet: Set<string>) {
  const hits = new Map<string, number>();

  for (const t of tokens) {
    const base = stripSuffix(t);
    const key = loanwordSet.has(t) ? t : (loanwordSet.has(base) ? base : null);
    if (key) hits.set(key, (hits.get(key) || 0) + 1);
  }

  return [...hits.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * NEW: word + count + origin
 * loanwordMap: Map<word, origin>
 */
export function detectLoanwordsWithOrigin(
  tokens: string[],
  loanwordMap: Map<string, string>
) {
  const hits = new Map<string, { count: number; origin: string }>();

  for (const t of tokens) {
    const base = stripSuffix(t);

    // qaysi key mos keldi?
    const key = loanwordMap.has(t) ? t : loanwordMap.has(base) ? base : null;
    if (!key) continue;

    const origin = loanwordMap.get(key) || "Noma’lum";

    if (!hits.has(key)) hits.set(key, { count: 0, origin });
    hits.get(key)!.count++;
  }

  return [...hits.entries()]
    .map(([word, v]) => ({
      word,
      count: v.count,
      origin: v.origin,
    }))
    .sort((a, b) => b.count - a.count);
}
