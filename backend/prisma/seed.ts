// Sample data for development. Run: npm run db:seed
// WARNING: this DELETES all rows first, then inserts fresh sample data. Never run on production.
//
// - Deterministic: same data every run (seeded random), dates are relative to "today".
// - Phone numbers use the fake range +91 90000 0xxxx so no real person is ever messaged.
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  PrismaClient,
  Role,
  MeetingOutcome,
  AttachmentType,
  FollowUpType,
  FollowUpStatus,
} from '../src/generated/prisma/client';

if (process.env.NODE_ENV === 'production') {
  throw new Error('Refusing to seed: NODE_ENV is production.');
}

// Session-mode URL (port 5432): safest for a one-off script.
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL }) });

// ---------- small helpers ----------

// Seeded random (mulberry32) so every run gives the same data.
let seed = 42;
function rand(): number {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const pick = <T>(list: readonly T[]): T => list[int(0, list.length - 1)];
const fakePhone = (n: number) => `+9190000${String(n).padStart(5, '0')}`;

const IST_OFFSET_MS = 5.5 * 3600_000;

/** Today's IST calendar date, shifted by `dayOffset` days, as midnight UTC (for @db.Date). */
function dayOnly(dayOffset: number): Date {
  const ist = new Date(Date.now() + IST_OFFSET_MS);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() + dayOffset));
}
/** hh:mm IST on that day, as a real UTC timestamp. */
function istDate(dayOffset: number, hh: number, mm = 0): Date {
  return new Date(dayOnly(dayOffset).getTime() + (hh * 60 + mm) * 60_000 - IST_OFFSET_MS);
}
const nearby = (base: number, km = 3) => base + (rand() - 0.5) * (km / 111) * 2;

// ---------- sample data ----------

const AREAS = [
  { name: 'Kothrud, Pune', lat: 18.5074, lng: 73.8077 },
  { name: 'Hadapsar, Pune', lat: 18.5089, lng: 73.926 },
  { name: 'Wakad, Pune', lat: 18.5987, lng: 73.7653 },
  { name: 'Andheri East, Mumbai', lat: 19.1136, lng: 72.8697 },
  { name: 'Thane West', lat: 19.2183, lng: 72.9781 },
  { name: 'Vashi, Navi Mumbai', lat: 19.0771, lng: 72.9986 },
];

const SALESMEN = [
  'Rahul Sharma', 'Priya Patil', 'Amit Verma', 'Sneha Kulkarni', 'Vikram Singh', 'Pooja Deshmukh',
  'Rohan Joshi', 'Neha Gupta', 'Arjun Nair', 'Kavya Reddy', 'Sanjay Yadav', 'Anjali Mehta',
];
const ADMINS = ['Suresh Iyer', 'Meera Kapoor'];

const PRODUCTS = [
  'Basmati Rice 25kg', 'Sunflower Oil 15L', 'Toor Dal 30kg', 'Sugar 50kg', 'Atta 10kg',
  'Detergent Powder 1kg', 'Bath Soap (box of 48)', 'Tea 1kg', 'Biscuits (carton)', 'Instant Noodles (carton)',
];

const BUSINESS_TYPES = ['Kirana store', 'Supermarket', 'Wholesale trader', 'Medical store', 'Hotel / Restaurant', 'Bakery', 'General store'];
const SHOP_WORDS = ['Shree Ganesh', 'Laxmi', 'Sai', 'Om', 'Balaji', 'Jai Hind', 'New India', 'Mahalaxmi', 'Krishna', 'Durga', 'Annapurna', 'Royal'];
const SHOP_SUFFIX = ['Kirana', 'Stores', 'Traders', 'Mart', 'Super Market', 'General Store', 'Enterprises', 'Medicals'];

const NOTES: Record<MeetingOutcome, string[]> = {
  INTERESTED: [
    'Owner liked the rate. Wants a sample before ordering.',
    'Interested in oil and dal. Asked to come back next week with price list.',
    'Will discuss with partner and confirm by phone.',
  ],
  CLOSED: [
    'Order confirmed. Delivery by Friday.',
    'Closed a monthly order. Payment on delivery.',
    'Repeat order, same as last month plus 2 extra cartons.',
  ],
  NOT_INTERESTED: [
    'Already buys from another distributor at lower rate.',
    'Shop is closing for renovation for 2 months.',
    'Not interested right now. Try again after Diwali.',
  ],
};
const AI_SUMMARIES = [
  'Client finds the rate slightly high and wants a sample. Asked to meet again in 7 days.',
  'Client confirmed the order for rice and oil. Wants delivery before the weekend.',
  'Client is happy with current supplier. Low chance; follow up next month.',
  'Client will compare prices and call back. Interested mainly in bulk sugar.',
];

