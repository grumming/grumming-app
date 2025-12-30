import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, XCircle, Store, ArrowRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSalonOwner } from '@/hooks/useSalonOwner';
import { useAuth } from '@/hooks/useAuth';

interface OwnedSalon {
  id: string;
  name: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string | null;
}

const SalonApprovalBanner = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isSalonOwner, ownedSalons, isLoading } = useSalonOwner();

  if (!user || isLoading || !isSalonOwner || ownedSalons.length === 0) {
    return null;
  }

  const pendingSalons = ownedSalons.filter(s => s.status === 'pending');
  const approvedSalons = ownedSalons.filter(s => s.status === 'approved');
  const rejectedSalons = ownedSalons.filter(s => s.status === 'rejected');

  // Don't show if no salons in any status
  if (pendingSalons.length === 0 && approvedSalons.length === 0 && rejectedSalons.length === 0) {
    return null;
  }

  const handleReapply = (salonId: string) => {
    navigate(`/salon-registration?edit=${salonId}`);
  };

  return (
    <div className="px-4 py-3 space-y-3">
      {/* Rejected salons with re-apply option */}
      {rejectedSalons.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center flex-shrink-0">
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-red-900 dark:text-red-100 text-sm">
                Registration Not Approved
              </h3>
              <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
                {rejectedSalons.map(s => s.name).join(', ')} was not approved.
              </p>
              {rejectedSalons[0].rejection_reason && (
                <div className="mt-2 p-2 bg-red-100/50 dark:bg-red-900/30 rounded-md">
                  <p className="text-xs text-red-800 dark:text-red-200">
                    <span className="font-medium">Reason:</span> {rejectedSalons[0].rejection_reason}
                  </p>
                </div>
              )}
              <Button 
                size="sm" 
                variant="outline"
                className="mt-3 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50"
                onClick={() => handleReapply(rejectedSalons[0].id)}
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Re-apply
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Pending salons */}
      {pendingSalons.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-amber-900 dark:text-amber-100 text-sm">
                Salon Pending Approval
              </h3>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                {pendingSalons.map(s => s.name).join(', ')} is under review. We'll notify you once approved.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Approved salons */}
      {approvedSalons.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Link
            to="/salon-dashboard"
            className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-emerald-900 dark:text-emerald-100 text-sm">
                {approvedSalons.length === 1 ? approvedSalons[0].name : `${approvedSalons.length} Salons`} Active
              </h3>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                Manage bookings, services & reviews
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </Link>
        </motion.div>
      )}
    </div>
  );
};

export default SalonApprovalBanner;
