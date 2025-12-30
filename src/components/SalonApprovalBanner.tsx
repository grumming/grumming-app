import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, Store, ArrowRight } from 'lucide-react';
import { useSalonOwner } from '@/hooks/useSalonOwner';
import { useAuth } from '@/hooks/useAuth';

const SalonApprovalBanner = () => {
  const { user } = useAuth();
  const { isSalonOwner, ownedSalons, isLoading } = useSalonOwner();

  if (!user || isLoading || !isSalonOwner || ownedSalons.length === 0) {
    return null;
  }

  const pendingSalons = ownedSalons.filter(s => !s.is_active);
  const approvedSalons = ownedSalons.filter(s => s.is_active);

  // Don't show if no pending salons
  if (pendingSalons.length === 0 && approvedSalons.length === 0) {
    return null;
  }

  return (
    <div className="px-4 py-3">
      {pendingSalons.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-3"
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