// ---------- seed ----------

async function main() {
  console.log('Clearing old data...');
  // Children first (foreign keys).
  await prisma.attachment.deleteMany();
  await prisma.followUp.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.client.deleteMany();
  await prisma.product.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.locationPing.deleteMany();
  await prisma.target.deleteMany();
  await prisma.user.deleteMany();

  // Users: 12 salesmen + 2 admins
  const salesmen = [];
  for (let i = 0; i < SALESMEN.length; i++) {
    salesmen.push(
      await prisma.user.create({
        data: {
          name: SALESMEN[i],
          phone: fakePhone(100 + i),
          employeeId: `EMP${String(1001 + i)}`,
          role: Role.SALESMAN,
          isActive: i !== SALESMEN.length - 1, // last one is deactivated (to test that case)
        },
      }),
    );
  }
  for (let i = 0; i < ADMINS.length; i++) {
    await prisma.user.create({
      data: { name: ADMINS[i], phone: fakePhone(900 + i), employeeId: `ADM${String(1 + i).padStart(3, '0')}`, role: Role.ADMIN },
    });
  }
  const activeSalesmen = salesmen.filter((s) => s.isActive);

  // Products: 10 (one inactive)
  const products = [];
  for (let i = 0; i < PRODUCTS.length; i++) {
    products.push(await prisma.product.create({ data: { name: PRODUCTS[i], isActive: i !== PRODUCTS.length - 1 } }));
  }
  const activeProducts = products.filter((p) => p.isActive);

  // Clients: 3 per salesman = 36
  const clients = [];
  let clientNo = 0;
  for (const [i, s] of salesmen.entries()) {
    const area = AREAS[i % AREAS.length];
    for (let k = 0; k < 3; k++) {
      clientNo++;
      clients.push(
        await prisma.client.create({
          data: {
            salesmanId: s.id,
            name: `${pick(SHOP_WORDS)} ${pick(SHOP_SUFFIX)}`,
            businessType: pick(BUSINESS_TYPES),
            contactNumber: k === 2 && i % 4 === 0 ? null : fakePhone(1000 + clientNo), // a few without a number
            address: `Shop ${int(1, 99)}, ${area.name}`,
            latitude: nearby(area.lat),
            longitude: nearby(area.lng),
          },
        }),
      );
    }
  }

  // Meetings: last 7 days, 0-2 per active salesman per day
  const meetings = [];
  let reqNo = 0;
  for (let day = -6; day <= 0; day++) {
    for (const s of activeSalesmen) {
      const visits = day === 0 ? int(0, 2) : int(1, 2);
      const myClients = clients.filter((c) => c.salesmanId === s.id);
      for (let v = 0; v < visits; v++) {
        const client = pick(myClients);
        const outcome = pick([MeetingOutcome.INTERESTED, MeetingOutcome.INTERESTED, MeetingOutcome.CLOSED, MeetingOutcome.NOT_INTERESTED]);
        const checkInAt = istDate(day, 10 + v * 3 + int(0, 1), int(0, 59));
        const gpsDenied = rand() < 0.1; // ~10% visits where GPS permission was denied
        const hasVoice = rand() < 0.5;
        const wantsNext = outcome === MeetingOutcome.INTERESTED;
        const chosen = [...activeProducts].sort(() => rand() - 0.5).slice(0, int(1, 3));
        reqNo++;
        meetings.push(
          await prisma.meeting.create({
            data: {
              clientRequestId: `seed-req-${String(reqNo).padStart(4, '0')}`,
              salesmanId: s.id,
              clientId: client.id,
              checkInAt,
              checkInLat: gpsDenied ? null : nearby(client.latitude ?? 18.52, 0.1),
              checkInLng: gpsDenied ? null : nearby(client.longitude ?? 73.85, 0.1),
              checkInAccuracy: gpsDenied ? null : int(5, 40),
              selfieUrl: `selfies/${s.id}/${reqNo}.jpg`,
              checkOutAt: day === 0 && v === visits - 1 ? null : new Date(checkInAt.getTime() + int(15, 50) * 60_000), // today's last visit still open
              outcome,
              dealValue: outcome === MeetingOutcome.CLOSED ? int(5, 80) * 1000 : outcome === MeetingOutcome.INTERESTED ? int(0, 40) * 1000 : 0,
              note: hasVoice && rand() < 0.5 ? null : pick(NOTES[outcome]),
              voiceNoteUrl: hasVoice ? `voice/${s.id}/${reqNo}.m4a` : null,
              voiceNoteSeconds: hasVoice ? int(10, 90) : null,
              aiSummary: hasVoice ? pick(AI_SUMMARIES) : null,
              nextVisitAt: wantsNext ? istDate(day + int(2, 9), int(10, 17)) : null,
              whatsappReminder: wantsNext && rand() < 0.7,
              products: { connect: chosen.map((p) => ({ id: p.id })) },
            },
          }),
        );
      }
    }
  }

  // Attachments: on ~1 in 3 meetings
  let attachments = 0;
  for (const [i, m] of meetings.entries()) {
    if (i % 3 !== 0) continue;
    const isPhoto = i % 2 === 0;
    await prisma.attachment.create({
      data: {
        meetingId: m.id,
        type: isPhoto ? AttachmentType.PHOTO : AttachmentType.FILE,
        url: `attachments/${m.id}/${isPhoto ? 'shelf.jpg' : 'price-list.pdf'}`,
        name: isPhoto ? 'shelf.jpg' : 'price-list.pdf',
        sizeBytes: isPhoto ? int(200, 900) * 1024 : int(50, 300) * 1024,
      },
    });
    attachments++;
  }

  // Follow-ups: from every meeting with nextVisitAt, plus some by hand.
  // Mix: overdue (pending in the past), due today, upcoming, done, cancelled.
  let followUps = 0;
  for (const m of meetings) {
    if (!m.nextVisitAt) continue;
    const isPast = m.nextVisitAt < new Date();
    const status = isPast ? pick([FollowUpStatus.DONE, FollowUpStatus.DONE, FollowUpStatus.PENDING, FollowUpStatus.CANCELLED]) : FollowUpStatus.PENDING;
    await prisma.followUp.create({
      data: {
        salesmanId: m.salesmanId,
        clientId: m.clientId,
        meetingId: m.id,
        type: FollowUpType.VISIT,
        dueAt: m.nextVisitAt,
        status,
        whatsappSentAt: m.whatsappReminder && isPast ? m.nextVisitAt : null,
      },
    });
    followUps++;
  }
  for (const [i, s] of activeSalesmen.entries()) {
    const client = clients.find((c) => c.salesmanId === s.id)!;
    await prisma.followUp.create({
      data: { salesmanId: s.id, clientId: client.id, type: FollowUpType.CALL, dueAt: istDate(0, 11 + (i % 6), 30) }, // due today
    });
    followUps++;
  }

  // Attendance: last 5 days. Today: some punched in (open), some not started.
  let attendance = 0;
  for (let day = -4; day <= 0; day++) {
    for (const [i, s] of activeSalesmen.entries()) {
      if (day === 0 && i % 4 === 3) continue; // "not started" today
      const area = AREAS[salesmen.indexOf(s) % AREAS.length];
      await prisma.attendance.create({
        data: {
          salesmanId: s.id,
          punchInAt: istDate(day, 9, int(0, 45)),
          punchInLat: nearby(area.lat),
          punchInLng: nearby(area.lng),
          punchOutAt: day === 0 ? null : istDate(day, 18, int(0, 59)),
          punchOutLat: day === 0 ? null : nearby(area.lat),
          punchOutLng: day === 0 ? null : nearby(area.lng),
        },
      });
      attendance++;
    }
  }

  // Location pings: today, every 30 min from 9:30 for salesmen who punched in
  let pings = 0;
  for (const [i, s] of activeSalesmen.entries()) {
    if (i % 4 === 3) continue;
    const area = AREAS[salesmen.indexOf(s) % AREAS.length];
    for (let k = 0; k < 6; k++) {
      await prisma.locationPing.create({
        data: { salesmanId: s.id, latitude: nearby(area.lat), longitude: nearby(area.lng), accuracy: int(5, 30), recordedAt: istDate(0, 9 + Math.floor((k + 1) / 2), (k + 1) % 2 ? 30 : 0) },
      });
      pings++;
    }
  }

  // Targets: last 7 days + next 3 days for every salesman
  let targets = 0;
  for (let day = -6; day <= 3; day++) {
    for (const s of salesmen) {
      await prisma.target.create({
        data: { salesmanId: s.id, date: dayOnly(day), visitsTarget: 8, dealValueTarget: 50000 },
      });
      targets++;
    }
  }

  console.table({
    users: salesmen.length + ADMINS.length,
    products: products.length,
    clients: clients.length,
    meetings: meetings.length,
    attachments,
    followUps,
    attendance,
    locationPings: pings,
    targets,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
