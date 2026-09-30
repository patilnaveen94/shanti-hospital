/**
 * Static hospital profile + authentic media.
 *
 * Every image below was harvested from the live Shanti Hospital website
 * (https://www.shantihospital.in) and is served from the hospital's own
 * Wix CDN, so returning patients see the building they actually visit.
 *
 * The CDN supports on-the-fly resizing, which we use to keep the
 * mobile payload small — see `photo()` below.
 */

const CDN = 'https://static.wixstatic.com/media';

/**
 * Build a right-sized CDN URL.
 * @param {string} file  Wix media filename
 * @param {number} w     target width in px
 * @param {number} [h]   target height in px; omit to preserve aspect ratio
 * @param {'fill'|'fit'} [mode='fill']
 * @param {'c'|'t'|'b'} [align='c']  crop anchor. Use 't' for portraits so a
 *   square crop keeps the face instead of centring on the chest.
 */
export function photo(file, w, h, mode = 'fill', align = 'c') {
  const box = h ? `w_${w},h_${h}` : `w_${w},h_${w}`;
  return `${CDN}/${file}/v1/${mode}/${box},al_${align},q_85/img.jpg`;
}

/** Raw (full resolution) asset URL — used as a fallback if a transform fails. */
export function photoRaw(file) {
  return `${CDN}/${file}`;
}

/**
 * Authentic Shanti Hospital media files.
 *
 * Verified visually one-by-one against the CDN — `d86a7e` is the Cardiology /
 * Hemato-Oncology announcement poster and `1a3d33` is the building's front
 * elevation (these two were transposed in an earlier revision, which put the
 * poster behind the hero headline).
 */
export const MEDIA = {
  logo: '864efd_3a22c284387f47d1b14c4921912dd34a~mv2.jpg',
  buildingFront: '864efd_1a3d33f7673045679c935b44d2334e4f~mv2.jpeg',
  buildingDusk: '864efd_54746c2d65864ddfb3c1dd9e804ca760~mv2.jpg',
  neonatalIcu: '864efd_00e57b6ffe8d4e6b8465ec74c187fe71~mv2.jpg',
  operationTheatre: '864efd_7042c996e7c247109bf9d62a02a12384~mv2.jpg',
  patientWard: '864efd_d3907439c4b04269b1d0b0ec4acb1d51~mv2.jpg',
  cardiologyLaunch: '864efd_d86a7e8cba024efab2564234ad6d4a52~mv2.jpg',
  locationMap: '864efd_2621166f566d44d3b314031b3225eff4~mv2.jpg',
  // Leadership portraits from the hospital's own brochure. Verified visually:
  // these are the named founders, published by the hospital itself.
  drRajendraPatil: '864efd_2a251fea255d4fbc82185b79e0dd08af~mv2.jpg',
  drSunilPatil: '864efd_e017df48acdf443c937f2f3b979a07ab~mv2.jpg',
};

export const HOSPITAL = {
  name: 'Shanti Hospital',
  city: 'Bagalkot',
  tagline: 'Healing with Compassion. Excellence in Care.',
  promise: 'Your health. Our commitment.',
  motto: 'Reaching the unreached',
  established: 1986,
  beds: 200,
  address: 'Plot No. 7 & 8, Sector 22, Near Navanagar Bus Stand, Navanagar, Bagalkot — 587103, Karnataka',
  addressShort: 'Sector 22, Navanagar, Bagalkot',
  phones: ['08354 220996', '08354 200996'],
  emergency: '08354 220996',
  ambulance: '108',
  email: 'care@shantihospitalbagalkot.com',
  website: 'https://www.shantihospital.in/',
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Shanti+Hospital+Navanagar+Bagalkot',
  about: [
    'Shanti Hospital was born of a vision where quality healthcare is dispensed with excellence as a daily endeavour — where the patient has always been central to our planning and the patient\u2019s needs have always been our priority.',
    'What started as a small pediatric care centre in 1986 has, after nearly four decades of meaningful service, transformed into an institution dedicated to comprehensive, holistic healthcare. Those years of relentless service are the foundation stone of today\u2019s 200-bedded, state-of-the-art multi-speciality hospital.',
    'What makes Shanti Hospital unique is a blend of caring, uncompromising standards and dedication to patient service. With this initiative in place we have underlined our motto of \u201cReaching the unreached\u201d.',
  ],
  /** Round-the-clock services surfaced in the hero + about sections. */
  alwaysOn: ['24×7 Emergency & Trauma', 'Round-the-clock Pharmacy', 'In-house Diagnostics & Lab', 'Ambulance on call'],
};

/** Curated "infrastructure" gallery — real interior + exterior shots. */
export const FACILITY_GALLERY = [
  {
    id: 'fac-exterior',
    title: 'Main Hospital Block',
    caption: '200-bedded multi-speciality facility at Navanagar, Bagalkot',
    file: MEDIA.buildingFront,
    tag: 'Exterior',
  },
  {
    id: 'fac-campus',
    title: 'Campus & New Wing',
    caption: 'Expanded in-patient wing with dedicated visitor parking',
    file: MEDIA.buildingDusk,
    tag: 'Campus',
  },
  {
    id: 'fac-ot',
    title: 'Modular Operation Theatre',
    caption: 'C-arm imaging, laminar airflow and advanced anaesthesia workstations',
    file: MEDIA.operationTheatre,
    tag: 'Surgery',
  },
  {
    id: 'fac-nicu',
    title: 'Neonatal Intensive Care',
    caption: 'Level-III NICU with warmers, incubators and 24×7 neonatology cover',
    file: MEDIA.neonatalIcu,
    tag: 'Critical Care',
  },
  {
    id: 'fac-ward',
    title: 'In-Patient Wards',
    caption: 'Central oxygen, piped suction and continuous monitoring at every bed',
    file: MEDIA.patientWard,
    tag: 'Wards',
  },
];

/** Trust metrics shown in the stats strip. */
export const STATS = [
  { id: 'years', value: '39+', label: 'Years of service', icon: 'Award' },
  { id: 'beds', value: '200', label: 'In-patient beds', icon: 'BedDouble' },
  { id: 'specialities', value: '12+', label: 'Specialities', icon: 'Stethoscope' },
  { id: 'emergency', value: '24×7', label: 'Emergency care', icon: 'Ambulance' },
];

/**
 * Demo-only admin passcode.
 *
 * NOTE: this is a client-side gate for a front-end prototype with no backend.
 * It keeps casual visitors out of the management screens but is NOT real
 * authentication — anyone can read it from the bundle. Replace with a
 * server-verified session before this ever handles real patient data.
 */
export const ADMIN_PASSCODE = 'shanti@2026';

export const APPOINTMENT_STATUSES = ['Pending', 'Confirmed', 'Completed', 'Cancelled'];

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
