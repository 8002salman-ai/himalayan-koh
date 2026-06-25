import { Link } from 'react-router-dom';
import { clsx } from 'clsx';

interface Action {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
}

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: Action;
  secondaryAction?: Action;
  className?: string;
  /** Use 'page' for full-page empty states, 'card' for inline ones */
  size?: 'page' | 'card' | 'compact';
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  size = 'card',
}: EmptyStateProps) {
  const padding = size === 'page' ? 'p-16' : size === 'compact' ? 'p-6' : 'p-12';
  const iconSize = size === 'compact' ? 'text-4xl' : 'text-5xl';

  return (
    <div
      className={clsx(
        'bg-white rounded-2xl shadow-md text-center flex flex-col items-center',
        padding,
        className,
      )}
    >
      {icon && (
        <div className={clsx('mb-4 text-gray-200', iconSize)}>{icon}</div>
      )}

      <h3
        className={clsx(
          'font-serif font-bold text-charcoal mb-2',
          size === 'compact' ? 'text-base' : 'text-xl',
        )}
      >
        {title}
      </h3>

      {description && (
        <p className="text-charcoal-light text-sm max-w-xs mx-auto mb-6 leading-relaxed">
          {description}
        </p>
      )}

      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
          {action && <ActionButton action={action} primary />}
          {secondaryAction && <ActionButton action={secondaryAction} />}
        </div>
      )}
    </div>
  );
}

function ActionButton({ action, primary = false }: { action: Action; primary?: boolean }) {
  const base =
    'inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-colors';
  const primaryCls = 'bg-himalayan hover:bg-himalayan-dark text-white';
  const secondaryCls =
    'bg-transparent border border-himalayan-line text-charcoal hover:bg-warm-white';
  const cls = clsx(base, primary ? primaryCls : secondaryCls);

  if (action.href) {
    return (
      <Link to={action.href} className={cls}>
        {action.label}
      </Link>
    );
  }
  return (
    <button type="button" onClick={action.onClick} className={cls}>
      {action.label}
    </button>
  );
}
