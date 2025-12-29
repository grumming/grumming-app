import { Check, CheckCheck } from 'lucide-react';
import { format } from 'date-fns';

interface ReadReceiptProps {
  senderType: 'user' | 'salon';
  readAt?: string | null;
  createdAt: string;
}

const ReadReceipt = ({ senderType, readAt, createdAt }: ReadReceiptProps) => {
  // Only show read receipts for user messages
  if (senderType !== 'user') return null;

  return (
    <div className="flex items-center gap-1 mt-0.5">
      {readAt ? (
        <>
          <CheckCheck className="h-3.5 w-3.5 text-primary" />
          <span className="text-[10px] text-primary-foreground/60">
            Seen {format(new Date(readAt), 'h:mm a')}
          </span>
        </>
      ) : (
        <>
          <Check className="h-3.5 w-3.5 text-primary-foreground/50" />
          <span className="text-[10px] text-primary-foreground/50">
            Sent
          </span>
        </>
      )}
    </div>
  );
};

export default ReadReceipt;
