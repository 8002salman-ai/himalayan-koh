import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Package,
  FolderTree,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  ArrowUpRight,
  Loader2,
} from 'lucide-react';
import { adminApi } from '../../lib/supabase/api/admin';
import { isSupabaseConfigured } from '../../lib/supabase/client';

interface DashboardStats {
  totalProducts: number;
  activeProducts: number;
  lowStockCount: number;
  totalCategories: number;
  recentOrders: number;
  totalRevenue: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!isSupabaseConfigured()) {
        setStats({
          totalProducts: 6,
          activeProducts: 6,
          lowStockCount: 2,
          totalCategories: 4,
          recentOrders: 15,
          totalRevenue: 2450.50,
        });
        setLoading(false);
        return;
      }

      try {
        const data = await adminApi.getDashboardStats();
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      label: 'Total Products',
      value: stats?.totalProducts || 0,
      icon: Package,
      color: 'bg-blue-500',
      link: '/admin/products',
    },
    {
      label: 'Categories',
      value: stats?.totalCategories || 0,
      icon: FolderTree,
      color: 'bg-purple-500',
      link: '/admin/categories',
    },
    {
      label: 'Recent Orders',
      value: stats?.recentOrders || 0,
      icon: ShoppingCart,
      color: 'bg-green-500',
      link: '/admin/orders',
    },
    {
      label: 'Total Revenue',
      value: `$${(stats?.totalRevenue || 0).toLocaleString()}`,
      icon: DollarSign,
      color: 'bg-himalayan',
      link: '/admin/analytics',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-himalayan" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-charcoal">Dashboard</h1>
        <p className="text-charcoal-light">Welcome back! Here's what's happening.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Link
              to={stat.link}
              className="block bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 ${stat.color} rounded-xl flex items-center justify-center`}>
                  <stat.icon size={20} className="text-white" />
                </div>
                <ArrowUpRight size={18} className="text-gray-300" />
              </div>
              <p className="text-2xl font-bold text-charcoal">{stat.value}</p>
              <p className="text-sm text-charcoal-light">{stat.label}</p>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Alerts & Quick Actions */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Low Stock Alert */}
        {(stats?.lowStockCount || 0) > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-amber-50 border border-amber-200 rounded-2xl p-5"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} className="text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-amber-800">Low Stock Alert</h3>
                <p className="text-sm text-amber-700 mt-1">
                  {stats?.lowStockCount} products are running low on stock and need attention.
                </p>
                <Link
                  to="/admin/products?filter=low_stock"
                  className="inline-flex items-center gap-1 mt-3 text-sm font-semibold text-amber-800 hover:underline"
                >
                  View Products
                  <ArrowUpRight size={14} />
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl p-5 shadow-sm"
        >
          <h3 className="font-semibold text-charcoal mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/admin/products/new"
              className="flex items-center gap-3 p-3 bg-himalayan/5 rounded-xl hover:bg-himalayan/10 transition-colors"
            >
              <Package size={18} className="text-himalayan" />
              <span className="text-sm font-medium text-charcoal">Add Product</span>
            </Link>
            <Link
              to="/admin/categories/new"
              className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors"
            >
              <FolderTree size={18} className="text-purple-600" />
              <span className="text-sm font-medium text-charcoal">Add Category</span>
            </Link>
            <Link
              to="/admin/orders"
              className="flex items-center gap-3 p-3 bg-green-50 rounded-xl hover:bg-green-100 transition-colors"
            >
              <ShoppingCart size={18} className="text-green-600" />
              <span className="text-sm font-medium text-charcoal">View Orders</span>
            </Link>
            <Link
              to="/admin/analytics"
              className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
            >
              <TrendingUp size={18} className="text-blue-600" />
              <span className="text-sm font-medium text-charcoal">Analytics</span>
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Recent Activity Placeholder */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white rounded-2xl p-6 shadow-sm"
      >
        <h3 className="font-semibold text-charcoal mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {[
            { action: 'New order received', time: '2 minutes ago', icon: ShoppingCart, color: 'text-green-600 bg-green-50' },
            { action: 'Product inventory updated', time: '15 minutes ago', icon: Package, color: 'text-blue-600 bg-blue-50' },
            { action: 'New customer registered', time: '1 hour ago', icon: TrendingUp, color: 'text-purple-600 bg-purple-50' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color}`}>
                <item.icon size={18} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-charcoal">{item.action}</p>
                <p className="text-xs text-charcoal-light">{item.time}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
