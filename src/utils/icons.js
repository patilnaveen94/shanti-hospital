import {
  Accessibility,
  Activity,
  Ambulance,
  Award,
  Baby,
  BedDouble,
  Bone,
  Brain,
  BrainCircuit,
  Cpu,
  Droplets,
  Ear,
  Eye,
  FlaskConical,
  Flower2,
  GraduationCap,
  HeartHandshake,
  HeartPulse,
  Hospital,
  Microscope,
  Pill,
  Ribbon,
  Scan,
  Scissors,
  Shield,
  ShieldCheck,
  Slice,
  Smile,
  Sparkles,
  Stethoscope,
  Syringe,
  Tent,
  TestTube,
  TrendingUp,
  Users,
  Wind,
} from 'lucide-react';

/**
 * Redux state must stay serialisable, so departments store an icon *name*
 * and this registry resolves it to a Lucide component at render time.
 */
export const ICON_REGISTRY = {
  Accessibility,
  Activity,
  Ambulance,
  Award,
  Baby,
  BedDouble,
  Bone,
  Brain,
  BrainCircuit,
  Cpu,
  Droplets,
  Ear,
  Eye,
  FlaskConical,
  Flower2,
  GraduationCap,
  HeartHandshake,
  HeartPulse,
  Hospital,
  Microscope,
  Pill,
  Ribbon,
  Scan,
  Scissors,
  Shield,
  ShieldCheck,
  Slice,
  Smile,
  Sparkles,
  Stethoscope,
  Syringe,
  Tent,
  TestTube,
  TrendingUp,
  Users,
  Wind,
};

/** Names offered in the admin department form. */
export const ICON_OPTIONS = Object.keys(ICON_REGISTRY).sort();

/** Resolve an icon name to a component, falling back to a safe default. */
export function resolveIcon(name) {
  return ICON_REGISTRY[name] || Stethoscope;
}

/**
 * Accent themes for department cards. Stored by key on each department so
 * admins can pick a colour without us building Tailwind class names
 * dynamically (the JIT compiler would purge those).
 */
export const ACCENTS = {
  blue: { chip: 'bg-primary-50 text-primary-700', icon: 'bg-primary-100 text-primary-700', ring: 'group-hover:border-primary-300', bar: 'bg-primary-500', text: 'text-primary-700' },
  mint: { chip: 'bg-mint-50 text-mint-700', icon: 'bg-mint-100 text-mint-700', ring: 'group-hover:border-mint-300', bar: 'bg-mint-500', text: 'text-mint-700' },
  rose: { chip: 'bg-heritage-50 text-heritage-700', icon: 'bg-heritage-100 text-heritage-700', ring: 'group-hover:border-heritage-300', bar: 'bg-heritage-600', text: 'text-heritage-700' },
  amber: { chip: 'bg-amber-50 text-amber-700', icon: 'bg-amber-100 text-amber-700', ring: 'group-hover:border-amber-300', bar: 'bg-amber-500', text: 'text-amber-700' },
  violet: { chip: 'bg-violet-50 text-violet-700', icon: 'bg-violet-100 text-violet-700', ring: 'group-hover:border-violet-300', bar: 'bg-violet-500', text: 'text-violet-700' },
  teal: { chip: 'bg-teal-50 text-teal-700', icon: 'bg-teal-100 text-teal-700', ring: 'group-hover:border-teal-300', bar: 'bg-teal-500', text: 'text-teal-700' },
};

export const ACCENT_OPTIONS = Object.keys(ACCENTS);

export function resolveAccent(key) {
  return ACCENTS[key] || ACCENTS.blue;
}

/** Department groupings used by the explorer tabs. */
export const DEPARTMENT_GROUPS = ['Adult', 'Paediatric', 'Support'];
