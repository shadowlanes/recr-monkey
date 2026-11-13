'use client';

interface DateTileProps {
  date: Date;
  highlight?: boolean;
}

export default function DateTile({ date, highlight = false }: DateTileProps) {
  return (
    <span
      className={`block w-[52px] rounded-xl text-center py-1.5 font-mono tnum ${
        highlight ? 'bg-accent text-white' : 'bg-accent-soft text-accent-deep'
      }`}
    >
      <span className="block font-bold text-lg leading-tight">{date.getDate()}</span>
      <span className="block font-semibold text-[10px] uppercase tracking-widest">
        {date.toLocaleDateString('en-IN', { month: 'short' })}
      </span>
    </span>
  );
}
