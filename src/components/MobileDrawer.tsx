import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, Home, Search, Calendar, Heart, Wallet, Gift, Settings, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

const navItems = [
  { title: 'Home', url: '/', icon: Home },
  { title: 'Search Salons', url: '/search', icon: Search },
  { title: 'My Bookings', url: '/my-bookings', icon: Calendar },
  { title: 'Favorites', url: '/favorites', icon: Heart },
  { title: 'Wallet', url: '/wallet', icon: Wallet },
  { title: 'Referrals', url: '/referrals', icon: Gift },
  { title: 'Settings', url: '/settings', icon: Settings },
];

const MobileDrawer = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="w-5 h-5" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72 p-0">
        <SheetHeader className="p-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="text-primary-foreground font-display font-bold text-sm">G</span>
            </div>
            <span className="font-display font-bold text-lg">Grumming</span>
          </SheetTitle>
        </SheetHeader>
        
        <nav className="flex flex-col p-4 gap-1">
          {navItems.map((item) => (
            <Link
              key={item.url}
              to={item.url}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                isActive(item.url)
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.title}</span>
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
};

export default MobileDrawer;
