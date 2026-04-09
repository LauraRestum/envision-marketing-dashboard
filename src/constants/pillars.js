export const PILLARS = [
  { key: 'research', label: 'Research', color: '#003087' },
  { key: 'vision_rehab', label: 'Vision Rehab', color: '#7B2D8E' },
  { key: 'employment', label: 'Employment', color: '#E87722' },
  { key: 'education', label: 'Education', color: '#0097A9' },
  { key: 'arts_culture', label: 'Arts & Culture', color: '#C41E3A' },
];

export const PILLAR_MAP = Object.fromEntries(
  PILLARS.map((p) => [p.key, p])
);

export const PILLAR_LABELS = Object.fromEntries(
  PILLARS.map((p) => [p.key, p.label])
);
