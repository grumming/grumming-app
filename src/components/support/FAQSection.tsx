import { HelpCircle, Search } from 'lucide-react';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqData = [
  {
    category: 'Booking',
    questions: [
      {
        q: 'How do I book an appointment?',
        a: 'Browse salons on the home page, select your preferred salon and service, choose a date and time, then confirm your booking. You can pay online or at the salon.',
      },
      {
        q: 'Can I reschedule my booking?',
        a: 'Yes, you can reschedule upcoming bookings from the "My Bookings" section. A small rescheduling fee (10% of service price) may apply.',
      },
      {
        q: 'How do I cancel a booking?',
        a: 'Go to "My Bookings", find your appointment, and click "Cancel". Cancellation charges (20% of service price) apply to prevent no-shows.',
      },
      {
        q: 'What is the completion PIN?',
        a: 'The 4-digit PIN is shown on your booking confirmation. Share it with the salon staff after your service is complete to mark your appointment as done.',
      },
    ],
  },
  {
    category: 'Payments & Refunds',
    questions: [
      {
        q: 'What payment methods are accepted?',
        a: 'We accept UPI, credit/debit cards, and wallet balance. You can also choose to pay at the salon.',
      },
      {
        q: 'How do refunds work?',
        a: 'If you paid online and cancel, the refund (minus cancellation fee) is credited to your wallet within 24-48 hours. Wallet payments are refunded instantly.',
      },
      {
        q: 'How do I add money to my wallet?',
        a: 'Go to "Wallet" in your profile, click "Add Money", enter the amount, and complete the payment using UPI or card.',
      },
      {
        q: 'What is cashback?',
        a: 'You earn 5% cashback on every completed booking, credited to your wallet automatically.',
      },
    ],
  },
  {
    category: 'Account',
    questions: [
      {
        q: 'How do I update my profile?',
        a: 'Go to Profile > Edit Profile to update your name, email, or profile photo.',
      },
      {
        q: 'How do I change my phone number?',
        a: 'For security, phone number changes require verification. Please contact support to update your registered phone number.',
      },
      {
        q: 'How does the referral program work?',
        a: 'Share your unique referral code with friends. When they complete their first booking, you both earn ₹100 in your wallets!',
      },
    ],
  },
  {
    category: 'For Salon Owners',
    questions: [
      {
        q: 'How do I register my salon?',
        a: 'Click "Register Your Salon" on the home page, fill in your salon details, add services, and submit for approval. We review within 24-48 hours.',
      },
      {
        q: 'When do I receive payouts?',
        a: 'Payouts are processed weekly for all completed bookings. You can track your earnings in the Salon Dashboard.',
      },
      {
        q: 'Are there any fees to join?',
        a: 'There are no registration or monthly fees to list your salon on Grumming. Start receiving bookings right away!',
      },
    ],
  },
];

export const FAQSection = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFAQs = faqData.map(category => ({
    ...category,
    questions: category.questions.filter(
      q =>
        q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.a.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(category => category.questions.length > 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Frequently Asked Questions</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search FAQs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {filteredFAQs.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <p>No matching questions found.</p>
            <p className="text-sm mt-1">Try a different search or submit a ticket.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredFAQs.map((category) => (
              <div key={category.category}>
                <h3 className="text-sm font-semibold text-primary mb-2">
                  {category.category}
                </h3>
                <Accordion type="single" collapsible className="w-full">
                  {category.questions.map((item, idx) => (
                    <AccordionItem key={idx} value={`${category.category}-${idx}`}>
                      <AccordionTrigger className="text-left text-sm">
                        {item.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground">
                        {item.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
