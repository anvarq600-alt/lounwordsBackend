import { Router } from "express";
import { getDb } from "../db/mongo.js";
import { logger } from "../utils/logger.js";

export const loanwordsRouter = Router();

loanwordsRouter.get("/", async (req, res) => {
  const requestId = (req as any).requestId;

  const db = await getDb();
  const rows = await db.collection("loanwords").find().limit(5000).toArray();

  logger.info("📚 loanwords list", { requestId, count: rows.length });
  res.json({ rows });
});

loanwordsRouter.post("/import", async (req, res) => {
  const requestId = (req as any).requestId;

  // ✅ eski format: { words: ["internet","telefon"] }
  const words: string[] = Array.isArray(req.body?.words) ? req.body.words : [];

  // ✅ yangi format: { items: [{ word:"internet", origin:"Ingliz tili" }, ...] }
  const items: Array<{ word: string; origin?: string }> = Array.isArray(req.body?.items)
    ? req.body.items
    : [];

  if (!words.length && !items.length) {
    logger.warn("⚠️ import empty words/items", { requestId });
    return res.status(400).json({ error: "words yoki items bo‘sh." });
  }

  const db = await getDb();

  logger.info("⬆️ Import loanwords start", {
    requestId,
    count: items.length ? items.length : words.length,
    mode: items.length ? "items" : "words",
  });

  const ops = items.length
    ? items
        .filter((it) => it && it.word) // word yo‘q bo‘lsa tashlab ketamiz
        .map((it) => {
          const w = String(it.word).toLowerCase().trim();
          const origin = String(it.origin || "Noma’lum").trim();

          return {
            updateOne: {
              filter: { word: w },
              update: {
                $set: { origin },
                // ✅ eng muhim fix: insert bo‘lsa word ham yozilsin
                $setOnInsert: { word: w, createdAt: new Date() },
              },
              upsert: true,
            },
          };
        })
    : words.map((w) => {
        const ww = String(w).toLowerCase().trim();
        return {
          updateOne: {
            filter: { word: ww },
            update: { $setOnInsert: { word: ww, createdAt: new Date() } },
            upsert: true,
          },
        };
      });

  const r = await db.collection("loanwords").bulkWrite(ops);

  logger.info("✅ Import loanwords done", {
    requestId,
    upserted: r.upsertedCount,
    matched: r.matchedCount,
    modified: r.modifiedCount,
  });

  res.json({
    upserted: r.upsertedCount,
    modified: r.modifiedCount,
    mode: items.length ? "items(word+origin)" : "words(only)",
  });
});

