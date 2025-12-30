import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, TrendingDown, IndianRupee, Calendar, 
  BarChart3, PieChart, ArrowUpRight, ArrowDownRight,
  Loader2
} from 'lucide-react';
import { format, subDays, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval } from 'date-fns';
import { 
  LineChart, Line, BarChart, Bar, PieChart as RePieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart
} from 'recharts';

interface DailyRevenue {
  date: string;
  revenue: number;
  bookings: number;
}

interface ServiceRevenue {
  name: string;
  revenue: number;
  count: number;
}

interface SalonRevenue {
  name: string;
  revenue: number;
  count: number;
}

const COLORS = ['#9b87f5', '#7E69AB', '#6E59A5', '#D6BCFA', '#E5DEFF'];

export const RevenueAnalytics = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenue[]>([]);
  const [serviceRevenue, setServiceRevenue] = useState<ServiceRevenue[]>([]);
  const [salonRevenue, setSalonRevenue] = useState<SalonRevenue[]>([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    previousRevenue: 0,
    avgBookingValue: 0,
    totalBookings: 0,
    completedBookings: 0,
    growthRate: 0
  });

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');
    const previousStartDate = format(subDays(new Date(), days * 2), 'yyyy-MM-dd');
    const previousEndDate = format(subDays(new Date(), days + 1), 'yyyy-MM-dd');
    
    try {
      // Fetch current period bookings
      const { data: currentBookings } = await supabase
        .from('bookings')
        .select('*')
        .gte('booking_date', startDate)
        .order('booking_date', { ascending: true });

      // Fetch previous period bookings for comparison
      const { data: previousBookings } = await supabase
        .from('bookings')
        .select('*')
        .gte('booking_date', previousStartDate)
        .lte('booking_date', previousEndDate);

      if (currentBookings) {
        // Calculate daily revenue
        const dateRange = eachDayOfInterval({
          start: subDays(new Date(), days),
          end: new Date()
        });

        const dailyData = dateRange.map(date => {
          const dateStr = format(date, 'yyyy-MM-dd');
          const dayBookings = currentBookings.filter(b => b.booking_date === dateStr && b.status === 'completed');
          return {
            date: format(date, 'MMM d'),
            revenue: dayBookings.reduce((sum, b) => sum + (b.service_price || 0), 0),
            bookings: dayBookings.length
          };
        });
        setDailyRevenue(dailyData);

        // Calculate service revenue breakdown
        const serviceMap = new Map<string, { revenue: number; count: number }>();
        currentBookings.filter(b => b.status === 'completed').forEach(booking => {
          const current = serviceMap.get(booking.service_name) || { revenue: 0, count: 0 };
          serviceMap.set(booking.service_name, {
            revenue: current.revenue + (booking.service_price || 0),
            count: current.count + 1
          });
        });
        const serviceData = Array.from(serviceMap.entries())
          .map(([name, data]) => ({ name, ...data }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5);
        setServiceRevenue(serviceData);

        // Calculate salon revenue breakdown
        const salonMap = new Map<string, { revenue: number; count: number }>();
        currentBookings.filter(b => b.status === 'completed').forEach(booking => {
          const current = salonMap.get(booking.salon_name) || { revenue: 0, count: 0 };
          salonMap.set(booking.salon_name, {
            revenue: current.revenue + (booking.service_price || 0),
            count: current.count + 1
          });
        });
        const salonData = Array.from(salonMap.entries())
          .map(([name, data]) => ({ name, ...data }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5);
        setSalonRevenue(salonData);

        // Calculate stats
        const completedBookings = currentBookings.filter(b => b.status === 'completed');
        const totalRevenue = completedBookings.reduce((sum, b) => sum + (b.service_price || 0), 0);
        const previousCompleted = previousBookings?.filter(b => b.status === 'completed') || [];
        const previousRevenue = previousCompleted.reduce((sum, b) => sum + (b.service_price || 0), 0);
        const growthRate = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

        setStats({
          totalRevenue,
          previousRevenue,
          avgBookingValue: completedBookings.length > 0 ? totalRevenue / completedBookings.length : 0,
          totalBookings: currentBookings.length,
          completedBookings: completedBookings.length,
          growthRate
        });
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
    
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Revenue Analytics</h2>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as '7d' | '30d' | '90d')}>
          <TabsList>
            <TabsTrigger value="7d">7 Days</TabsTrigger>
            <TabsTrigger value="30d">30 Days</TabsTrigger>
            <TabsTrigger value="90d">90 Days</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <h3 className="text-2xl font-bold mt-1">₹{stats.totalRevenue.toLocaleString()}</h3>
                <div className={`flex items-center gap-1 mt-1 text-xs ${stats.growthRate >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {stats.growthRate >= 0 ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {Math.abs(stats.growthRate).toFixed(1)}% vs previous
                </div>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <IndianRupee className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Booking Value</p>
                <h3 className="text-2xl font-bold mt-1">₹{stats.avgBookingValue.toFixed(0)}</h3>
                <p className="text-xs text-muted-foreground mt-1">Per completed booking</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed Bookings</p>
                <h3 className="text-2xl font-bold mt-1">{stats.completedBookings}</h3>
                <p className="text-xs text-muted-foreground mt-1">of {stats.totalBookings} total</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completion Rate</p>
                <h3 className="text-2xl font-bold mt-1">
                  {stats.totalBookings > 0 ? ((stats.completedBookings / stats.totalBookings) * 100).toFixed(0) : 0}%
                </h3>
                <p className="text-xs text-muted-foreground mt-1">Bookings completed</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                {stats.growthRate >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-purple-500" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-purple-500" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Revenue Trend
          </CardTitle>
          <CardDescription>Daily revenue over the selected period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyRevenue}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9b87f5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#9b87f5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis 
                  dataKey="date" 
                  fontSize={12}
                  tick={{ fill: '#737373' }}
                />
                <YAxis 
                  fontSize={12}
                  tick={{ fill: '#737373' }}
                  tickFormatter={(value) => `₹${value}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#ffffff', 
                    border: '1px solid #e5e5e5',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Revenue']}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#9b87f5" 
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Service & Salon Breakdown */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Services */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              Top Services by Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            {serviceRevenue.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <PieChart className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No service data available</p>
              </div>
            ) : (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={serviceRevenue}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="revenue"
                    >
                      {serviceRevenue.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#ffffff', 
                        border: '1px solid #e5e5e5',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Revenue']}
                    />
                    <Legend />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Salons */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Top Salons by Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            {salonRevenue.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No salon data available</p>
              </div>
            ) : (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salonRevenue} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis 
                      type="number"
                      tick={{ fill: '#737373' }}
                      tickFormatter={(value) => `₹${value}`}
                    />
                    <YAxis 
                      dataKey="name" 
                      type="category"
                      width={100}
                      tick={{ fill: '#737373', fontSize: 12 }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#ffffff', 
                        border: '1px solid #e5e5e5',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Revenue']}
                    />
                    <Bar 
                      dataKey="revenue" 
                      fill="#9b87f5" 
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RevenueAnalytics;
