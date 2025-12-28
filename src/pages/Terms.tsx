import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const Terms = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="container mx-auto px-4 h-14 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-lg">Terms & Conditions</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Terms & Conditions</h1>
            <p className="text-muted-foreground">Last updated: December 2024</p>
          </div>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing and using Grumming ("the Platform"), you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you must not use our services.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">2. Description of Services</h2>
            <p className="text-muted-foreground leading-relaxed">
              Grumming provides an online platform that connects customers with salons, spas, and beauty service providers. We act as an intermediary to facilitate bookings and do not directly provide beauty services.
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Browse and discover salons and spas</li>
              <li>Book appointments online</li>
              <li>Make payments through secure channels</li>
              <li>Leave reviews and ratings</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">3. User Accounts</h2>
            <p className="text-muted-foreground leading-relaxed">
              To use certain features of the Platform, you must create an account. You are responsible for:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Providing accurate and complete information</li>
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized use</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">4. Bookings & Cancellations</h2>
            <p className="text-muted-foreground leading-relaxed">
              Bookings made through the Platform are subject to availability and confirmation by the service provider. Cancellation policies vary by salon and are displayed at the time of booking. Please review these policies carefully before confirming your appointment.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">5. Payments & Pricing</h2>
            <p className="text-muted-foreground leading-relaxed">
              All payments are processed securely through our payment partners. Prices displayed on the Platform include applicable taxes unless stated otherwise. We reserve the right to modify prices at any time without prior notice.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">6. Refund Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Refunds are subject to the individual salon's cancellation policy. In cases where a service was not provided as described, please contact our customer support for resolution.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">7. User Conduct</h2>
            <p className="text-muted-foreground leading-relaxed">
              Users agree not to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Use the Platform for any unlawful purpose</li>
              <li>Post false, misleading, or fraudulent content</li>
              <li>Harass, abuse, or harm other users or service providers</li>
              <li>Attempt to circumvent security measures</li>
              <li>Use automated systems to access the Platform</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">8. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              All content on the Platform, including logos, text, images, and software, is the property of Grumming or its licensors and is protected by intellectual property laws.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">9. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              Grumming is not liable for any direct, indirect, incidental, or consequential damages arising from the use of our Platform or services provided by third-party salons. We do not guarantee the quality of services provided by listed establishments.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">10. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify these Terms and Conditions at any time. Changes will be effective immediately upon posting. Your continued use of the Platform constitutes acceptance of the updated terms.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">11. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about these Terms and Conditions, please contact us at:
            </p>
            <p className="text-primary font-medium">support@grumming.com</p>
          </section>
        </motion.div>
      </main>
    </div>
  );
};

export default Terms;