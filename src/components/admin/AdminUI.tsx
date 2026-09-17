import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  BUTTON,
  INPUT,
  MICRO_LABEL as MICRO_LABEL_CLASS,
  CHIP,
  CHIP_BASE,
  ICON_TILE,
  ICON_TILE_TONES,
  MICRO_LABEL,
  SURFACE,
  SURFACE_BODY,
  SURFACE_HEADER,
  TABLE,
  TABLE_BODY,
  TABLE_HEAD,
  TABLE_WRAP,
  TD,
  TEXTAREA,
  TH,
  type ChipTone,
  type IconTone,
} from './adminTheme';

/**
 * The admin console's shared primitives.
 *
 * Pages compose these instead of hand-rolling panels, headers, tables and
 * chips, which is what keeps thirteen sections looking like one product. Each
 * one is deliberately dumb: no data fetching, no state, no policy — the page
 * owns that. The single exception is `AdminPendingPanel`, which exists to make
 * "this backend is not wired yet" a first-class, consistent state instead of a
 * page that quietly shows numbers it does not have.
 */

/* ------------------------------------------------------------------ */
/* Page header                                                         */
/* ------------------------------------------------------------------ */

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className={MICRO_LABEL}>{eyebrow}</p>}
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-admin-ink">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm text-admin-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Panel                                                               */
/* ------------------------------------------------------------------ */

