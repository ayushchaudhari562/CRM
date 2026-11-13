// Manager accounts come from ADMIN_PHONES (Render / .env), so a real number never sits in the code or on GitHub.
// Format: comma separated, each "9876543210" or "Suresh Iyer:9876543210". Missing ones are created at start-up.
// An existing user is never changed here (no silent promotion of a salesman, no overwriting a name).
import { prisma } from './db';
import { env } from './env';
import { normalizePhone } from './http';

export function parseAdmins(list: string): { name: string; phone: string }[] {
  return list
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const i = item.lastIndexOf(':');
      const name = (i > 0 ? item.slice(0, i) : '').trim() || 'Manager';
      const digits = item.slice(i + 1).replace(/\D/g, '');
      const phone = digits.length === 10 ? normalizePhone('91' + digits) : digits.length === 12 && digits.startsWith('91') ? normalizePhone(digits) : null;
      if (!phone) throw new Error(`ADMIN_PHONES: "${item}" is not a valid 10-digit mobile number`);
      return { name, phone };
    });
}

/** Creates the managers listed in ADMIN_PHONES that do not exist yet. Returns how many were created. */
export async function ensureAdmins(list = env.adminPhones): Promise<number> {
  let created = 0;
  for (const a of parseAdmins(list)) {
    const user = await prisma.user.findUnique({ where: { phone: a.phone } });
    if (!user) {
      await prisma.user.create({ data: { name: a.name, phone: a.phone, role: 'ADMIN' } });
      created++;
    } else if (user.role !== 'ADMIN') {
      console.warn(`ADMIN_PHONES: ${a.phone.slice(0, 5)}*****${a.phone.slice(-2)} is already a salesman; not changed`);
    }
  }
  return created;
}
