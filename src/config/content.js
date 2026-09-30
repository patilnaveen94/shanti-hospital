/**
 * Long-form editorial content, transcribed from Shanti Hospital's own website.
 *
 * Sources:
 *  /about-us                 → positioning, commitments, objective
 *  /                         → founding story
 *  /services-4  (Facilities) → ICU, theatre, equipment and scheme lists
 *  /s-projects-side-by-side  → philanthropy initiatives
 *  /about-3     (Testimonials) → visitor quotes (trimmed, attribution preserved)
 */

/** Opening positioning statement from the About Us page. */
export const ABOUT_INTRO = [
  'Shanti Hospital is located in the district headquarters of Bagalkot, in North Karnataka, and is one of the pioneers in paediatric care in this underserved region.',
  'The multi-speciality hospital offers patients the most advanced care possible by constantly generating new expertise through innovation and the sharing of knowledge, to meet the constantly changing needs of the patient. The doctors, nurses and staff consider themselves part of your extended family — and the hospital, your home.',
  'Hospitality requires heart and soul at the first instant, and that is deeply infused in the hospital\u2019s services. A readiness to absorb emerging medical trends, paired with a concern for affordability, has made Shanti a hallmark of medical service for everyone. With caring hands and smiling faces, patients sense a warmth of assurance — itself a healing effect.',
];

/** The hospital's stated objective. */
export const OBJECTIVE =
  'To provide quality healthcare services and facilities for the community, to promote wellness and to relieve suffering — as humanely as it can be done, consistent with the best service we can offer at the highest value.';

/** The six commitments listed on the About Us page. */
export const COMMITMENTS = [
  { icon: 'HeartHandshake', title: 'Care with dignity', body: 'Treating patients with the utmost care, respect, compassion and dignity.' },
  { icon: 'Cpu', title: 'Latest technology', body: 'Continually upgrading ourselves with the latest medical technologies.' },
  { icon: 'Users', title: 'Talented professionals', body: 'Attracting and retaining highly talented medical professionals.' },
  { icon: 'ShieldCheck', title: 'Safety controls', body: 'Implementing adequate controls of safety against occupational health hazards.' },
  { icon: 'TrendingUp', title: 'Quality systems', body: 'Continuously improving quality and healthcare systems across the hospital.' },
  { icon: 'GraduationCap', title: 'Teaching & research', body: 'Promoting education and research in medicine for better healthcare.' },
];

/** Founding milestones, drawn from the hospital's own narrative. */
export const MILESTONES = [
  {
    year: '1986',
    title: 'Shanti Children\u2019s Hospital opens',
    body: 'Dr. R T Patil, the first paediatrician in Bagalkot city, returns from J J Hospital Bombay and starts a small paediatric care centre.',
  },
  {
    year: '1990s',
    title: 'Tertiary paediatric intensive care',
    body: 'The region\u2019s first tertiary PICU and neonatology units are established, ending long referral journeys to distant cities.',
  },
  {
    year: '2011',
    title: 'A 100-bed multi-speciality hospital',
    body: 'Shanti Hospital opens as a 100-bedded multi-speciality institution, broadening from paediatrics into adult care.',
  },
  {
    year: 'Today',
    title: '200 beds, 22 departments',
    body: 'A 200-bedded multi-speciality hospital with five operation theatres, DNB and fellowship accreditation, and newly launched Cardiology and Hemato-Oncology services.',
  },
];

/**
 * Leadership.
 *
 * Portraits are from Shanti Hospital's own brochure and the biographies come
 * from the hospital's General Paediatrics and PICU pages, so both name and
 * likeness are as the hospital publishes them.
 */
