'use client';

import { categoryInk, categorySoft } from '../../lib/categories';

interface DateTileProps {
  date: Date;
  /** Today's charge: solid accent tile */
  highlight?: boolean;
  /** Tints the tile with the category's pastel */
  category?: string | null;
  size?: 'md' | 'sm';
}

export default function DateTile({ date, highlight = false, category, size = 'md' }: DateTileProps) {
  const style = highlight
    ? undefined
    : { background: categorySoft(category ?? null), color: categoryInk(category ?? null) };
  const box = size === 'sm' ? 'w-11 h-11 rounded-[14px]' : 'w-14 h-14 rounded-[18px]';
  return (
    <span
      className={`${box} flex flex-col items-center justify-center leading-none font-mono tnum ${
        highlight ? 'bg-accent text-on-accent' : ''
      }`}
      style={style}
    >
      <span className={`block font-medium ${size === 'sm' ? 'text-base' : 'text-xl'}`}>
        {String(date.getDate()).padStart(2, '0')}
      </span>
      <span className="block font-sans font-bold text-[10px] uppercase tracking-widest mt-[3px]">
        {highlight ? 'today' : date.toLocaleDateString('en-IN', { month: 'short' })}
      </span>
    </span>
  );
}
