// Shared helpers with no imports from other app files (avoids import cycles).
export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

/** "919000000900" / "+91 90000 00900" -> "+919000000900" (same format as User.phone). */
export function normalizePhone(phone: string): string {
  return '+' + phone.replace(/\D/g, '');
}
