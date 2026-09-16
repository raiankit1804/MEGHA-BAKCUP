'use client';

import React, { useState } from 'react';

export interface FilterItem {
  id: string;
  label: string;
  emoji: string;
  short: string;
  var: string;
}

const DOMAIN_FILTERS: FilterItem[] = [
  { id: 'normal', label: 'Normal / Smart City', emoji: '🏙️', short: 'City', var: '--chip-normal' },
  { id: 'agriculture', label: 'Agriculture', emoji: '🌾', short: 'Agriculture', var: '--chip-agri' },
  { id: 'aviation', label: 'Aviation & Marine', emoji: '✈️', short: 'Avia & Marine', var: '--chip-aviation' },
  { id: 'research', label: 'Study / Research', emoji: '📊', short: 'Research', var: '--chip-research' },
];

export interface DomainFilterBarProps {
  value?: string;
  onChange: (id: string) => void;
}

export default function DomainFilterBar({ value, onChange }: DomainFilterBarProps) {
  return (
    <div style={bar} role="group" aria-label="Domain filter selection">
      {DOMAIN_FILTERS.map((f) => (
        <FilterChip
          key={f.id}
          filter={f}
          active={value === f.id}
          onClick={() => onChange(f.id)}
        />
      ))}
    </div>
  );
}

interface FilterChipProps {
  filter: FilterItem;
  active: boolean;
  onClick: () => void;
}

function FilterChip({ filter, active, onClick }: FilterChipProps) {
  const [pressed, setPressed] = useState(false);
  const chipColor = `var(${filter.var})`;

  return (
    <button
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      aria-pressed={active}
      aria-label={filter.label}
      style={{
        ...chip,
        borderColor: active ? chipColor : 'var(--border-subtle)',
        background: active ? `color-mix(in srgb, ${chipColor} 15%, var(--bg-glass))` : 'var(--bg-glass)',
        color: active ? chipColor : 'var(--text-secondary)',
        transform: pressed ? 'scale(0.96)' : 'scale(1)',
        fontWeight: active ? 600 : 400,
      }}
    >
      <span style={{ fontSize: '1rem', lineHeight: 1 }}>{filter.emoji}</span>
      <span style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{filter.short}</span>
    </button>
  );
}

const bar: React.CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
  padding: '0.5rem 1rem',
  overflowX: 'auto',
  scrollbarWidth: 'none',
  borderBottom: '1px solid var(--border-subtle)',
  background: 'var(--bg-surface)',
};

const chip: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.35rem',
  padding: '0.35rem 0.75rem',
  borderRadius: 'var(--radius-pill)',
  border: '1px solid',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  fontSize: '0.85rem',
  userSelect: 'none',
  flexShrink: 0,
};
