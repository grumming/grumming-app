import { Wallet, Heart, Ticket, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const quickAccessItems = [
  { name: "Wallet", icon: Wallet, path: "/wallet", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  { name: "Favourites", icon: Heart, path: "/favorites", color: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
  { name: "Vouchers", icon: Ticket, path: "/my-vouchers", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  { name: "Bookings", icon: Calendar, path: "/my-bookings", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
];

const QuickAccessMenu = () => {
  const navigate = useNavigate();

  return (
    <section className="px-4 py-4">
      <div className="grid grid-cols-4 gap-3">
        {quickAccessItems.map((item, index) => (
          <motion.button
            key={item.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => navigate(item.path)}
            className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-md transition-all duration-200"
          >
            <div className={`p-2.5 rounded-full ${item.color}`}>
              <item.icon className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-foreground">
              {item.name}
            </span>
          </motion.button>
        ))}
      </div>
    </section>
  );
};

export default QuickAccessMenu;
