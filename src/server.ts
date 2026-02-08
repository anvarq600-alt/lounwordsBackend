import "dotenv/config";
import express from "express";
import cors from "cors";

import { analyzeRouter } from "./routes/analyze.js";
import { loanwordsRouter } from "./routes/loanwords.js";
import { historyRouter } from "./routes/history.js";

import { requestLogger } from "./middlewares/requestLogger.js";
import { logger } from "./utils/logger.js";
import { testSupabase } from "./supabase/client.js";
import { getDb } from "./db/mongo.js";

const app = express();

/**
 * ✅ CORS (Netlify + Localhost)
 *
 * Render ENV tavsiya:
 * CORS_ORIGINS="https://loanword.netlify.app,https://iridescent-otter-25eda0.netlify.app,http://localhost:3000,http://localhost:5173"
 */
const allowlist = (
  process.env.CORS_ORIGINS ||
  "http://localhost:3000,http://localhost:5173,https://loanword.netlify.app"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)
  .map((s) => s.replace(/\/$/, "")); // ✅ oxiridagi "/" ni olib tashlaydi

app.use(
  cors({
    origin: (origin, cb) => {
      // origin bo‘lmasa (curl/postman) ruxsat
      if (!origin) return cb(null, true);

      const cleanOrigin = origin.replace(/\/$/, "");
      if (allowlist.includes(cleanOrigin)) return cb(null, true);

      // Xohlasang bu errorni log qilib ham qo‘yish mumkin:
      // logger.warn("CORS blocked", { origin, allowlist });

      return cb(new Error("Not allowed by CORS: " + origin));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    // credentials: true, // agar cookie/session ishlatsang yoqasan
  })
);

// ✅ Preflight (OPTIONS) so‘rovlari uchun
app.options("*", cors());

app.use(express.json({ limit: "5mb" }));
app.use(requestLogger); // ✅ har request log + requestId

app.get("/", (_req, res) => res.send("OK"));

app.use("/api/analyze", analyzeRouter);
app.use("/api/loanwords", loanwordsRouter);
app.use("/api/history", historyRouter);

const port = Number(process.env.PORT || 8000);

app.listen(port, async () => {
  logger.info("🚀 Backend running", { port, allowlist });

  // server startda tekshiruvlar (log chiqadi)
  await getDb().catch(() => {});
  await testSupabase();
});
