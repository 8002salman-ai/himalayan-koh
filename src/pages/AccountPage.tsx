import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Camera, Loader2, Check, Shield, Bell, Package, Heart, MapPin } from 'lucide-react';
import { useAuthContext } from '../context/AuthContext';
import { supabase } from '../lib/supabase/client';

type TabType = 'profile' | 'security' | 'notifications' | 'addresses';

export default function AccountPage() {
  const { profile, updateProfile, user, loading: authLoading } = useAuthContext();
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    fullName: profile?.full_name || '',
    phone: profile?.phone || '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await updateProfile({
        full_name: formData.fullName,
        phone: formData.phone,
      });
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (updateError) throw updateError;

      setSuccess('Password updated successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'profile' as TabType, label: 'Profile', icon: User },
    { id: 'security' as TabType, label: 'Security', icon: Shield },
    { id: 'notifications' as TabType, label: 'Notifications', icon: Bell },
    { id: 'addresses' as TabType, label: 'Addresses', icon: MapPin },
  ];

  return (
    <div className="min-h-screen bg-warm-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-charcoal to-charcoal-light py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-serif text-3xl md:text-4xl font-bold text-white"
          >
            Account Settings
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-white/70 mt-2"
          >
            Manage your profile and preferences
          </motion.p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-12">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1"
          >
            {/* User Card */}
            <div className="bg-white rounded-2xl p-6 shadow-md mb-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-himalayan-lighter flex items-center justify-center">
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.full_name || 'User'}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <User size={28} className="text-himalayan" />
                    )}
                  </div>
                  <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-himalayan text-white rounded-full flex items-center justify-center hover:bg-himalayan-dark transition-colors">
                    <Camera size={14} />
                  </button>
                </div>
                <div>
                  <h3 className="font-semibold text-charcoal">
                    {profile?.full_name || 'User'}
                  </h3>
                  <p className="text-sm text-charcoal-light">{user?.email}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 bg-himalayan-lighter text-himalayan text-xs font-medium rounded-full capitalize">
                    {profile?.role || 'customer'}
                  </span>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="bg-white rounded-2xl p-3 shadow-md space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                    activeTab === tab.id
                      ? 'bg-himalayan text-white'
                      : 'text-charcoal hover:bg-gray-50'
                  }`}
                >
                  <tab.icon size={18} />
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* Quick Links */}
            <div className="mt-6 space-y-2">
              <Link
                to="/orders"
                className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl text-charcoal hover:bg-gray-50 transition-colors shadow-sm"
              >
                <Package size={18} />
                My Orders
              </Link>
              <Link
                to="/wishlist"
                className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl text-charcoal hover:bg-gray-50 transition-colors shadow-sm"
              >
                <Heart size={18} />
                Wishlist
              </Link>
            </div>
          </motion.div>

          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-3"
          >
            <div className="bg-white rounded-2xl shadow-md p-6 md:p-8">
              {/* Success/Error Messages */}
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-600 flex items-center gap-2"
                >
                  <Check size={18} />
                  {success}
                </motion.div>
              )}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600"
                >
                  {error}
                </motion.div>
              )}

              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div>
                  <h2 className="font-serif text-xl font-bold text-charcoal mb-6">
                    Profile Information
                  </h2>
                  <form onSubmit={handleProfileSubmit} className="space-y-5">
                    <div className="grid md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-medium text-charcoal mb-1.5">
                          Full Name
                        </label>
                        <div className="relative">
                          <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-charcoal focus:outline-none focus:ring-2 focus:ring-himalayan/30 focus:border-himalayan transition-all"
                            placeholder="John Doe"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-charcoal mb-1.5">
                          Email Address
                        </label>
                        <div className="relative">
                          <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="email"
                            value={user?.email || ''}
                            disabled
                            className="w-full pl-11 pr-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-charcoal-light cursor-not-allowed"
                          />
                        </div>
                        <p className="text-xs text-charcoal-light mt-1">
                          Email cannot be changed
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-charcoal mb-1.5">
                        Phone Number
                      </label>
                      <div className="relative">
                        <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-charcoal focus:outline-none focus:ring-2 focus:ring-himalayan/30 focus:border-himalayan transition-all"
                          placeholder="(123) 456-7890"
                        />
                      </div>
                    </div>

                    <div className="pt-4">
                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        type="submit"
                        disabled={saving || authLoading}
                        className="flex items-center justify-center gap-2 px-8 py-3 bg-himalayan hover:bg-himalayan-dark text-white font-semibold rounded-xl transition-colors disabled:opacity-70"
                      >
                        {saving && <Loader2 size={18} className="animate-spin" />}
                        Save Changes
                      </motion.button>
                    </div>
                  </form>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div>
                  <h2 className="font-serif text-xl font-bold text-charcoal mb-6">
                    Security Settings
                  </h2>
                  <form onSubmit={handlePasswordSubmit} className="space-y-5 max-w-md">
                    <div>
                      <label className="block text-sm font-medium text-charcoal mb-1.5">
                        New Password
                      </label>
                      <input
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-charcoal focus:outline-none focus:ring-2 focus:ring-himalayan/30 focus:border-himalayan transition-all"
                        placeholder="••••••••"
                        minLength={8}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-charcoal mb-1.5">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-charcoal focus:outline-none focus:ring-2 focus:ring-himalayan/30 focus:border-himalayan transition-all"
                        placeholder="••••••••"
                      />
                    </div>

                    <div className="pt-4">
                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        type="submit"
                        disabled={saving}
                        className="flex items-center justify-center gap-2 px-8 py-3 bg-himalayan hover:bg-himalayan-dark text-white font-semibold rounded-xl transition-colors disabled:opacity-70"
                      >
                        {saving && <Loader2 size={18} className="animate-spin" />}
                        Update Password
                      </motion.button>
                    </div>
                  </form>

                  <div className="mt-10 pt-10 border-t border-gray-200">
                    <h3 className="font-semibold text-charcoal mb-4">Danger Zone</h3>
                    <button className="px-6 py-3 border-2 border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-colors font-medium">
                      Delete Account
                    </button>
                    <p className="text-xs text-charcoal-light mt-2">
                      This action cannot be undone. All your data will be permanently deleted.
                    </p>
                  </div>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div>
                  <h2 className="font-serif text-xl font-bold text-charcoal mb-6">
                    Notification Preferences
                  </h2>
                  <div className="space-y-4">
                    {[
                      { label: 'Order Updates', desc: 'Get notified about your order status' },
                      { label: 'Promotions', desc: 'Receive special offers and discounts' },
                      { label: 'New Products', desc: 'Be the first to know about new arrivals' },
                      { label: 'Newsletter', desc: 'Weekly tips and livestock health insights' },
                    ].map((item, i) => (
                      <label
                        key={i}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors"
                      >
                        <div>
                          <p className="font-medium text-charcoal">{item.label}</p>
                          <p className="text-sm text-charcoal-light">{item.desc}</p>
                        </div>
                        <input
                          type="checkbox"
                          defaultChecked={i < 2}
                          className="w-5 h-5 rounded border-gray-300 text-himalayan focus:ring-himalayan"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Addresses Tab */}
              {activeTab === 'addresses' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-serif text-xl font-bold text-charcoal">
                      Saved Addresses
                    </h2>
                    <button className="px-4 py-2 bg-himalayan text-white rounded-lg text-sm font-semibold hover:bg-himalayan-dark transition-colors">
                      Add New Address
                    </button>
                  </div>
                  <div className="text-center py-12 text-charcoal-light">
                    <MapPin size={48} className="mx-auto mb-4 opacity-30" />
                    <p>No saved addresses yet</p>
                    <p className="text-sm mt-1">Add an address for faster checkout</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
