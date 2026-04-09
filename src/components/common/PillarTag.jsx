import { PILLAR_MAP } from '../../constants/pillars';
import './PillarTag.css';

export default function PillarTag({ pillarKey, size = 'sm' }) {
  const pillar = PILLAR_MAP[pillarKey];
  if (!pillar) return null;

  return (
    <span
      className={`pillar-tag pillar-tag--${size}`}
      style={{
        background: `${pillar.color}18`,
        color: pillar.color,
        borderColor: `${pillar.color}30`,
      }}
      title={pillar.label}
    >
      {pillar.label}
    </span>
  );
}
