import { CheckCircle, Circle, Clock, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TicketStatusTrackerProps {
  status: string;
  createdAt: string;
  respondedAt: string | null;
  resolvedAt: string | null;
}

const steps = [
  { key: 'open', label: 'Submitted', icon: MessageSquare },
  { key: 'in_progress', label: 'In Progress', icon: Clock },
  { key: 'resolved', label: 'Resolved', icon: CheckCircle },
];

export const TicketStatusTracker = ({
  status,
  createdAt,
  respondedAt,
  resolvedAt,
}: TicketStatusTrackerProps) => {
  const getStepStatus = (stepKey: string) => {
    const statusOrder = ['open', 'in_progress', 'resolved', 'closed'];
    const currentIndex = statusOrder.indexOf(status);
    const stepIndex = statusOrder.indexOf(stepKey);

    if (stepIndex < currentIndex || status === 'closed') return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'upcoming';
  };

  const getTimestamp = (stepKey: string) => {
    if (stepKey === 'open') return createdAt;
    if (stepKey === 'in_progress') return respondedAt;
    if (stepKey === 'resolved') return resolvedAt;
    return null;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex items-center justify-between py-3 px-2">
      {steps.map((step, index) => {
        const stepStatus = getStepStatus(step.key);
        const timestamp = getTimestamp(step.key);
        const Icon = step.icon;

        return (
          <div key={step.key} className="flex flex-col items-center flex-1 relative">
            {/* Connector line */}
            {index > 0 && (
              <div
                className={cn(
                  'absolute top-4 right-1/2 w-full h-0.5 -z-10',
                  stepStatus === 'upcoming' ? 'bg-muted' : 'bg-primary'
                )}
              />
            )}

            {/* Icon */}
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
                stepStatus === 'completed' && 'bg-primary text-primary-foreground',
                stepStatus === 'current' && 'bg-primary/20 text-primary border-2 border-primary',
                stepStatus === 'upcoming' && 'bg-muted text-muted-foreground'
              )}
            >
              {stepStatus === 'completed' ? (
                <CheckCircle className="w-4 h-4" />
              ) : stepStatus === 'current' ? (
                <Icon className="w-4 h-4" />
              ) : (
                <Circle className="w-4 h-4" />
              )}
            </div>

            {/* Label */}
            <span
              className={cn(
                'text-xs mt-1.5 text-center',
                stepStatus === 'upcoming' ? 'text-muted-foreground' : 'text-foreground font-medium'
              )}
            >
              {step.label}
            </span>

            {/* Timestamp */}
            {timestamp && stepStatus !== 'upcoming' && (
              <span className="text-[10px] text-muted-foreground mt-0.5">
                {formatDate(timestamp)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};
