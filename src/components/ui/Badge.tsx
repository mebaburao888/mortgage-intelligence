import clsx from 'clsx';
import { ReactNode } from 'react';

type BadgeColor = 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'purple' | 'orange';

interface BadgeProps {
  children: ReactNode;
  color?: BadgeColor;
  className?: string;
}

const colorMap: Record<BadgeColor, string> = {
  blue: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  green: 'bg-green-500/15 text-green-400 border-green-500/25',
  yellow: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
  red: 'bg-red-500/15 text-red-400 border-red-500/25',
  gray: 'bg-gray-500/15 text-gray-400 border-gray-500/25',
  purple: 'bg-purple-500/15 text-purple-400 border-purple-500/25',
  orange: 'bg-orange-500/15 text-orange-400 border-orange-500/25',
};

export default function Badge({ children, color = 'gray', className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
        colorMap[color],
        className
      )}
    >
      {children}
    </span>
  );
}

export function OutcomeBadge({ outcome }: { outcome: string }) {
  const colorMap: Record<string, BadgeColor> = {
    funded: 'green',
    lost: 'red',
    dead: 'red',
    'in-progress': 'blue',
    unknown: 'gray',
    withdrawn: 'yellow',
    rejected: 'red',
    ghost: 'purple',
  };
  const color = colorMap[outcome] || 'gray';
  return <Badge color={color}>{outcome}</Badge>;
}
