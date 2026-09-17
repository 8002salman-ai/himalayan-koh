import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  BUTTON,
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
  tabs: Array<{ id: T; label: string; badge?: string }>;
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-admin-line">
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`-mb-px flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm font-semibold transition-colors ${
              isActive
                ? 'border-himalayan text-himalayan-dark'
                : 'border-transparent text-admin-muted hover:text-admin-ink'
            }`}
          >
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
