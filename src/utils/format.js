/** Small, dependency-free helpers for ids, dates and text. */

/** Collision-resistant enough for a local-only prototype. */
export function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Human-friendly appointment reference, e.g. `SH-7K2F9Q`.
 * Uppercase + digits only so it can be read out over the phone.
 */
export function appointmentRef() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
  let out = '';
  for (let i = 0; i < 6; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `SH-${out}`;
}

/** `2026-09-28` in local time (avoids the UTC shift of toISOString). */
export function toDateKey(date) {
  const d = date instanceof Date ? date : new Date(date);
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** `Mon, 28 Sep` */
export function formatShortDate(value) {
  if (!value) return '';
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** `Monday, 28 September 2026` */
export function formatLongDate(value) {
  if (!value) return '';
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/** `28 Sep 2026, 4:05 pm` — for created-at timestamps. */
export function formatTimestamp(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** "2 hours ago" style relative label used on announcement cards. */
export function relativeTime(iso) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatShortDate(toDateKey(new Date(then)));
}

/** Next `count` selectable days starting today. */
export function upcomingDays(count = 14) {
  const out = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < count; i += 1) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    out.push({
      key: toDateKey(d),
      weekday: d.toLocaleDateString('en-IN', { weekday: 'short' }),
      day: d.getDate(),
      month: d.toLocaleDateString('en-IN', { month: 'short' }),
      isToday: i === 0,
      isTomorrow: i === 1,
    });
  }
  return out;
}

/** Initials for the avatar fallback: "Dr. Asha Kulkarni" -> "AK". */
export function initials(name = '') {
  const words = name
    .replace(/^(dr\.?|prof\.?|mr\.?|mrs\.?|ms\.?)\s+/i, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return '—';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/** Deterministic pick from a palette so a given doctor keeps the same colour. */
export function hashIndex(seed = '', length = 1) {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) % 100000;
  }
  return h % length;
}

const AVATAR_PALETTE = [
  ['#e0effe', '#015da0'],
  ['#dcfce9', '#158049'],
  ['#fbe8e9', '#9c2a3d'],
  ['#e8e6fd', '#4c3bb5'],
  ['#fff1dc', '#9a5b09'],
  ['#dff5f7', '#0d6c78'],
];

/**
 * Inline SVG initials avatar.
 *
 * Doctor photos are admin-supplied. Until a real, consented photo URL is
 * entered we render a generated monogram rather than borrowing a stranger's
 * likeness — and this never 404s or costs a network round-trip.
 */
export function initialsAvatar(name = '') {
  const [bg, fg] = AVATAR_PALETTE[hashIndex(name, AVATAR_PALETTE.length)];
  const text = initials(name);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
<rect width="200" height="200" fill="${bg}"/>
<text x="100" y="128" text-anchor="middle" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="82" font-weight="700" fill="${fg}">${text}</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** Clip long free-text (symptoms, announcement bodies) for table cells. */
export function truncate(text = '', max = 80) {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}
