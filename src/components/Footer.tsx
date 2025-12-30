import { Link } from 'react-router-dom';
import { Heart, Mail, Phone, MapPin } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-muted/30 border-t border-border pb-20 sm:pb-0">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          {/* Brand */}
          <div className="space-y-3 max-w-xs">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">G</span>
              </div>
              <span className="font-bold text-lg text-foreground">Grumming</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Book salon and spa appointments instantly. Discover top-rated beauty services near you.
            </p>
          </div>

          {/* Legal & Contact Combined */}
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-12">
            {/* Legal Links */}
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              <Link to="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Terms
              </Link>
              <Link to="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Privacy
              </Link>
              <Link to="/privacy-security" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Security
              </Link>
            </div>

            {/* Contact */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              <a href="mailto:support@grumming.com" className="flex items-center gap-1.5 hover:text-primary transition-colors">
                <Mail className="w-4 h-4 text-primary" />
                support@grumming.com
              </a>
              <a href="tel:+911234567890" className="flex items-center gap-1.5 hover:text-primary transition-colors">
                <Phone className="w-4 h-4 text-primary" />
                +91 12345 67890
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-6 pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            © {currentYear} Grumming. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            Made with <Heart className="w-4 h-4 text-red-500 fill-red-500" /> in India
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
