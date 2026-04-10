import clsx from 'clsx';

interface ProgressProps {
  value: number; // 0-100
  max?: number;
  label?: string;
  color?: 'blue' | 'green' | 'yellow' | 'red';
  size?: 'sm' | 'md';
  showValue?: boolean;
  className?: string;
}

const colorMap = {
  blue: 'bg-electric-500',
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
};

export default function Progress({
  value,
  max = 100,
  label,
  color = 'blue',
  size = 'md',
  showValue = false,
  className,
}: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={clsx('w-full', className)}>
      {(label || showValue) && (
        <div className="mb-1 flex justify-between text-xs text-gray-400">
          {label && <span>{label}</span>}
          {showValue && <span>{Math.round(pct)}%</span>}
        </div>
      )}
      <div
        className={clsx(
          'w-full overflow-hidden rounded-full bg-navy-700',
          size === 'sm' ? 'h-1' : 'h-2'
        )}
      >
        <div
          className={clsx(
            'h-full rounded-full transition-all duration-500',
            colorMap[color]
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
