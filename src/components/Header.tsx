import { motion } from "framer-motion";
import UserMenu from "@/components/UserMenu";
import NotificationCenter from "@/components/NotificationCenter";

const Header = () => {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 glass"
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo/Brand */}
        <div className="text-lg font-semibold text-foreground font-display">
          Salon Booking
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2">
          <NotificationCenter />
          <UserMenu />
        </div>
      </div>
    </motion.header>
  );
};

export default Header;
