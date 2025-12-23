import { motion } from "framer-motion";
import { Bell, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

const Header = () => {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 glass"
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <span className="text-primary-foreground font-display font-bold text-lg">G</span>
          </div>
          <span className="font-display font-bold text-xl text-foreground">
            Glamour
          </span>
        </div>
        
        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          <a href="#" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
            Services
          </a>
          <a href="#" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
            Salons
          </a>
          <a href="#" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
            Offers
          </a>
          <a href="#" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
            About
          </a>
        </nav>
        
        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />
          </Button>
          <Button variant="default" className="hidden sm:flex">
            Sign In
          </Button>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </motion.header>
  );
};

export default Header;
