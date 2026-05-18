import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, DollarSign, Loader2, Package, ShoppingCart, TrendingUp, Users } from 'lucide-react';
import { adminApi, AdminDashboardAnalytics } from '../../lib/supabase/api/admin';
import { isSupabaseConfigured } from '../../lib/supabase/client';

export default function AdminAnalytics() {
  const [analytics, setAnalytics] = useState<AdminDashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setAnalytics(null);
      setLoading(false);
      return;
    }

    try {
      const data = await adminApi.getDashboardAnalytics();
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 size={32} className="animate-spin text-himalayan" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-20 text-charcoal-light">
        <BarChart3 size={48} className="mx-auto mb-4 text-gray-200" />
        <p>Connect Supabase to view store analytics.</p>
      </div>
    );
  }

  const maxRevenue = Math.max(...analytics.revenueSeries.map((d) => d.revenue), 1);
  const totalRevenue = analytics.revenueSeries.reduce((sum, d) => sum + d.revenue, 0);
  const totalOrders = analytics.revenueSeries.reduce((sum, d) => sum + d.orders, 0);
  const maxProductRevenue = Math.max(...analytics.topProducts.map((p) => p.revenue), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">Analytics</h1>
        <p className="text-charcoal-light">Revenue, orders, and product performance</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Revenue (7d)', value: `$${totalRevenue.toFixed(2)}`, icon: DollarSign, color: 'bg-green-50 text-green-600' },
          { label: 'Orders (7d)', value: String(totalOrders), icon: ShoppingCart, color: 'bg-blue-50 text-blue-600' },
          { label: 'Customers', value: String(analytics.totalCustomers), icon: Users, color: 'bg-purple-50 text-purple-600' },
          { label: 'New Customers', value: String(analytics.newCustomers), icon: TrendingUp, color: 'bg-amber-50 text-amber-600' },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-2xl shadow-sm p-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${card.color}`}>
              <card.icon size={20} />
            </div>
            <p className="text-2xl font-bold text-charcoal">{card.value}</p>
            <p className="text-sm text-charcoal-light mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="font-semibold text-charcoal mb-4">Revenue (7 days)</h2>
          <div className="flex items-end gap-2 h-40">
            {analytics.revenueSeries.map((day) => (
              <div key={day.label} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <div
                  className="w-full bg-himalayan rounded-t-lg"
                  style={{ height: `${Math.max(8, (day.revenue / maxRevenue) * 100)}%` }}
                  title={`$${day.revenue.toFixed(2)} · ${day.orders} orders`}
                />
                <span className="text-[10px] text-charcoal-light">{day.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="font-semibold text-charcoal mb-4">Order Status</h2>
          <div className="space-y-3">
            {Object.entries(analytics.orderStatusCounts).map(([status, count]) => (
              <div key={status}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-charcoal capitalize">{status}</span>
                  <span className="font-semibold text-charcoal">{count}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-himalayan rounded-full"
                    style={{ width: `${totalOrders ? Math.min(100, (count / totalOrders) * 100) : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="font-semibold text-charcoal mb-4">Top Products by Revenue</h2>
        {analytics.topProducts.length === 0 ? (
          <p className="text-sm text-charcoal-light">No sales data yet.</p>
        ) : (
          <div className="space-y-4">
            {analytics.topProducts.map((product) => (
              <div key={product.productName}>
                <div className="flex justify-between gap-4 text-sm mb-1">
                  <span className="font-medium text-charcoal truncate">{product.productName}</span>
                  <span className="text-charcoal-light">${product.revenue.toFixed(2)} · {product.quantity} sold</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${Math.max(5, (product.revenue / maxProductRevenue) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {analytics.inventoryAlerts.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-charcoal flex items-center gap-2">
              <Package size={18} className="text-amber-600" />
              Low Stock Alerts
            </h2>
            <Link to="/admin/products?status=low_stock" className="text-sm font-semibold text-himalayan hover:underline">
              Manage inventory
            </Link>
          </div>
          <ul className="space-y-2">
            {analytics.inventoryAlerts.map((alert) => (
              <li key={alert.productId} className="flex items-center justify-between p-3 bg-amber-50 rounded-xl text-sm">
                <span className="font-medium text-charcoal">{alert.productName}</span>
                <span className="text-amber-700">{alert.quantity} / threshold {alert.threshold}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