export function AdminPanel({
  title,
  description,
  action,
  children,
  bodyClassName,
  className,
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  bodyClassName?: string;
  className?: string;
}) {
  const hasHeader = Boolean(title || description || action);
  return (
    <section className={`${SURFACE} ${className ?? ''}`}>
      {hasHeader && (
        <div className={SURFACE_HEADER}>
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold text-admin-ink">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-admin-muted">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children !== undefined && <div className={bodyClassName ?? SURFACE_BODY}>{children}</div>}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Stat tile                                                           */
/* ------------------------------------------------------------------ */

/**
 * One figure on the dashboard, linking to where it is managed.
 *
 * `unavailable` is a real state, not an error: a source that cannot report the
 * figure says so. It is deliberately impossible to render "0" for an unknown —
 * callers pass either a value or the reason there is none.
 */
export function AdminStatTile({
  label,
  icon: Icon,
  tone = 'brand',
  value,
  hint,
  unavailable,
  to,
}: {
  label: string;
  icon: LucideIcon;
  tone?: IconTone;
  value?: ReactNode;
  hint?: string;
  unavailable?: string;
  to?: string;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className={`${ICON_TILE} ${ICON_TILE_TONES[tone]}`}>
          <Icon size={16} />
        </span>
        {hint && <span className="text-[11px] font-medium text-admin-muted">{hint}</span>}
      </div>
      <p className={`mt-4 ${MICRO_LABEL}`}>{label}</p>
      {unavailable ? (
        <p className="mt-1 text-sm font-semibold text-admin-muted">{unavailable}</p>
      ) : (
        <p className="mt-1 text-2xl font-bold tracking-tight text-admin-ink">{value}</p>
      )}
    </>
  );

  const className = `${SURFACE} block p-5 transition-shadow hover:shadow-[0_2px_4px_rgba(16,24,40,0.05),0_18px_40px_-24px_rgba(16,24,40,0.3)]`;

  return to ? (
    <Link to={to} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

/* ------------------------------------------------------------------ */
/* Chips + notices                                                     */
/* ------------------------------------------------------------------ */

export function AdminChip({
  tone = 'neutral',
  icon: Icon,
  children,
}: {
  tone?: ChipTone;
  icon?: LucideIcon;
  children: ReactNode;
}) {
  return (
    <span className={`${CHIP_BASE} ${CHIP[tone]}`}>
      {Icon && <Icon size={11} />}
      {children}
    </span>
  );
}

const NOTICE_TONES = {
  info: 'border-sky-200 bg-sky-50 text-sky-950',
  warning: 'border-amber-200 bg-amber-50 text-amber-950',
  danger: 'border-red-200 bg-red-50 text-red-950',
  neutral: 'border-admin-line bg-admin-canvas text-admin-ink',
} as const;

export function AdminNotice({
  tone = 'info',
  title,
  children,
  action,
}: {
  tone?: keyof typeof NOTICE_TONES;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className={`rounded-2xl border px-5 py-4 text-sm ${NOTICE_TONES[tone]}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">{title}</p>
          {children && <div className="mt-1 text-[13px] opacity-90">{children}</div>}
        </div>
        {action}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Table                                                               */
/* ------------------------------------------------------------------ */

export interface AdminColumn {
  key: string;
  label: ReactNode;
  align?: 'left' | 'right' | 'center';
  width?: string;
}

export function AdminTable({
  columns,
  children,
  minWidth,
}: {
  columns: AdminColumn[];
  children: ReactNode;
  minWidth?: string;
}) {
  return (
    <div className={TABLE_WRAP}>
      <table className={TABLE} style={minWidth ? { minWidth } : undefined}>
        <thead className={TABLE_HEAD}>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={`${TH} ${column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : ''}`}
                style={column.width ? { width: column.width } : undefined}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={TABLE_BODY}>{children}</tbody>
      </table>
    </div>
  );
}

/** The cell class a page uses for its own `<td>`s. */
export const ADMIN_TD = TD;

export function AdminTableSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <tr key={rowIndex}>
          {Array.from({ length: columns }, (_, columnIndex) => (
            <td key={columnIndex} className={TD}>
              <div className="h-4 w-full max-w-[160px] animate-pulse rounded bg-admin-canvas" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Tabs                                                                */
/* ------------------------------------------------------------------ */

export function AdminTabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: Array<{ id: T; label: string; icon?: LucideIcon; badge?: string }>;
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex items-center gap-1 border-b border-admin-line">
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-semibold transition-colors ${
              isActive
                ? 'border-himalayan text-himalayan-dark'
                : 'border-transparent text-admin-muted hover:text-admin-ink'
            }`}
          >
            {Icon && <Icon size={15} />}
            {tab.label}
            {tab.badge && <AdminChip tone={isActive ? 'brand' : 'muted'}>{tab.badge}</AdminChip>}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pending integration                                                 */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Dialog                                                              */
/* ------------------------------------------------------------------ */

/** Dialog widths, widest last. `wide` is the full editor sheet. */
const MODAL_SIZE = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  wide: 'w-[min(1100px,calc(100%-3rem))]',
} as const;

/**
 * The console's dialog: backdrop, panel, titled header with one close
 * affordance, scrolling body and an optional footer.
 *
 * Every confirm, editor and drawer in the admin is this component, so a dialog
 * cannot drift from the rest of the console — and `variant="drawer"` is the
 * same dialog against the right edge rather than a second implementation.
 *
 * Callers mount it inside `<AnimatePresence>` (it is a motion element, so the
 * exit animation runs) and are responsible for what happens on save or delete;
 * this component never decides policy.
 */
export function AdminModal({
  title,
  description,
  onClose,
  children,
  footer,
  size = 'md',
  variant = 'center',
  bodyClassName,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: keyof typeof MODAL_SIZE;
  variant?: 'center' | 'drawer';
  bodyClassName?: string;
  className?: string;
}) {
  const isDrawer = variant === 'drawer';

  return (
    <div
      className={
        isDrawer
          ? 'fixed inset-0 z-modal flex justify-end'
          : 'fixed inset-0 z-modal flex items-center justify-center p-6'
      }
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        initial={isDrawer ? { x: 32, opacity: 0 } : { opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
        exit={isDrawer ? { x: 32, opacity: 0 } : { opacity: 0, scale: 0.97, y: 12 }}
        className={`relative flex flex-col overflow-hidden border-admin-line bg-admin-surface shadow-2xl ${
          isDrawer
            ? 'h-full w-full max-w-md border-l'
            : `max-h-[90vh] w-full rounded-2xl border ${MODAL_SIZE[size]}`
        } ${className ?? ''}`}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-admin-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-admin-ink">{title}</h2>
            {description && <p className="mt-1 text-sm text-admin-muted">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-admin-muted transition-colors hover:bg-admin-canvas hover:text-admin-ink"
          >
            <X size={18} />
          </button>
        </div>
        <div className={`min-h-0 flex-1 overflow-y-auto px-5 py-5 ${bodyClassName ?? ''}`}>{children}</div>
        {footer && (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-admin-line bg-admin-canvas/50 px-5 py-4">
            {footer}
          </div>
        )}
      </motion.div>
    </div>
  );
}

/**
 * The honest state for a section whose backend is not connected.
 *
 * It states what the section will do, what it needs to become live, and what is
 * already true today — so a reviewer can tell "not built yet" apart from
 * "built and broken". It never renders a figure to fill the space.
 */
export function AdminPendingPanel({
  title,
  summary,
  needs,
  available,
}: {
  title: string;
  summary: string;
  needs: string[];
  available?: string[];
}) {
  return (
    <AdminPanel title={title} description={summary}>
      {/* Fixed two columns, never a breakpoint stack: the admin keeps its
          desktop layout at every viewport. */}
      <div className="grid grid-cols-2 gap-5">
        <div>
          <p className={MICRO_LABEL}>Required to go live</p>
          <ul className="mt-3 space-y-2 text-sm text-admin-ink">
            {needs.map((need) => (
              <li key={need} className="flex items-start gap-2.5">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                <span>{need}</span>
              </li>
            ))}
          </ul>
        </div>
        {available && available.length > 0 && (
          <div>
            <p className={MICRO_LABEL}>Already available</p>
            <ul className="mt-3 space-y-2 text-sm text-admin-muted">
              {available.map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <p className="mt-5 border-t border-admin-line pt-4 text-xs text-admin-muted">
        This section shows no figures until the connection above exists — an empty panel is the
        honest state, not a placeholder.
      </p>
    </AdminPanel>
  );
}

/* ------------------------------------------------------------------ */
/* Controls                                                            */
/* ------------------------------------------------------------------ */

/**
 * The console's button.
 *
 * A component rather than a class string so a view never restates a button's
 * padding, radius, weight or hover colour — the five variants here are the
 * whole vocabulary, and `AdminDisabledAction` covers the sixth case (a control
 * that cannot act yet).
 */
export function AdminButton({
  variant = 'secondary',
  icon: Icon,
  children,
  className,
  ...props
}: {
  variant?: keyof typeof BUTTON;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className'>) {
  return (
    <button type="button" {...props} className={`${BUTTON[variant]} ${className ?? ''}`}>
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
}

/** Label + hint + control, so every form field shares one label rhythm. */
export function AdminField({
  label,
  hint,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="block text-xs font-semibold text-admin-ink">
        {label}
      </label>
      {hint && <p className="mt-0.5 text-[11px] text-admin-muted">{hint}</p>}
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

/** A plain text/number/email input on the console's field style. */
export function AdminInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${INPUT} w-full ${className ?? ''}`} />;
}

/** A multi-line input on the same field style. */
export function AdminTextarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${TEXTAREA} w-full ${className ?? ''}`} />;
}

/** Key/value rows — settings summaries, order details, account facts. */
export function AdminFacts({ children, className }: { children: ReactNode; className?: string }) {
  return <dl className={`divide-y divide-admin-line text-sm ${className ?? ''}`}>{children}</dl>;
}

export function AdminFact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 py-2.5">
      <dt className={MICRO_LABEL_CLASS}>{label}</dt>
      <dd className="text-right font-medium text-admin-ink">{children}</dd>
    </div>
  );
}

/** A disabled-by-policy primary action, with the reason attached. */
export function AdminDisabledAction({ label, reason }: { label: string; reason: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" disabled className={BUTTON.primary} title={reason}>
        {label}
      </button>
      <span className="text-xs text-admin-muted">{reason}</span>
    </div>
  );
}
