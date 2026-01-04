import { motion } from 'framer-motion';
import { 
  Store, 
  Users, 
  CreditCard, 
  TrendingUp, 
  CheckCircle
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const HowItWorksSection = () => {
  const forProviders = [
    {
      icon: Store,
      title: 'Register Your Salon',
      description: 'Create your salon profile in minutes with photos, services, and pricing.',
    },
    {
      icon: Users,
      title: 'Get Discovered',
      description: 'Reach thousands of customers looking for quality grooming services.',
    },
    {
      icon: CreditCard,
      title: 'Accept Bookings',
      description: 'Receive online and cash payments with real-time notifications.',
    },
    {
      icon: TrendingUp,
      title: 'Grow Your Business',
      description: 'Track earnings, manage bookings, and build your reputation.',
    },
  ];

  return (
    <section className="py-12 px-4 bg-muted/30">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <Badge variant="secondary" className="mb-4">
            For Salon Partners
          </Badge>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            How It Works
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Join Grumming and grow your salon business with our trusted platform
          </p>
        </motion.div>

        {/* Steps */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {forProviders.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full bg-background/50 border-border/50 hover:border-primary/30 transition-colors">
                <CardContent className="pt-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <step.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2 text-sm md:text-base">
                    {step.title}
                  </h3>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Partner Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-6 md:p-8">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Badge className="bg-primary text-primary-foreground">
                    Partner Benefits
                  </Badge>
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-foreground mb-3">
                  Why Join Grumming?
                </h3>
                <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                  Grow your salon business with our trusted platform. 
                  No hidden fees, no surprises — just more customers and seamless bookings.
                </p>
                
                <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex flex-col items-center gap-2 p-4 bg-background rounded-lg border border-border">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <span className="text-sm font-medium text-foreground">No Registration Fees</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 p-4 bg-background rounded-lg border border-border">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <span className="text-sm font-medium text-foreground">Weekly Payouts</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 p-4 bg-background rounded-lg border border-border">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <span className="text-sm font-medium text-foreground">Earnings Dashboard</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 p-4 bg-background rounded-lg border border-border">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <span className="text-sm font-medium text-foreground">Online & Cash Payments</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
