import { motion } from 'framer-motion';
import { 
  Store, 
  Users, 
  CreditCard, 
  TrendingUp, 
  CheckCircle,
  IndianRupee,
  Shield,
  Clock
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

        {/* Commission Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-6 md:p-8">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                {/* Left: Commission Details */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Badge className="bg-primary text-primary-foreground">
                      Transparent Pricing
                    </Badge>
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-foreground mb-3">
                    Simple 8% Platform Commission
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    We charge a flat 8% commission on every successfully completed booking. 
                    No hidden fees, no surprises. Customers pay the service price you set — 
                    commission is deducted only from your payout.
                  </p>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <span className="text-sm text-foreground">No registration or monthly fees</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <span className="text-sm text-foreground">Weekly automatic payouts to your bank</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <span className="text-sm text-foreground">Real-time earnings dashboard</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <span className="text-sm text-foreground">Works with online & cash payments</span>
                    </div>
                  </div>
                </div>

                {/* Right: Example Calculation */}
                <div className="bg-background rounded-xl p-6 border border-border shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <IndianRupee className="w-5 h-5 text-primary" />
                    <h4 className="font-semibold text-foreground">Example Calculation</h4>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-border">
                      <span className="text-muted-foreground">Service Price</span>
                      <span className="text-lg font-bold text-foreground">₹1,000</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-border">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Platform Fee</span>
                        <Badge variant="secondary" className="text-xs">8%</Badge>
                      </div>
                      <span className="text-lg font-medium text-red-500">-₹80</span>
                    </div>
                    <div className="flex justify-between items-center py-3 bg-green-500/10 rounded-lg px-3 -mx-3">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-green-600" />
                        <span className="font-medium text-foreground">You Receive</span>
                      </div>
                      <span className="text-xl font-bold text-green-600">₹920</span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>Payouts processed weekly to your bank account</span>
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
