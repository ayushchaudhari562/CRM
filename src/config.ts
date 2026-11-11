// App-wide constants (not data).
export const APP_NAME = 'Sales CRM';

// Client details screen: which visit fields a salesman may edit, and for how long after check-in.
// Your choice: all field groups are locked, so the screen is view-only for now.
// To allow editing a group later, set it to true here; the 2-hour window then applies.
export const SALESMAN_EDITABLE = {
  visitProof: false, // check-in time, GPS, selfie (keep false: proof the visit happened)
  clientIdentity: false, // name, business type, contact number
  dealDetails: false, // products, deal value, outcome
  notesAndFollowUp: false, // note, voice note / AI summary, next visit, WhatsApp reminder, attachments
} as const;
export const SALESMAN_EDIT_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours
