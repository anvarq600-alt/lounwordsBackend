import { MongoClient, Db } from "mongodb";
import { logger } from "../utils/logger.js";

let db: Db | null = null;
let client: MongoClient | null = null;

export async function getDb() {
  if (db) return db;

  const uri = process.env.MONGO_URI;
  if (!uri) {
    logger.error("❌ MONGO_URI .env da yo‘q");
    throw new Error("MONGO_URI missing");
  }

  const dbName = process.env.MONGO_DB_NAME || "uz_loanwords";

  try {
    logger.info("🔌 MongoDB connecting...", { dbName });

    client = new MongoClient(uri);
    await client.connect();

    db = client.db(dbName);
    logger.info("✅ MongoDB connected", { dbName });

    return db;
  } catch (e: any) {
    logger.error("❌ MongoDB connection failed", { message: e.message });
    throw e;
  }
}
