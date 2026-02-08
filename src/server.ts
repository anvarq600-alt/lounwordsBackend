import "dotenv/config";
import express from "express";
import cors from "cors";
import { analyzeRouter } from "./routes/analyze.js";
import { loanwordsRouter } from "./routes/loanwords.js";
import { requestLogger } from "./middlewares/requestLogger.js";
import { logger } from "./utils/logger.js";
import { testSupabase } from "./supabase/client.js";
import { getDb } from "./db/mongo.js";
import { historyRouter } from "./routes/history.js";

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:3000" }));
app.use(express.json({ limit: "5mb" }));
app.use(requestLogger); // ✅ har request log + requestId

app.get("/", (_req, res) => res.send("OK"));
app.use("/api/analyze", analyzeRouter);
app.use("/api/loanwords", loanwordsRouter);
app.use("/api/history", historyRouter);

const port = Number(process.env.PORT || 8000);

app.listen(port, async () => {
  logger.info("🚀 Backend running", { port });

  // server startda tekshiruvlar (log chiqadi)
  await getDb().catch(() => {});
  await testSupabase();
});
