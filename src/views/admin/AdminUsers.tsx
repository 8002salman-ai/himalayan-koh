import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, ShieldCheck, UserCog, UserPlus } from 'lucide-react';
import { crmApi } from '../../lib/supabase/api/crm';
import { isSupabaseConfigured } from '../../lib/supabase/client';
import { useAuthContext } from '../../context/AuthContext';
import { getErrorMessage } from '../../lib/errors';
import {
  ADMIN_TD,
  AdminChip,
  AdminNotice,
  AdminPageHeader,
  AdminPanel,
  AdminPendingPanel,
  AdminStatTile,
  AdminTable,
  AdminTableSkeleton,
} from '../../components/admin/AdminUI';

/**
 * Users & Roles.
 *
 * The list is real: administrators come from the Supabase profiles the app
 * already authenticates against, and the signed-in account is identified as
 * you. What is not built is the write side — inviting a user, changing a role,
 * disabling an account and sending a password reset all need the Supabase admin
 * API with a server-only service key, which this deployment deliberately does not
 * hold in the browser. Those controls state that instead of appearing to work.
 */
interface StaffMember {
  id: string;
  full_name: string | null;
  email: string | null;
}

export default function AdminUsers() {
  const { profile, user } = useAuthContext();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const connected = isSupabaseConfigured();

  const load = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setStaff([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const members = await crmApi.getStaff();
      setStaff(members as StaffMember[]);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to read administrator accounts.'));
      setStaff([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rows: StaffMember[] =
    staff.length > 0
      ? staff
      : user?.email
        ? [{ id: user.id, full_name: profile?.full_name ?? null, email: user.email ?? null }]
        : [];

  return (
    <>
      <AdminPageHeader
        eyebrow="System"
        title="Users & Roles"
        description="Administrator accounts and their roles. Customer accounts are managed on the Customers screen."
        actions={
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 rounded-xl border border-admin-line bg-admin-surface px-4 py-2.5 text-sm font-semibold text-admin-ink transition-colors hover:bg-admin-canvas"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        }
      />

      {!connected && (
        <AdminNotice tone="warning" title="Authentication is not connected">
          No auth provider is configured in this deployment, so there is no user directory to read.
          Role changes and invitations below stay disabled.
        </AdminNotice>
      )}

      {error && (
        <AdminNotice tone="danger" title="Could not read administrators">
          {error}
        </AdminNotice>
      )}

      <div className="grid grid-cols-4 gap-4">
        <AdminStatTile
          label="Administrators"
          icon={ShieldCheck}
          tone="brand"
          value={loading ? undefined : connected ? rows.length : undefined}
          unavailable={loading ? 'Reading…' : connected ? undefined : 'Not connected'}
        />
        <AdminStatTile
          label="Roles available"
          icon={UserCog}
          tone="violet"
          value={5}
          hint="Admin · Manager · Marketing · Editor · Customer"
        />
        <AdminStatTile label="Invitations sent" icon={UserPlus} tone="slate" unavailable="Not connected" />
        <AdminStatTile label="Disabled accounts" icon={UserCog} tone="amber" unavailable="Not connected" />
      </div>

      <AdminPanel
        title="Administrators"
        description="Accounts with the admin role, read from the authentication provider the app signs in against."
        action={<AdminChip tone="neutral">{loading ? 'Reading…' : `${rows.length} accounts`}</AdminChip>}
      >
        <AdminTable
          columns={[
            { key: 'name', label: 'Account', width: '40%' },
            { key: 'email', label: 'Email' },
            { key: 'role', label: 'Role' },
            { key: 'status', label: 'Status', align: 'right' },
          ]}
        >
          {loading ? (
            <AdminTableSkeleton rows={3} columns={4} />
          ) : rows.length === 0 ? (
            <tr>
              <td className={ADMIN_TD} colSpan={4}>
                <span className="text-sm text-admin-muted">
                  No administrator accounts were returned.
                </span>
              </td>
            </tr>
          ) : (
            rows.map((member) => {
              const isYou = member.id === user?.id;
              return (
                <tr key={member.id}>
                  <td className={ADMIN_TD}>
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-himalayan to-himalayan-dark text-sm font-semibold text-white">
                        {(member.full_name || member.email || 'A').slice(0, 1).toUpperCase()}
                      </span>
                      <span className="font-medium">{member.full_name || 'Unnamed account'}</span>
                      {isYou && <AdminChip tone="brand">You</AdminChip>}
                    </div>
                  </td>
                  <td className={`${ADMIN_TD} text-admin-muted`}>{member.email ?? '—'}</td>
                  <td className={ADMIN_TD}>
                    <AdminChip tone={isYou ? 'brand' : 'neutral'}>
                      {isYou ? (profile?.role === 'admin' ? 'Super Admin' : 'Staff') : 'Admin'}
                    </AdminChip>
                  </td>
                  <td className={`${ADMIN_TD} text-right`}>
                    <AdminChip tone="success">Active</AdminChip>
                  </td>
                </tr>
              );
            })
          )}
        </AdminTable>
      </AdminPanel>

      <div className="grid grid-cols-2 gap-4">
        <AdminPanel
          title="Your account"
          description="The identity this session is signed in as."
          action={
            <Link
              to="/account"
              className="text-sm font-semibold text-himalayan transition-colors hover:text-himalayan-dark"
            >
              Manage profile
            </Link>
          }
        >
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-admin-muted">Name</dt>
              <dd className="font-medium text-admin-ink">{profile?.full_name || 'Not set'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-admin-muted">Email</dt>
              <dd className="truncate font-medium text-admin-ink">{profile?.email || user?.email || '—'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-admin-muted">Role</dt>
              <dd>
                <AdminChip tone={profile?.role === 'admin' ? 'brand' : 'neutral'}>
                  {profile?.role === 'admin' ? 'Super Admin' : (profile?.role ?? 'customer')}
                </AdminChip>
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-admin-muted">Password change</dt>
              <dd className="font-medium text-admin-ink">Available on the profile page</dd>
            </div>
          </dl>
        </AdminPanel>

        <AdminPendingPanel
          title="User administration is not connected"
          summary="Inviting an account, changing a role, disabling a user and sending a password reset all require privileged auth operations that cannot run in a browser."
          needs={[
            'A server-only route holding the auth service key, so role changes and invitations never ship a secret to the client.',
            'An allowlist of invitable roles, so a manager cannot promote themselves to Super Admin.',
            'A password-reset trigger that sends the provider’s own email rather than a password set by an administrator.',
            'An audit entry per role change: who changed which account, and when.',
          ]}
          available={[
            'Sign-in, sign-out, sign-up and password reset already work against the configured provider.',
            'Administrator accounts are listed above from the same records the app authenticates against — no separate staff table.',
            'Default demo credentials are already excluded from production builds.',
          ]}
        />
      </div>
    </>
  );
}
