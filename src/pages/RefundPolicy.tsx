import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Clock, Wallet, CreditCard, AlertCircle, 
  CheckCircle2, HelpCircle, ChevronDown, RefreshCw 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';

const RefundPolicy = () => {
  const navigate = useNavigate();

  const refundSteps = [
    {
      step: 1,
      title: 'Cancel Booking',
      description: 'Cancel your booking from the My Bookings page or contact the salon.',
      icon: AlertCircle,
      color: 'bg-amber-500',
    },
    {
      step: 2,
      title: 'Refund Initiated',
      description: 'Your refund request is submitted and queued for processing.',
      icon: RefreshCw,
      color: 'bg-blue-500',
    },
    {
      step: 3,
      title: 'Processing',
      description: 'Our team verifies and processes your refund (24-48 hours).',
      icon: Clock,
      color: 'bg-purple-500',
    },
    {
      step: 4,
      title: 'Refund Completed',
      description: 'Amount credited to your wallet or original payment method.',
      icon: CheckCircle2,
      color: 'bg-green-500',
    },
  ];

  const timelineData = [
    {
      method: 'Wallet Credit',
      timeline: 'Instant - 2 hours',
      description: 'Fastest option. Credited directly to your Grumming wallet.',
    },
    {
      method: 'UPI',
      timeline: '24-48 hours',
      description: 'Refunded to the UPI ID used for payment.',
    },
    {
      method: 'Debit/Credit Card',
      timeline: '5-7 business days',
      description: 'Depends on your bank\'s processing time.',
    },
    {
      method: 'Net Banking',
      timeline: '5-7 business days',
      description: 'Credited to the source bank account.',
    },
  ];

  const faqs = [
    {
      question: 'When am I eligible for a refund?',
      answer: 'You are eligible for a full refund if you cancel your booking at least 2 hours before the scheduled appointment time. Cancellations made less than 2 hours before the appointment may be subject to a cancellation fee of up to 20% of the service price.',
    },
    {
      question: 'Where will my refund be credited?',
      answer: 'By default, refunds are credited to your Grumming wallet for instant availability. You can also choose to have it refunded to your original payment method, which may take longer depending on your bank.',
    },
    {
      question: 'Why is my refund taking longer than expected?',
      answer: 'Refund timelines depend on your payment method and bank processing times. Wallet refunds are instant, while card/bank refunds may take 5-7 business days. If it\'s been longer, please contact our support team.',
    },
    {
      question: 'Can I get a refund for a completed booking?',
      answer: 'Refunds for completed bookings are handled on a case-by-case basis. If you\'re unsatisfied with the service, please contact our support team within 24 hours of your appointment with details of your concern.',
    },
    {
      question: 'What if my refund fails?',
      answer: 'If a refund fails, our system will automatically retry. You\'ll receive a notification if the retry fails, and our support team will reach out to resolve the issue manually. You can also contact us via WhatsApp for immediate assistance.',
    },
    {
      question: 'Are there any non-refundable charges?',
      answer: 'Platform convenience fees, if applicable, are non-refundable. Additionally, last-minute cancellations (less than 2 hours before appointment) may incur a cancellation fee.',
    },
    {
      question: 'How do I track my refund status?',
      answer: 'You can track your refund in real-time from the "Refunds" tab in My Bookings. You\'ll also receive email, push, and in-app notifications at every stage of the refund process.',
    },
    {
      question: 'Can I cancel and get a refund for a partially used voucher?',
      answer: 'Promotional vouchers and discounts applied to a booking are non-refundable. If you cancel a discounted booking, you\'ll receive a refund for the amount actually paid.',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="flex items-center gap-4 p-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Refund Policy</h1>
        </div>
      </header>

      <div className="container max-w-3xl mx-auto p-4 pb-24 space-y-8">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-6"
        >
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Hassle-Free Refunds</h2>
          <p className="text-muted-foreground">
            We believe in transparency. Here&apos;s everything you need to know about our refund process.
          </p>
        </motion.div>

        {/* Refund Process Steps */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="text-lg font-semibold mb-4">How Refunds Work</h3>
          <div className="relative">
            {/* Connection Line */}
            <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-border hidden sm:block" />
            
            <div className="space-y-4">
              {refundSteps.map((step, index) => (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + index * 0.1 }}
                >
                  <Card>
                    <CardContent className="p-4 flex items-start gap-4">
                      <div className={`w-12 h-12 ${step.color} rounded-full flex items-center justify-center flex-shrink-0`}>
                        <step.icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            Step {step.step}
                          </Badge>
                          <h4 className="font-semibold">{step.title}</h4>
                        </div>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Timeline by Payment Method */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="text-lg font-semibold mb-4">Refund Timelines</h3>
          <Card>
            <CardContent className="p-0 divide-y divide-border">
              {timelineData.map((item, index) => (
                <div key={item.method} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                      {item.method === 'Wallet Credit' ? (
                        <Wallet className="w-5 h-5 text-primary" />
                      ) : (
                        <CreditCard className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{item.method}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                  <Badge 
                    variant={item.method === 'Wallet Credit' ? 'default' : 'secondary'}
                    className="whitespace-nowrap"
                  >
                    {item.timeline}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.section>

        {/* Key Policies */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h3 className="text-lg font-semibold mb-4">Key Policies</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="border-green-500/20 bg-green-500/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <h4 className="font-semibold text-green-700 dark:text-green-400">Full Refund</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Cancel 2+ hours before appointment for a full refund with no questions asked.
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                  <h4 className="font-semibold text-amber-700 dark:text-amber-400">Late Cancellation</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Cancellations within 2 hours may incur up to 20% cancellation fee.
                </p>
              </CardContent>
            </Card>
          </div>
        </motion.section>

        {/* FAQs */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <HelpCircle className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Frequently Asked Questions</h3>
          </div>
          
          <Accordion type="single" collapsible className="space-y-2">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`faq-${index}`}
                className="border rounded-lg px-4 data-[state=open]:bg-muted/30"
              >
                <AccordionTrigger className="text-left text-sm font-medium hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground pb-4">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.section>

        {/* Contact Support */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-6 text-center">
              <h3 className="font-semibold mb-2">Still have questions?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Our support team is here to help you with any refund-related queries.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <a
                  href="mailto:support@grumming.com"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
                >
                  Email Support
                </a>
                <a
                  href={`https://wa.me/919229506624?text=${encodeURIComponent('Hi, I have a question about my refund.')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
                >
                  WhatsApp Support
                </a>
              </div>
            </CardContent>
          </Card>
        </motion.section>
      </div>
    </div>
  );
};

export default RefundPolicy;
