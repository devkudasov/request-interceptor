import { type ReactNode } from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'method';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  color?: string;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-surface-secondary text-content-secondary',
  success: 'bg-status-success/20 text-status-success',
  warning: 'bg-status-warning/20 text-status-warning',
  error: 'bg-status-error/20 text-status-error',
  info: 'bg-status-info/20 text-status-info',
  method: '',
};

export function Badge({ children, variant = 'default', color, className = '' }: BadgeProps) {
  const style = color ? { backgroundColor: `${color}20`, color } : undefined;

  return (
    <span
      className={`inline-flex items-center px-sm py-xs text-xs font-semibold rounded ${variantClasses[variant]} ${className}`}
      style={style}
    >
      {children}
    </span>
  );
}