export const LEADERSHIP = [
  {
    id: 'dr-rajendra-patil',
    name: 'Dr. Rajendra T Patil',
    shortName: 'Dr. R T Patil',
    role: 'Founder & Senior Consultant Paediatrician',
    qualification: 'MD (Paediatrics)',
    photoKey: 'drRajendraPatil',
    doctorId: 'doc-rt-patil',
    eyebrow: 'Founder · since 1986',
    accent: 'primary',
    bio: [
      'The first paediatrician in Bagalkot city. After completing his MD in Paediatrics he worked at J J Hospital, Bombay, then returned home and opened Shanti Children\u2019s Hospital in 1986 — a small paediatric care centre in a district with almost no specialist child health services.',
      'In 2011 he established Shanti Hospital as a 100-bedded multi-speciality institution, the foundation of today\u2019s 200-bed campus. The General Paediatrics department he began has since treated more than 2.5 lakh in-patients and cared for over 20 lakh out-patient visits.',
    ],
    highlights: ['First paediatrician in Bagalkot', 'Founded the hospital in 1986', '2.5 lakh+ children treated'],
  },
  {
    id: 'dr-sunil-patil',
    name: 'Dr. Sunil J Patil',
    shortName: 'Dr. Sunil J Patil',
    role: 'Chief — Paediatric Critical Care Division',
    qualification: 'MD (Paediatrics), FPCC',
    photoKey: 'drSunilPatil',
    doctorId: 'doc-sunil-patil',
    eyebrow: 'Paediatric critical care',
    accent: 'mint',
    bio: [
      'The first paediatric intensivist in the region. He led the establishment of tertiary paediatric intensive care and neonatology units in Bagalkot, work that keeps critically ill children close to their families instead of being referred hundreds of kilometres away.',
      'He completed his fellowship at the Paediatric Critical Care Unit of Sir Ganga Ram Hospital, New Delhi, and is certified by the Critical Care group of the Indian Academy of Paediatrics and the Indian Society of Critical Care Medicine. He was instrumental in Shanti Hospital gaining DNB and Fellowship teaching accreditation.',
    ],
    highlights: ['First paediatric intensivist in the region', 'Built the tertiary PICU & NICU', 'DNB & Fellowship accreditation'],
  },
];

/** Community work from the Philanthropy page. */
export const PHILANTHROPY = [
  {
    id: 'yadahalli',
    index: '01',
    title: 'Free healthcare for Yadahalli',
    body: 'Free IPD, OPD and investigations have been offered to the people of Yadahalli village in Bilagi Taluka for the past 40 years, with the aim of ensuring equitable access to medical care.',
    stat: '40 years',
    icon: 'HeartHandshake',
  },
  {
    id: 'rural-camps',
    index: '02',
    title: 'Rural health camps',
    body: 'Free camps across rural Bagalkot district provide basic medical check-ups, consultations and health guidance, raising health awareness among rural residents.',
    stat: 'District-wide',
    icon: 'Tent',
  },
  {
    id: 'anemia',
    index: '03',
    title: 'Anaemia detection & prevention',
    body: 'Screening camps at government schools promote early detection, with nutrition guidance and education to support healthier development in children.',
    stat: 'Govt. schools',
    icon: 'Droplets',
  },
  {
    id: 'thalassemia',
    index: '04',
    title: 'Thalassemia care',
    body: 'A long-standing commitment to free treatment for thalassemia patients, which has benefited more than 1,500 patients to date.',
    stat: '1,500+ patients',
    icon: 'Ribbon',
  },
];

/** Critical-care and theatre capability from the Facilities page. */
export const CRITICAL_CARE = [
  {
    id: 'nicu',
    name: 'Neonatal Intensive Care Unit',
    icon: 'Baby',
    accent: 'blue',
    body: 'Designed for neonates needing specialised treatment, with high ceilings and controlled ambient temperature and lighting.',
    equipment: [
      'Servo-controlled warmers & incubators',
      'Neonatal ventilators',
      'Servo-controlled whole-body cooling',
      'Bubble CPAP & HFNC',
      'Phototherapy units',
      'Apnea monitors & pulse oximeters',
      'Portable X-ray',
      'Exchange transfusion & surfactant therapy',
    ],
  },
  {
    id: 'picu',
    name: 'Paediatric Intensive Care Unit',
    icon: 'Activity',
    accent: 'amber',
    body: 'State-of-the-art monitoring for critically ill children, including support following paediatric surgical procedures.',
    equipment: [
      'Paediatric ventilators',
      'Multi-parameter monitors',
      'Invasive haemodynamic monitoring',
      'Central venous catheterisation',
      'Infusion pumps & cardiac monitors',
      'Portable X-ray',
    ],
  },
  {
    id: 'aicu',
    name: 'Adult Intensive Care Unit',
    icon: 'BedDouble',
    accent: 'teal',
    body: 'A 20-bed unit providing acute care for adult and geriatric critically ill medical patients.',
    equipment: [
      'Cardiac & respiratory support',
      'Renal and liver failure care',
      'Gastrointestinal & haematological conditions',
      'Trauma and accident care',
    ],
  },
  {
    id: 'sicu',
    name: 'Surgical Intensive Care Unit',
    icon: 'Slice',
    accent: 'violet',
    body: 'Round-the-clock care for patients recovering from elective or emergency surgery, managed by a multidisciplinary team.',
    equipment: ['Post-operative monitoring', 'Multidisciplinary surgical team', 'Recovery & post-operative wards'],
  },
];

