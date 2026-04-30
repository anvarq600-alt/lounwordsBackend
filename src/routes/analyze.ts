import { Router } from "express";
import multer from "multer";
import { getDb } from "../db/mongo.js";
import { extractTextFromBuffer } from "../services/extractText.js";
import { tokenize, detectLoanwordsWithOrigin, type LoanwordEntry } from "../services/detect.js";
import { logger } from "../utils/logger.js";

const upload = multer({ storage: multer.memoryStorage() });
export const analyzeRouter = Router();

// Kesh: bir marta yuklanadi, 10 daqiqada yangilanadi
let cachedMap: Map<string, LoanwordEntry> | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 10 * 60 * 1000;

async function getLoanwordMap(requestId?: string) {
  const now = Date.now();
  if (cachedMap && now < cacheExpiry) return cachedMap;

  const db = await getDb();
  logger.info("📚 Loading loanwords from DB...", { requestId });

  const rows = await db
    .collection("loanwords")
    .find({}, { projection: { word: 1, origin: 1, alternative: 1 } })
    .toArray();

  const map = new Map<string, LoanwordEntry>();
  for (const r of rows) {
    const w = String((r as any).word || "").toLowerCase().trim();
    if (!w) continue;
    map.set(w, {
      origin: String((r as any).origin || "Noma’lum"),
      alternative: String((r as any).alternative || ""),
    });
  }

  cachedMap = map;
  cacheExpiry = now + CACHE_TTL_MS;
  logger.info("✅ Loanwords cached", { requestId, count: map.size });
  return map;
}

analyzeRouter.post("/text", async (req, res) => {
  const requestId = (req as any).requestId;

  try {
    const text = String(req.body?.text || "");
    if (!text.trim()) {
      logger.warn("⚠️ Empty text", { requestId });
      return res.status(400).json({ error: "Matn bo‘sh." });
    }

    logger.info("🧠 Analyze text start", { requestId, chars: text.length });

    const loanwordMap = await getLoanwordMap(requestId);
    const tokens = tokenize(text);
    const found = detectLoanwordsWithOrigin(tokens, loanwordMap);

    logger.info("✅ Analyze text done", {
      requestId,
      totalTokens: tokens.length,
      foundCount: found.length,
    });

    // MongoDB’ga log
    const db = await getDb();
    const totalOccurrences = found.reduce((s, f) => s + f.count, 0);
    await db.collection("analyses").insertOne({
      requestId,
      type: "text",
      createdAt: new Date(),
      stats: { totalTokens: tokens.length, foundCount: found.length, totalOccurrences },
      found,
      text,
      sample: text.slice(0, 100),
    });

    res.json({ totalTokens: tokens.length, found, text });
  } catch (e: any) {
    logger.error("❌ Analyze text error", { requestId, message: e.message });
    res.status(500).json({ error: e.message || "Xatolik" });
  }
});

analyzeRouter.post("/file", upload.single("file"), async (req, res) => {
  const requestId = (req as any).requestId;

  try {
    const file = req.file;
    if (!file) {
      logger.warn("⚠️ No file uploaded", { requestId });
      return res.status(400).json({ error: "Fayl topilmadi." });
    }

    logger.info("📤 File analyze start", {
      requestId,
      originalName: file.originalname,
      mime: file.mimetype,
      sizeBytes: file.size,
    });

    // Matnni ajratib olish (fayl multer memory’da turibdi)
    const text = await extractTextFromBuffer(file.buffer, file.mimetype, {
      requestId,
      fileName: file.originalname,
    });

    if (!text.trim()) {
      logger.warn("⚠️ Extracted text empty", { requestId });
    }

    const loanwordMap = await getLoanwordMap(requestId);
    const tokens = tokenize(text);
    const found = detectLoanwordsWithOrigin(tokens, loanwordMap);

    logger.info("✅ Analyze file done", {
      requestId,
      totalTokens: tokens.length,
      foundCount: found.length,
    });

    const totalOccurrences = found.reduce((s, f) => s + f.count, 0);
    const db = await getDb();
    await db.collection("analyses").insertOne({
      requestId,
      type: "file",
      fileName: file.originalname,
      mime: file.mimetype,
      sizeBytes: file.size,
      createdAt: new Date(),
      stats: { totalTokens: tokens.length, foundCount: found.length, totalOccurrences },
      found,
      text,
      sample: text.slice(0, 100),
    });

    logger.info("📝 Saved analysis log to MongoDB", { requestId });

    res.json({
      fileName: file.originalname,
      totalTokens: tokens.length,
      found,
      text,
    });
  } catch (e: any) {
    logger.error("❌ Analyze file error", { requestId, message: e.message });
    res.status(500).json({ error: e.message || "Xatolik" });
  }
});
