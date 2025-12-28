import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  CheckCircle, Calendar, Clock, MapPin, 
  CalendarPlus, ArrowLeft, Home, Share2, Gift, Tag, Wallet, Ticket 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format, parse } from 'date-fns';

const BookingConfirmation = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [bookingDetails, setBookingDetails] = useState({
    salonName: '',
    serviceName: '',
    servicePrice: 0,
    bookingDate: '',
    bookingTime: '',
    discount: 0,
    promoCode: '',
    promoDiscount: 0,
    rewardDiscount: 0,
    walletDiscount: 0,
    paymentMethod: '',
    walletPaid: 0,
    voucherCode: '',
    voucherDiscount: 0,
  });

  useEffect(() => {
    const salonName = searchParams.get('salon') || '';
    const serviceName = searchParams.get('service') || '';
    const servicePrice = parseInt(searchParams.get('price') || '0', 10);
    const bookingDate = searchParams.get('date') || '';
    const bookingTime = searchParams.get('time') || '';
    const discount = parseInt(searchParams.get('discount') || '0', 10);
    const promoCode = searchParams.get('promoCode') || '';
    const promoDiscount = parseInt(searchParams.get('promoDiscount') || '0', 10);
    const rewardDiscount = parseInt(searchParams.get('rewardDiscount') || '0', 10);
    const walletDiscount = parseInt(searchParams.get('walletDiscount') || '0', 10);
    const paymentMethod = searchParams.get('paymentMethod') || 'online';
    const walletPaid = parseInt(searchParams.get('walletPaid') || '0', 10);
    const voucherCode = searchParams.get('voucherCode') || '';
    const voucherDiscount = parseInt(searchParams.get('voucherDiscount') || '0', 10);

    setBookingDetails({
      salonName,
      serviceName,
      servicePrice,
      bookingDate,
      bookingTime,
      discount,
      promoCode,
      promoDiscount,
      rewardDiscount,
      walletDiscount,
      paymentMethod,
      walletPaid,
      voucherCode,
      voucherDiscount,
    });
  }, [searchParams]);

  const { salonName, serviceName, servicePrice, bookingDate, bookingTime, discount, promoCode, promoDiscount, rewardDiscount, walletDiscount, paymentMethod, walletPaid, voucherCode, voucherDiscount } = bookingDetails;
  const originalPrice = servicePrice + discount;

  // Determine payment status text
  const getPaymentStatusText = () => {
    if (paymentMethod === 'split') {
      return `₹${walletPaid} paid via wallet`;
    }
    if (paymentMethod === 'salon') {
      return 'Pay at Salon';
    }
    return 'Paid Online';
  };

  // Parse date for display
  const displayDate = bookingDate 
    ? format(new Date(bookingDate), 'EEEE, MMMM dd, yyyy')
    : '';

  // Generate calendar URLs
  const generateCalendarEvent = () => {
    if (!bookingDate || !bookingTime) return null;

    // Parse time (e.g., "10:00 AM" to Date)
    const dateStr = bookingDate;
    const timeMatch = bookingTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
    
    if (!timeMatch) return null;

    let hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const isPM = timeMatch[3].toUpperCase() === 'PM';

    if (isPM && hours !== 12) hours += 12;
    if (!isPM && hours === 12) hours = 0;

    const startDate = new Date(`${dateStr}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour duration

    return {
      title: `${serviceName} at ${salonName}`,
      start: startDate,
      end: endDate,
      description: `Your appointment for ${serviceName} (₹${servicePrice})`,
      location: salonName,
    };
  };

  const formatDateForGoogle = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };

  const formatDateForICS = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };

  const addToGoogleCalendar = () => {
    const event = generateCalendarEvent();
    if (!event) return;

    const url = new URL('https://calendar.google.com/calendar/render');
    url.searchParams.set('action', 'TEMPLATE');
    url.searchParams.set('text', event.title);
    url.searchParams.set('dates', `${formatDateForGoogle(event.start)}/${formatDateForGoogle(event.end)}`);
    url.searchParams.set('details', event.description);
    url.searchParams.set('location', event.location);

    window.open(url.toString(), '_blank');
  };

  const addToAppleCalendar = () => {
    const event = generateCalendarEvent();
    if (!event) return;

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Grumming//Booking//EN
BEGIN:VEVENT
UID:${Date.now()}@grumming.app
DTSTAMP:${formatDateForICS(new Date())}
DTSTART:${formatDateForICS(event.start)}
DTEND:${formatDateForICS(event.end)}
SUMMARY:${event.title}
DESCRIPTION:${event.description}
LOCATION:${event.location}
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'appointment.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const addToOutlook = () => {
    const event = generateCalendarEvent();
    if (!event) return;

    const url = new URL('https://outlook.live.com/calendar/0/deeplink/compose');
    url.searchParams.set('subject', event.title);
    url.searchParams.set('startdt', event.start.toISOString());
    url.searchParams.set('enddt', event.end.toISOString());
    url.searchParams.set('body', event.description);
    url.searchParams.set('location', event.location);

    window.open(url.toString(), '_blank');
  };

  const shareBooking = async () => {
    const shareData = {
      title: 'My Appointment',
      text: `I have an appointment for ${serviceName} at ${salonName} on ${displayDate} at ${bookingTime}`,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.text);
      }
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex flex-col">
      {/* Header */}
      <header className="p-4 flex items-center justify-between">
        <button 
          onClick={() => navigate('/')} 
          className="p-2 rounded-full hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-foreground" />
        </button>
        <Button variant="ghost" size="icon" onClick={shareBooking}>
          <Share2 className="w-5 h-5" />
        </Button>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-12">
        {/* Success Animation */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ 
            type: "spring",
            stiffness: 260,
            damping: 20,
            delay: 0.1 
          }}
          className="mb-8"
        >
          <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
            >
              <CheckCircle className="w-14 h-14 text-green-600" />
            </motion.div>
          </div>
        </motion.div>

        {/* Confirmation Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center mb-8"
        >
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">
            Booking Confirmed!
          </h1>
          <p className="text-muted-foreground">
            Your appointment has been successfully scheduled
          </p>
        </motion.div>

        {/* Booking Details Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="w-full max-w-md"
        >
          <Card className="shadow-elegant">
            <CardContent className="p-6 space-y-4">
              {/* Salon Name */}
              <div className="text-center pb-4 border-b">
                <h2 className="font-display text-xl font-bold text-foreground">
                  {salonName}
                </h2>
              </div>

              {/* Service */}
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Service</p>
                <p className="font-medium">{serviceName}</p>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">Date</span>
                  </div>
                  <p className="font-medium text-sm">{displayDate}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">Time</span>
                  </div>
                  <p className="font-medium">{bookingTime}</p>
                </div>
              </div>

              {/* Discount Savings Breakdown */}
              {discount > 0 && (
                <div className="space-y-2">
                  {/* Promo Code Discount */}
                  {promoCode && promoDiscount > 0 && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2">
                        <Tag className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <div>
                          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                            Promo Code Applied
                          </span>
                          <p className="text-xs text-blue-600 dark:text-blue-400 font-mono">{promoCode}</p>
                        </div>
                      </div>
                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                        -₹{promoDiscount}
                      </span>
                    </div>
                  )}

                  {/* Voucher Discount */}
                  {voucherCode && voucherDiscount > 0 && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                      <div className="flex items-center gap-2">
                        <Ticket className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        <div>
                          <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                            Voucher Applied
                          </span>
                          <p className="text-xs text-purple-600 dark:text-purple-400 font-mono">{voucherCode}</p>
                        </div>
                      </div>
                      <span className="font-semibold text-purple-600 dark:text-purple-400">
                        -₹{voucherDiscount}
                      </span>
                    </div>
                  )}

                  {/* Referral Reward Discount */}
                  {rewardDiscount > 0 && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2">
                        <Gift className="w-5 h-5 text-green-600 dark:text-green-400" />
                        <span className="text-sm font-medium text-green-700 dark:text-green-300">
                          Referral Reward Applied
                        </span>
                      </div>
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        -₹{rewardDiscount}
                      </span>
                    </div>
                  )}

                  {/* Wallet Credits Discount */}
                  {walletDiscount > 0 && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                      <div className="flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                          Wallet Credits Used
                        </span>
                      </div>
                      <span className="font-semibold text-amber-600 dark:text-amber-400">
                        -₹{walletDiscount}
                      </span>
                    </div>
                  )}

                  {/* Split Payment - Wallet Portion */}
                  {paymentMethod === 'split' && walletPaid > 0 && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                      <div className="flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                          Paid from Wallet
                        </span>
                      </div>
                      <span className="font-semibold text-purple-600 dark:text-purple-400">
                        ₹{walletPaid}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Price */}
              <div className="pt-4 border-t space-y-2">
                {discount > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="text-muted-foreground line-through">₹{originalPrice}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">
                    {paymentMethod === 'salon' ? 'To Pay at Salon' : paymentMethod === 'split' ? 'Remaining to Pay' : 'Total Paid'}
                  </span>
                  <span className="text-xl font-bold text-primary">₹{servicePrice}</span>
                </div>
                {discount > 0 && (
                  <p className="text-xs text-center text-green-600 dark:text-green-400 font-medium">
                    🎉 You saved ₹{discount} on this booking!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="w-full max-w-md mt-6 space-y-3"
        >
          {/* Add to Calendar Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="w-full h-12 gap-2" variant="default">
                <CalendarPlus className="w-5 h-5" />
                Add to Calendar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="center">
              <DropdownMenuItem onClick={addToGoogleCalendar}>
                <span>Google Calendar</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={addToAppleCalendar}>
                <span>Apple Calendar (iCal)</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={addToOutlook}>
                <span>Outlook Calendar</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View Bookings */}
          <Button 
            variant="outline" 
            className="w-full h-12 gap-2"
            onClick={() => navigate('/profile')}
          >
            <Calendar className="w-5 h-5" />
            View My Bookings
          </Button>

          {/* Go Home */}
          <Button 
            variant="ghost" 
            className="w-full h-12 gap-2"
            onClick={() => navigate('/')}
          >
            <Home className="w-5 h-5" />
            Back to Home
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default BookingConfirmation;
