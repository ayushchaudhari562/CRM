// JSON schemas for request input. Fastify checks these before our code runs (bad input -> 400).
const str = (maxLength: number, minLength = 0) => ({ type: 'string', minLength, maxLength }) as const;
const nullable = <T extends { type: string }>(s: T) => ({ ...s, type: [s.type, 'null'] }) as const;
const id = str(64, 1);
const path = { type: 'string', minLength: 3, maxLength: 200, pattern: '^[A-Za-z0-9_/.-]+$' } as const; // storage path

export const idParam = { params: { type: 'object', required: ['id'], properties: { id } } } as const;

export const meetingsQuery = {
  querystring: { type: 'object', properties: { range: { type: 'string', enum: ['today', 'week', 'all'], default: 'all' } } },
} as const;

export const clientSearchQuery = { querystring: { type: 'object', properties: { q: str(100) } } } as const;

export const createMeetingBody = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['clientRequestId', 'clientName', 'businessType', 'productIds', 'dealValue', 'outcome', 'whatsappReminder', 'checkInAt'],
    properties: {
      clientRequestId: id,
      clientId: nullable(id),
      clientName: str(120, 1),
      businessType: str(80, 1),
      contactNumber: nullable(str(20)),
      clientAddress: nullable(str(300)), // typed by the salesman; optional
      productIds: { type: 'array', maxItems: 50, uniqueItems: true, items: id },
      dealValue: { type: 'number', minimum: 0, maximum: 9_999_999_999 }, // Decimal(12,2)
      outcome: { type: 'string', enum: ['Interested', 'Closed', 'Not interested'] },
      note: nullable(str(2000)),
      nextVisit: nullable({ type: 'string', format: 'date-time' }),
      whatsappReminder: { type: 'boolean' },
      checkInAt: { type: 'string', format: 'date-time' },
      checkOutAt: { type: 'string', format: 'date-time' },
      selfiePath: nullable(path),
      voiceNote: {
        type: ['object', 'null'],
        additionalProperties: false,
        required: ['path', 'seconds'],
        properties: { path, seconds: { type: 'integer', minimum: 1, maximum: 3600 } }, // up to 60 min
      },
      attachments: {
        type: 'array',
        maxItems: 10,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['path', 'name', 'type', 'sizeBytes'],
          properties: { path, name: str(120, 1), type: { type: 'string', enum: ['photo', 'file'] }, sizeBytes: { type: 'integer', minimum: 1, maximum: 10 * 1024 * 1024 } },
        },
      },
      location: {
        type: ['object', 'null'],
        additionalProperties: false,
        required: ['latitude', 'longitude'],
        properties: {
          latitude: { type: 'number', minimum: -90, maximum: 90 },
          longitude: { type: 'number', minimum: -180, maximum: 180 },
          accuracy: { type: ['number', 'null'], minimum: 0 },
          address: { type: ['string', 'null'], maxLength: 300 },
        },
      },
    },
  },
} as const;

export const createSalesmanBody = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['name', 'phone'],
    properties: { name: str(80, 2), phone: str(20, 10) },
  },
} as const;

export const adminMeetingsQuery = {
  querystring: {
    type: 'object',
    properties: {
      salesmanId: id,
      limit: { type: 'integer', minimum: 1, maximum: 200, default: 50 },
      outcome: { type: 'string', enum: ['Interested', 'Closed', 'Not interested'] },
      range: { type: 'string', enum: ['today'] },
    },
  },
} as const;

const day = { type: 'string', format: 'date' } as const; // YYYY-MM-DD
const scope = { type: 'string', enum: ['overdue', 'today', 'upcoming', 'done'], default: 'today' } as const;
const limit = { type: 'integer', minimum: 1, maximum: 200, default: 100 } as const;

export const followUpsQuery = { querystring: { type: 'object', properties: { scope, limit } } } as const;

export const adminFollowUpsQuery = { querystring: { type: 'object', properties: { scope, limit, salesmanId: id } } } as const;

// Exactly one change per call: close it (status) or move it (dueAt).
export const updateFollowUpBody = {
  ...idParam,
  body: {
    type: 'object',
    additionalProperties: false,
    minProperties: 1,
    maxProperties: 1,
    properties: { status: { type: 'string', enum: ['Done', 'Cancelled'] }, dueAt: { type: 'string', format: 'date-time' } },
  },
} as const;

export const targetsQuery = { querystring: { type: 'object', properties: { days: { type: 'integer', minimum: 1, maximum: 31, default: 7 } } } } as const;

export const adminTargetsQuery = { querystring: { type: 'object', properties: { date: day } } } as const;

export const setTargetBody = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['salesmanIds', 'date', 'visitsTarget', 'dealValueTarget'],
    properties: {
      salesmanIds: { type: 'array', minItems: 1, maxItems: 200, uniqueItems: true, items: id },
      date: day,
      visitsTarget: { type: 'integer', minimum: 0, maximum: 100 },
      dealValueTarget: { type: ['number', 'null'], minimum: 0, maximum: 9_999_999_999 },
    },
  },
} as const;

export const setMyTargetBody = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['visitsTarget'],
    properties: { visitsTarget: { type: 'integer', minimum: 0, maximum: 100 } },
  },
} as const;

// Same rules as create; only the fields being changed are sent.
const m = createMeetingBody.body.properties;
export const updateMeetingBody = {
  ...idParam,
  body: {
    type: 'object',
    additionalProperties: false,
    minProperties: 1,
    properties: {
      clientName: m.clientName,
      businessType: m.businessType,
      contactNumber: m.contactNumber,
      productIds: m.productIds,
      dealValue: m.dealValue,
      outcome: m.outcome,
      note: m.note,
      nextVisit: m.nextVisit,
      whatsappReminder: m.whatsappReminder,
    },
  },
} as const;

// 25 visits max per call keeps the body under the 100KB limit (notes are up to 2000 chars).
export const syncBody = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['meetings'],
    properties: { meetings: { type: 'array', minItems: 1, maxItems: 25, items: createMeetingBody.body } },
  },
} as const;

export const createUploadBody = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['kind', 'contentType', 'sizeBytes'],
    properties: {
      kind: { type: 'string', enum: ['selfie', 'photo', 'voice', 'file'] },
      contentType: str(60, 3),
      sizeBytes: { type: 'integer', minimum: 1 },
    },
  },
} as const;

const lat = { type: 'number', minimum: -90, maximum: 90 } as const;
const lng = { type: 'number', minimum: -180, maximum: 180 } as const;
const latLng = { type: 'object', additionalProperties: false, required: ['latitude', 'longitude'], properties: { latitude: lat, longitude: lng } } as const;

// Body is optional (old app versions send none).
export const punchBody = {
  body: { type: ['object', 'null'], additionalProperties: false, properties: { location: { ...latLng, type: ['object', 'null'] } } },
} as const;

// 120 points = 2 hours offline at 1/min.
export const locationPingsBody = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['pings'],
    properties: {
      pings: {
        type: 'array',
        minItems: 1,
        maxItems: 120,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['latitude', 'longitude', 'accuracy', 'recordedAt'],
          properties: { latitude: lat, longitude: lng, accuracy: { type: ['number', 'null'], minimum: 0 }, recordedAt: { type: 'string', format: 'date-time' } },
        },
      },
    },
  },
} as const;

export const dayRouteQuery = { ...idParam, querystring: { type: 'object', properties: { date: day } } } as const;
