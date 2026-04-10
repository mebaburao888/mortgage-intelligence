import clsx from 'clsx';
import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  header?: string | ReactNode;
  noPadding?: boolean;
}

export default function Card({ children, className, header, noPadding }: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-xl border border-navy-700 bg-navy-800/80 backdrop-blur-sm',
        className
      )}
    >
      {header && (
        <div className="border-b border-navy-700 px-5 py-3">
          {typeof header === 'string' ? (
            <h3 className="text-sm font-semibold text-gray-200">{header}</h3>
          ) : (
            header
          )}
        </div>
      )}
      <div className={clsx(!noPadding && 'p-5')}>{children}</div>
    </div>
  );
}
