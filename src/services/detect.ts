const SUFFIXES = [
  "ning","ni","ga","da","dan","lar","lari","imiz","ingiz","miz","siz",
  "iz","lik","chi","kor","viy","iy","cha","ku","mi","mikan","dir"
];

// Ko'p belgili ketma-ketliklar birinchi bo'lishi shart
const CYRILLIC_MAP: [RegExp, string][] = [
  [/нг/g,  "ng"],
  [/ч/g,   "ch"],
  [/ш/g,   "sh"],
  [/щ/g,   "sh"],
  [/ю/g,   "yu"],
  [/я/g,   "ya"],
  [/ё/g,   "yo"],
  [/е/g,   "e"],
  [/э/g,   "e"],
  [/ғ/g,   "g'"],
  [/қ/g,   "q"],
  [/ҳ/g,   "h"],
  [/ў/g,   "o'"],
  [/а/g,   "a"],  [/б/g, "b"],  [/в/g, "v"],  [/г/g, "g"],
  [/д/g,   "d"],  [/ж/g, "j"],  [/з/g, "z"],  [/и/g, "i"],
  [/й/g,   "y"],  [/к/g, "k"],  [/л/g, "l"],  [/м/g, "m"],
  [/н/g,   "n"],  [/о/g, "o"],  [/п/g, "p"],  [/р/g, "r"],
  [/с/g,   "s"],  [/т/g, "t"],  [/у/g, "u"],  [/ф/g, "f"],
  [/х/g,   "x"],  [/ц/g, "ts"], [/ъ/g, "'"],  [/ь/g, ""],
];

function cyrillicToLatin(text: string): string {
  const lower = text.toLowerCase();
  return CYRILLIC_MAP.reduce((s, [from, to]) => s.replace(from, to), lower);
}

function normalizeUz(s: string) {
  return cyrillicToLatin(s)
    .replace(/[''`]/g, "'")
    .replace(/o'|oʻ/g, "o'")
    .replace(/g'|gʻ/g, "g'")
    .replace(/[^a-z0-9o'g'\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// O'zbek matinida tez-tez uchraydigan imlo variantlari
const SPELLING_VARIANTS: Record<string, string> = {
  "kampyuter":  "kompyuter",
  "komputer":   "kompyuter",
  "computer":   "kompyuter",
  "noutbook":   "noutbuk",
  "smartfone":  "smartfon",
  "smartphone": "smartfon",
  "telefone":   "telefon",
  "brauser":    "brauzer",
  "online":     "onlayn",
  "oflayn":     "offline",
};

function normalizeSpelling(token: string): string {
  return SPELLING_VARIANTS[token] ?? token;
}

function stripSuffix(word: string) {
  let w = word;
  let changed = true;
  while (changed) {
    changed = false;
    for (const suf of SUFFIXES) {
      if (w.length > suf.length + 2 && w.endsWith(suf)) {
        w = w.slice(0, -suf.length);
        changed = true;
        break;
      }
    }
  }
  return w;
}

// ─── Levenshtein masofasi ────────────────────────────────────────────────────
function levenshtein(a: string, b: string, maxD: number): number {
  if (Math.abs(a.length - b.length) > maxD) return maxD + 1;
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  // Faqat bitta qator kerak (space-efficient)
  let row = Array.from({ length: n + 1 }, (_, i) => i);

  for (let i = 1; i <= m; i++) {
    let prev = row[0];
    row[0] = i;
    let rowMin = row[0];

    for (let j = 1; j <= n; j++) {
      const temp = row[j];
      row[j] = a[i - 1] === b[j - 1]
        ? prev
        : 1 + Math.min(prev, row[j], row[j - 1]);
      prev = temp;
      if (row[j] < rowMin) rowMin = row[j];
    }
    // Erta chiqish: qator minimumi maxD dan oshsa foydasiz
    if (rowMin > maxD) return maxD + 1;
  }
  return row[n];
}

// So'z uzunligiga qarab ruxsat etilgan max xatolar soni
function maxDist(len: number): number {
  if (len <= 4) return 0; // qisqa so'zlar — faqat aniq
  if (len <= 7) return 1; // o'rta — 1 ta xato
  return 2;               // uzun — 2 ta xato
}

// Fuzzy qidirish: lug'atdan eng yaqin so'zni topadi
function fuzzyLookup(base: string, keys: string[]): string | null {
  const max = maxDist(base.length);
  if (max === 0) return null;

  let bestKey: string | null = null;
  let bestDist = max + 1;

  for (const key of keys) {
    const d = levenshtein(base, key, max);
    if (d < bestDist) {
      bestDist = d;
      bestKey = key;
      if (d === 1 && max === 1) break; // eng yaxshi natija, erta chiqish
    }
  }

  return bestDist <= max ? bestKey : null;
}
// ─────────────────────────────────────────────────────────────────────────────

export function tokenize(text: string) {
  const norm = normalizeUz(text);
  return norm.split(/\s+/).filter(Boolean);
}

export function detectLoanwords(tokens: string[], loanwordSet: Set<string>) {
  const keys = [...loanwordSet];
  const hits = new Map<string, number>();

  for (const raw of tokens) {
    const t = normalizeSpelling(raw);
    const base = normalizeSpelling(stripSuffix(t));
    const key =
      loanwordSet.has(t) ? t :
      loanwordSet.has(base) ? base :
      fuzzyLookup(base, keys);
    if (key) hits.set(key, (hits.get(key) || 0) + 1);
  }

  return [...hits.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count);
}

export type LoanwordEntry = { origin: string; alternative: string };

export function detectLoanwordsWithOrigin(
  tokens: string[],
  loanwordMap: Map<string, LoanwordEntry>
) {
  const keys = [...loanwordMap.keys()];
  const hits = new Map<string, { count: number; rawTokens: Set<string> } & LoanwordEntry>();

  for (const raw of tokens) {
    const t = normalizeSpelling(raw);
    const base = normalizeSpelling(stripSuffix(t));

    const key =
      loanwordMap.has(t)    ? t :
      loanwordMap.has(base) ? base :
      fuzzyLookup(base, keys); // ← imlo xatosi uchun fallback

    if (!key) continue;

    const entry = loanwordMap.get(key)!;
    if (!hits.has(key)) hits.set(key, { count: 0, rawTokens: new Set(), ...entry });
    hits.get(key)!.count++;
    hits.get(key)!.rawTokens.add(raw);
  }

  return [...hits.entries()]
    .map(([word, v]) => ({
      word,
      count: v.count,
      origin: v.origin,
      alternative: v.alternative,
      tokens: [...v.rawTokens],
    }))
    .sort((a, b) => b.count - a.count);
}
