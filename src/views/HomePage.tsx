import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, BarChart3, CheckCircle2, FileText, Landmark, ReceiptText, ShieldCheck, WalletCards } from 'lucide-react';

const accountingModules = [
  'Invoice lifecycle tracking with status, tax, shipping, and payment method visibility.',
  'Expense capture for vendor bills, operating costs, reimbursements, and recurring spend.',
  'Cash-flow snapshots that separate paid, pending, overdue, and wholesale receivables.',
  'Month-end reports designed for owners, accountants, and operations teams.',
];

const dashboardCards = [
  {
    title: 'Receivables Command Center',
    text: 'Monitor customer invoices, dealer balances, payment status, and aging buckets before they become collection issues.',
    icon: ReceiptText,
  },
  {
    title: 'Expense Control',
    text: 'Centralize supplier bills, card spend, reimbursements, and approvals so every dollar has a clean audit trail.',
    icon: WalletCards,
  },
  {
    title: 'Owner-Ready Reporting',
    text: 'Turn daily transactions into profit, tax, and cash-flow summaries that are easy to review at month end.',
    icon: BarChart3,
  },
];

const workflowSteps = [
  {
    label: 'Capture',
    description: 'Record sales, purchases, shipping charges, taxes, credits, and payments in one controlled workspace.',
  },
  {
    label: 'Reconcile',
    description: 'Match order activity against invoices, dealer terms, and payment status with fewer spreadsheet handoffs.',
  },
  {
    label: 'Report',
    description: 'Generate the balances and operating summaries Embani LLC needs for decisions, lenders, and tax prep.',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-[calc(100vh-140px)] flex flex-col bg-warm-white">
      <section className="relative overflow-hidden py-16 md:py-28 bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(217,154,61,0.18),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(31,95,74,0.14),transparent_30%)]" />
        <div className="relative max-w-[88rem] mx-auto px-4 sm:px-8 lg:px-6">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <span className="inline-flex items-center gap-2 px-5 py-2 bg-himalayan-lighter text-himalayan text-sm font-semibold tracking-wider uppercase rounded-full">
                <Landmark size={16} /> Built for Embani LLC
              </span>
              <h1 className="font-serif text-4xl md:text-6xl font-bold text-charcoal mt-6 mb-6 leading-tight">
                Accounting clarity for invoices, expenses, and cash flow.
              </h1>
              <div className="space-y-5 text-charcoal-light leading-relaxed text-base md:text-lg mb-8">
                <p>
                  Embani LLC Accounting System gives the finance team a practical command center for everyday bookkeeping: invoices, expenses, payments, tax amounts, and reconciled reporting.
                </p>
                <p>
                  The workspace is designed to keep operational sales data connected to accounting controls, reducing manual spreadsheets while preserving the audit trail owners and accountants need.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Link to="/admin/analytics" className="btn-hk-primary">
                  View Dashboards
                  <ArrowRight size={16} className="ml-2" />
                </Link>
                <Link to="/admin/orders" className="btn-hk-ghost">
                  Manage Invoices
                </Link>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {accountingModules.map((module) => (
                  <div key={module} className="p-4 bg-warm-white rounded-2xl text-sm text-charcoal-light border border-himalayan/10">
                    <CheckCircle2 size={16} className="text-himalayan mb-2.5" />
                    <p className="leading-relaxed">{module}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="rounded-[2rem] bg-charcoal p-6 md:p-8 text-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-5 mb-6">
                <div>
                  <p className="text-white/60 text-sm uppercase tracking-[0.2em]">Current Month</p>
                  <h2 className="font-serif text-3xl font-bold text-white">Finance Snapshot</h2>
                </div>
                <ShieldCheck className="text-himalayan" size={38} />
              </div>
              <div className="grid gap-4">
                {[
                  ['Open invoices', '$42,680'],
                  ['Recorded expenses', '$18,240'],
                  ['Projected cash balance', '$76,915'],
                  ['Tax liability estimate', '$4,830'],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between rounded-2xl bg-white/10 p-4">
                    <span className="text-white/70">{label}</span>
                    <strong className="text-xl text-white">{value}</strong>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-2xl bg-himalayan/20 p-5 text-white/85">
                <FileText className="mb-3 text-himalayan" />
                Close-ready ledgers help Embani LLC prepare cleaner monthly financial packets and fewer accountant follow-ups.
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="max-w-[88rem] mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-3 gap-6">
            {dashboardCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <motion.div key={card.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.08 }} className="relative overflow-hidden rounded-2xl bg-white p-7 shadow-md border border-gray-100">
                  <div className="w-11 h-11 rounded-xl bg-himalayan text-white flex items-center justify-center mb-5">
                    <Icon size={20} />
                  </div>
                  <h3 className="font-serif text-2xl font-bold mb-3 text-charcoal">{card.title}</h3>
                  <p className="text-charcoal-light leading-relaxed">{card.text}</p>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-14 grid md:grid-cols-3 gap-6">
            {workflowSteps.map((step, index) => (
              <div key={step.label} className="bg-charcoal rounded-2xl p-6 md:p-8 text-white">
                <p className="text-himalayan font-bold mb-3">0{index + 1}</p>
                <h3 className="font-serif text-2xl font-bold mb-3 text-white">{step.label}</h3>
                <p className="text-white/80 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
