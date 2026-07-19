import { useState } from 'react';
import { CheckCircle, Loader2, Send } from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';

export default function DealerSupport() {
  const { user, profile } = useAuthContext();
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile?.full_name || 'Wholesale',
          email: user?.email || '',
          subject: 'dealer',
          message,
        }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setError(data.error || 'Failed to send message. Please try again.');
        return;
      }
      setSubmitted(true);
      setMessage('');
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">Support</h1>
        <p className="text-charcoal-light">Questions about orders, pricing, or your account? Send us a message.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        {submitted ? (
          <div className="text-center py-8">
            <CheckCircle size={48} className="text-green-500 mx-auto mb-3" />
            <h2 className="font-semibold text-charcoal text-lg mb-1">Message Sent</h2>
            <p className="text-charcoal-light text-sm">Our team will get back to you shortly.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">Message</label>
              <textarea
                required
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="How can we help with your wholesale account?"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-charcoal focus:outline-none focus:ring-2 focus:ring-himalayan/30 focus:border-himalayan transition-all resize-none"
              />
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-himalayan hover:bg-himalayan-dark disabled:opacity-70 text-white font-semibold rounded-xl transition-colors"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {submitting ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
