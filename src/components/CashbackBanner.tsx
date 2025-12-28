import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Percent } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CashbackBanner = () => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="mx-4 mt-4"
    >
      <button
        onClick={() => navigate('/wallet')}
        className="w-full relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 p-[2px] group"
      >
        <div className="relative rounded-[14px] bg-gradient-to-r from-amber-500/90 via-orange-500/90 to-rose-500/90 px-5 py-4">
          {/* Animated background sparkles */}
          <div className="absolute inset-0 overflow-hidden rounded-[14px]">
            <div className="absolute -top-4 -left-4 w-24 h-24 bg-white/20 rounded-full blur-2xl animate-pulse" />
            <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-yellow-300/20 rounded-full blur-2xl animate-pulse delay-300" />
          </div>
          
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Icon container */}
              <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                <div className="relative">
                  <Percent className="w-7 h-7 text-white" />
                  <Sparkles className="w-4 h-4 text-yellow-200 absolute -top-1 -right-1" />
                </div>
              </div>
              
              {/* Text content */}
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-white">5%</span>
                  <span className="text-lg font-semibold text-white/90">Cashback</span>
                </div>
                <p className="text-sm text-white/80 mt-0.5">
                  On every booking! Credits added instantly
                </p>
              </div>
            </div>
            
            {/* Arrow */}
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors shrink-0">
              <ArrowRight className="w-5 h-5 text-white group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
          
          {/* Bottom tag */}
          <div className="mt-3 flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-white/20 text-xs font-medium text-white">
              💰 Earn & Save
            </span>
            <span className="text-xs text-white/70">
              Use credits on your next visit
            </span>
          </div>
        </div>
      </button>
    </motion.div>
  );
};

export default CashbackBanner;
