import mammoth from "mammoth";
import pdf from "pdf-parse";
import { logger } from "../utils/logger.js";

export async function extractTextFromBuffer(
  buffer: Buffer,
  mimeType: string,
  meta?: { requestId?: string; fileName?: string }
) {
  logger.info("📄 Text extraction start", {
    requestId: meta?.requestId,
    fileName: meta?.fileName,
    mimeType,
    sizeBytes: buffer.length,
  });

  if (mimeType === "application/pdf") {
    const data = await pdf(buffer);
    const text = data.text || "";
    logger.info("✅ PDF extracted", {
      requestId: meta?.requestId,
      chars: text.length,
    });
    return text;
  }

  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const res = await mammoth.extractRawText({ buffer });
    const text = res.value || "";
    logger.info("✅ DOCX extracted", {
      requestId: meta?.requestId,
      chars: text.length,
    });
    return text;
  }

  logger.warn("❌ Unsupported mimeType", {
    requestId: meta?.requestId,
    mimeType,
  });

  throw new Error("Faqat PDF yoki DOCX qabul qilinadi.");
}
