import { Check, Clock, Package, Truck } from 'lucide-react';
import { getOrderProgressIndex, ORDER_PROGRESS_STEPS } from '@/lib/orders/status';

const stepIcons = [Clock, Package, Truck, Check];

interface OrderProgressStepsProps {
  status: string;
  paymentStatus: string;
  compact?: boolean;
}

export default function OrderProgressSteps({ status, paymentStatus, compact = false }: OrderProgressStepsProps) {
  const activeStep = getOrderProgressIndex(status, paymentStatus);
  const cancelled = status === 'cancelled' || status === 'refunded';

  if (cancelled) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        This order was cancelled and will not ship.
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 ${compact ? 'text-xs' : 'text-sm'}`}>
      {ORDER_PROGRESS_STEPS.map((step, index) => {
        const Icon = stepIcons[index];
        const active = index <= activeStep;

        return (
          <div
            key={step.key}
            className={`rounded-xl px-3 py-3 border ${
              active
                ? 'border-himalayan bg-himalayan/10 text-himalayan'
                : 'border-gray-100 text-charcoal-light'
            }`}
          >
            <div className="flex items-center gap-2">
              <Icon size={compact ? 14 : 16} />
              <span className="font-medium">{step.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
