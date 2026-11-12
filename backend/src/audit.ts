// Audit trail (OTP sent, login, logout, deactivate, WhatsApp opt-in / opt-out). Kept for life.
// Writing the log must never break the request it describes.
import { prisma } from './db';

export async function audit(action: string, userId: string | null, detail?: Record<string, unknown>) {
  try {
    await prisma.auditLog.create({ data: { action, userId, ...(detail ? { detail: detail as object } : {}) } });
  } catch (e) {
    console.error(`audit ${action} failed: ${(e as Error).message}`);
  }
}
