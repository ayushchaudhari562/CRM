// Display helpers. All times are shown in the phone's local time.

/** "Tuesday, 10 Nov" */
export const formatDay = (d: Date | string = new Date()) =>
  new Date(d).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });

/** "11:02 am" */
export const formatTime = (d: Date | string) =>
  new Date(d).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

/** "10 Nov, 11:02 am" */
export const formatDateTime = (d: Date | string) =>
  `${new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${formatTime(d)}`;

/** "₹25,000" */
export const formatINR = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

/** "₹3.8L" for big numbers on tiles */
export const formatINRShort = (n: number) =>
  n >= 1_00_000
    ? `₹${(n / 1_00_000).toFixed(1)}L`
    : n >= 1000
      ? `₹${(n / 1000).toFixed(1)}K`
      : formatINR(n);

export function greeting(now = new Date()) {
  const h = now.getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

/** "12 min ago" */
export function timeAgo(d: Date | string | null): string {
  if (!d) return 'no activity yet';
  const mins = Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 60_000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  return h < 24 ? `${h} hr ago` : `${Math.round(h / 24)} d ago`;
}

/** First letter of the first word, for avatar tiles. */
export const initialOf = (name: string) => name.trim().charAt(0).toUpperCase() || '?';