/** The five-theatre complex. */
export const THEATRE_COMPLEX = {
  count: 5,
  summary:
    'Five operation theatres equipped to international sterilisation standards, with a dedicated recovery room and post-operative wards.',
  allocation: [
    'Orthopaedics & Neurosurgery',
    'Paediatric Surgery, General Surgery, OBG & ENT',
    'Ophthalmology',
  ],
  equipment: [
    'C-Arm',
    'Moller Wedel Hi-R 700 operating microscope',
    'Image intensifier',
    'Life support systems',
    'Anaesthesia workstations',
    'Endoscope, bronchoscope & laparoscope',
  ],
};

/** Diagnostic and support services listed on the Facilities page. */
export const SUPPORT_SERVICES = [
  { icon: 'Scan', label: 'Radiology', detail: 'CT scan, X-ray, portable X-ray & ultrasonography' },
  { icon: 'HeartPulse', label: 'Cardiology', detail: 'ECG, ECHO & TMT' },
  { icon: 'BrainCircuit', label: 'Neurology', detail: 'EEG, BEAP, NCV & EMG' },
  { icon: 'Microscope', label: 'Laboratory', detail: 'Clinical laboratory & diagnostics' },
  { icon: 'Baby', label: 'Labour room', detail: 'Dedicated delivery suite' },
  { icon: 'Syringe', label: 'Vaccination unit', detail: 'Routine childhood immunisation' },
  { icon: 'Pill', label: '24-hour pharmacy', detail: 'Open every day of the year' },
  { icon: 'GraduationCap', label: 'Health education', detail: 'Patient & community education' },
];

/** Cashless / government schemes accepted. */
export const SCHEMES = [
  'Ayushman Bharat – Arogya Karnataka Scheme',
  'Jyoti Sanjeevini Scheme',
  'Rajeev Arogya Bhagya Scheme',
  'Government Employee\u2019s Reimbursement Scheme',
];

/**
 * Visitor testimonials from the hospital's Testimonials page.
 * Quotes are trimmed; attribution is reproduced as published.
 */
export const TESTIMONIALS = [
  {
    id: 't-halagali',
    quote:
      'It is my proud privilege to be at Shanti Hospital. The technology, expert applications and the personal care is the best in our country.',
    name: 'Lt. Gen. Ramesh Halagali',
    role: 'Deputy Chief of Army Staff, Indian Army',
  },
  {
    id: 't-reddy',
    quote:
      'This is the hospital with soul — sanctity of hospital at its best, and the patient is the prime concern around whom everything revolves.',
    name: 'Dr. Yogananda Reddy',
    role: 'President, IMA Karnataka Chapter',
  },
  {
    id: 't-khaadar',
    quote: 'Excellent infrastructure, clean premises, affordable charges. Pleased to see a lot of beneficiaries.',
    name: 'Dr. U T Khaadar',
    role: 'Minister of Health, Government of Karnataka',
  },
  {
    id: 't-chugh',
    quote:
      'Bagalkot may be far from Delhi, but in the context of paediatric medical care the distance is very small.',
    name: 'Dr. Krishan Chugh',
    role: 'Fortis Hospital, Gurgaon NCR',
  },
  {
    id: 't-sachdev',
    quote:
      'Infrastructure impressive and very thoughtful. The work done for the children is very impressive, at very nominal charges.',
    name: 'Dr. Anil Sachdev',
    role: 'Director, Paediatric Critical Care, Sir Ganga Ram Hospital, New Delhi',
  },
  {
    id: 't-indumathy',
    quote: 'A totally unexpected surprise — to find such a beautiful hospital in such a remote part of India.',
    name: 'Dr. Indumathy',
    role: 'Santhanam Institute of Child Health, Madras Medical College',
  },
  {
    id: 't-patil',
    quote: 'Well maintained hospital, in a place like Bagalkot. I am sure the hospital is doing excellent service.',
    name: 'Dr. Sharan Prakash Patil',
    role: 'Minister for Medical Education, Government of Karnataka',
  },
  {
    id: 't-joshi',
    quote: 'An excellent set up, with well planned space and speciality unit management.',
    name: 'Dr. M M Joshi',
    role: 'Hubli',
  },
];
