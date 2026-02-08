import { Router } from "express";
import { getDb } from "../db/mongo.js";

export const historyRouter = Router();

historyRouter.get("/", async (req, res) => {
  const db = await getDb();
  const limit = Math.min(Number(req.query.limit || 20), 100);

  const items = await db
    .collection("analyses")
    .find({}, { projection: { found: 1, stats: 1, createdAt: 1, type: 1, fileName: 1, sample: 1 } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  res.json({ items });
});
