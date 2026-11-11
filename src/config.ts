// App-wide constants (not data).
export const APP_NAME = 'Sales CRM';

// Which visit fields a salesman may edit, and for how long. Shared by the app AND the API (the API enforces it).
// The window starts when the server saved the visit (not the phone's clock).
// Your choice: all field groups are locked, so the screen is view-only for now.
// To allow editing a group later, set it to true here; the 2-hour window then applies.
export const SALESMAN_EDITABLE = {
  visitProof: false, // check-in time, GPS, selfie (keep false: proof the visit happened)
  clientIdentity: false, // name, business type, contact number
  dealDetails: false, // products, deal value, outcome
  notesAndFollowUp: false, // note, voice note / AI summary, next visit, WhatsApp reminder, attachments
} as const;
export const SALESMAN_EDIT_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours

/** Field of PATCH /me/meetings/:id -> the group above that controls it. Visit proof is never editable. */
export const MEETING_FIELD_GROUP = {
  clientName: 'clientIdentity',
  businessType: 'clientIdentity',
  contactNumber: 'clientIdentity',
  productIds: 'dealDetails',
  dealValue: 'dealDetails',
  outcome: 'dealDetails',
  note: 'notesAndFollowUp',
  nextVisit: 'notesAndFollowUp',
  whatsappReminder: 'notesAndFollowUp',
} as const satisfies Record<string, keyof typeof SALESMAN_EDITABLE>;
