import { Router } from "express";
import multer from "multer";
import { getDb } from "../db/mongo.js";
import { supabase } from "../supabase/client.js";
import { extractTextFromBuffer } from "../services/extractText.js";
import { tokenize, detectLoanwordsWithOrigin } from "../services/detect.js";
import { logger } from "../utils/logger.js";

const upload = multer({ storage: multer.memoryStorage() });
export const analyzeRouter = Router();

// word -> origin map
async function getLoanwordMap(requestId?: string) {
  const db = await getDb();
  logger.info("📚 Loading loanwords...", { requestId });

  const rows = await db
    .collection("loanwords")
    .find({}, { projection: { word: 1, origin: 1 } })
    .toArray();

  const map = new Map<string, string>();
  for (const r of rows) {
    const w = String((r as any).word || "").toLowerCase().trim();
    if (!w) continue;
    map.set(w, String((r as any).origin || "Noma’lum"));
  }

  logger.info("✅ Loanwords loaded", { requestId, count: map.size });
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
    await db.collection("analyses").insertOne({
      requestId,
      type: "text",
      createdAt: new Date(),
      stats: { totalTokens: tokens.length, foundCount: found.length },
      found, // endi origin ham bor
      sample: text.slice(0, 500),
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

    // 1) Supabase’ga upload
    const bucket = process.env.SUPABASE_BUCKET || "documents";
    const key = `${Date.now()}_${file.originalname}`;

    logger.info("☁️ Uploading to Supabase...", { requestId, bucket, key });

    const up = await supabase.storage.from(bucket).upload(key, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

    if (up.error) {
      logger.error("❌ Supabase upload error", {
        requestId,
        message: up.error.message,
      });
      throw new Error(up.error.message);
    }

    logger.info("✅ Supabase upload ok", { requestId, bucket, key });

    // 2) Matnni ajratib olish
    const text = await extractTextFromBuffer(file.buffer, file.mimetype, {
      requestId,
      fileName: file.originalname,
    });

    if (!text.trim()) {
      logger.warn("⚠️ Extracted text empty", { requestId });
    }

    // 3) Detect
    const loanwordMap = await getLoanwordMap(requestId);
    const tokens = tokenize(text);
    const found = detectLoanwordsWithOrigin(tokens, loanwordMap);

    logger.info("✅ Analyze file done", {
      requestId,
      totalTokens: tokens.length,
      foundCount: found.length,
    });

    // 4) MongoDB’ga log
    const db = await getDb();
    await db.collection("analyses").insertOne({
      requestId,
      type: "file",
      fileName: file.originalname,
      supabaseKey: key,
      bucket,
      mime: file.mimetype,
      sizeBytes: file.size,
      createdAt: new Date(),
      stats: { totalTokens: tokens.length, foundCount: found.length },
      found, // ✅ origin ham saqlanadi
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
