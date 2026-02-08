import { createClient } from "@supabase/supabase-js";
import { logger } from "../utils/logger.js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  logger.error("❌ Supabase env yo‘q", {
    hasUrl: !!url,
    hasServiceRoleKey: !!key,
  });
}

export const supabase = createClient(url || "", key || "");

// ixtiyoriy: server startda ping (bucket list qilishga urinish)
export async function testSupabase() {
  try {
    logger.info("🔌 Supabase test...");
    const { data, error } = await supabase.storage.listBuckets();
    if (error) throw error;
    logger.info("✅ Supabase connected (buckets)", {
      count: data?.length ?? 0,
    });
    logger.info("Supabase key check", {
      urlOk: !!process.env.SUPABASE_URL,
      keyLen: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
    });
  } catch (e: any) {
    logger.error("❌ Supabase test failed", { message: e.message });
  }
}
