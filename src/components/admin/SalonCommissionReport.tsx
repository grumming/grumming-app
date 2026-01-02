import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Download, FileSpreadsheet, FileText, Store, Search, TrendingUp, Percent } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface SalonCommission {
  salonId: string;
  salonName: string;
  salonImage: string | null;
  city: string;
  totalPayments: number;
  grossEarnings: number;
  platformCommission: number;
  netEarnings: number;
  onlinePayments: number;
  cashPayments: number;
  avgOrderValue: number;
}

export const SalonCommissionReport = () => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [selectedMonth, setSelectedMonth] = useState(currentMonth.toString());
  const [searchQuery, setSearchQuery] = useState("");

  const { data: salonCommissions, isLoading } = useQuery({
    queryKey: ["salon-commission-report", selectedYear, selectedMonth],
    queryFn: async () => {
      // Get date range
      const startDate = `${selectedYear}-${selectedMonth.padStart(2, "0")}-01`;
      const endDate = new Date(parseInt(selectedYear), parseInt(selectedMonth), 0);
      const endDateStr = format(endDate, "yyyy-MM-dd");

      // Fetch payments with salon info
      const { data: payments, error } = await supabase
        .from("payments")
        .select(`
          *,
          salons:salon_id (
            id,
            name,
            image_url,
            city
          )
        `)
        .gte("created_at", startDate)
        .lte("created_at", `${endDateStr}T23:59:59`)
        .in("status", ["captured", "completed"]);

      if (error) throw error;

      // Group by salon
      const salonMap: Record<string, SalonCommission> = {};

      payments?.forEach((payment) => {
        const salon = payment.salons as any;
        if (!salon) return;

        const salonId = salon.id;
        if (!salonMap[salonId]) {
          salonMap[salonId] = {
            salonId,
            salonName: salon.name,
            salonImage: salon.image_url,
            city: salon.city,
            totalPayments: 0,
            grossEarnings: 0,
            platformCommission: 0,
            netEarnings: 0,
            onlinePayments: 0,
            cashPayments: 0,
            avgOrderValue: 0,
          };
        }

        salonMap[salonId].totalPayments += 1;
        salonMap[salonId].grossEarnings += Number(payment.amount);
        salonMap[salonId].platformCommission += Number(payment.platform_fee);
        salonMap[salonId].netEarnings += Number(payment.salon_amount);

        if (payment.payment_method === "cash") {
          salonMap[salonId].cashPayments += 1;
        } else {
          salonMap[salonId].onlinePayments += 1;
        }
      });

      // Calculate averages and sort by gross earnings
      const result = Object.values(salonMap).map((salon) => ({
        ...salon,
        avgOrderValue: salon.totalPayments > 0 ? salon.grossEarnings / salon.totalPayments : 0,
      }));

      return result.sort((a, b) => b.grossEarnings - a.grossEarnings);
    },
  });

  const filteredSalons = salonCommissions?.filter((salon) =>
    salon.salonName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    salon.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totals = filteredSalons?.reduce(
    (acc, salon) => ({
      totalPayments: acc.totalPayments + salon.totalPayments,
      grossEarnings: acc.grossEarnings + salon.grossEarnings,
      platformCommission: acc.platformCommission + salon.platformCommission,
      netEarnings: acc.netEarnings + salon.netEarnings,
    }),
    { totalPayments: 0, grossEarnings: 0, platformCommission: 0, netEarnings: 0 }
  );

  const months = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

  const exportToCSV = () => {
    if (!filteredSalons) return;

    const headers = [
      "Salon Name",
      "City",
      "Total Payments",
      "Gross Earnings (₹)",
      "Platform Commission (₹)",
      "Net Earnings (₹)",
      "Online Payments",
      "Cash Payments",
      "Avg Order Value (₹)",
    ];

    const rows = filteredSalons.map((s) => [
      s.salonName,
      s.city,
      s.totalPayments,
      s.grossEarnings.toFixed(2),
      s.platformCommission.toFixed(2),
      s.netEarnings.toFixed(2),
      s.onlinePayments,
      s.cashPayments,
      s.avgOrderValue.toFixed(2),
    ]);

    // Add totals
    rows.push([
      "TOTAL",
      "-",
      totals?.totalPayments || 0,
      totals?.grossEarnings.toFixed(2) || "0",
      totals?.platformCommission.toFixed(2) || "0",
      totals?.netEarnings.toFixed(2) || "0",
      "-",
      "-",
      "-",
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `salon-commission-${selectedYear}-${selectedMonth.padStart(2, "0")}.csv`;
    link.click();
  };

  const exportToPDF = () => {
    if (!filteredSalons) return;

    const doc = new jsPDF();
    const monthName = months.find((m) => m.value === selectedMonth)?.label;

    doc.setFontSize(20);
    doc.text(`Salon Commission Report`, 14, 22);
    doc.setFontSize(14);
    doc.text(`${monthName} ${selectedYear}`, 14, 32);

    doc.setFontSize(11);
    doc.text(`Total Salons: ${filteredSalons.length}`, 14, 45);
    doc.text(`Total Revenue: ₹${totals?.grossEarnings.toLocaleString("en-IN")}`, 14, 52);
    doc.text(`Total Commission: ₹${totals?.platformCommission.toLocaleString("en-IN")}`, 14, 59);
    doc.text(`Generated: ${format(new Date(), "dd MMM yyyy, hh:mm a")}`, 14, 66);

    autoTable(doc, {
      startY: 75,
      head: [["Salon", "City", "Payments", "Gross (₹)", "Commission (₹)", "Net (₹)"]],
      body: [
        ...filteredSalons.map((s) => [
          s.salonName,
          s.city,
          s.totalPayments,
          s.grossEarnings.toFixed(0),
          s.platformCommission.toFixed(0),
          s.netEarnings.toFixed(0),
        ]),
        [
          "TOTAL",
          "-",
          totals?.totalPayments || 0,
          totals?.grossEarnings.toFixed(0) || "0",
          totals?.platformCommission.toFixed(0) || "0",
          totals?.netEarnings.toFixed(0) || "0",
        ],
      ],
      theme: "striped",
      headStyles: { fillColor: [99, 102, 241] },
    });

    doc.save(`salon-commission-${selectedYear}-${selectedMonth.padStart(2, "0")}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Store className="h-5 w-5" />
            Salon-wise Commission Report
          </h3>
          <p className="text-sm text-muted-foreground">
            Individual salon earnings and commission breakdown
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportToCSV} disabled={isLoading}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportToPDF} disabled={isLoading}>
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Store className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Salons</p>
                <p className="text-2xl font-bold">{filteredSalons?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gross Revenue</p>
                <p className="text-2xl font-bold">
                  ₹{(totals?.grossEarnings || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Percent className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Platform Commission</p>
                <p className="text-2xl font-bold text-green-600">
                  ₹{(totals?.platformCommission || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Download className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Salon Earnings</p>
                <p className="text-2xl font-bold text-purple-600">
                  ₹{(totals?.netEarnings || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-base">Salon Breakdown</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search salons..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredSalons?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No salon data found for this period
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Salon</TableHead>
                    <TableHead className="text-right">Payments</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">Commission (2%)</TableHead>
                    <TableHead className="text-right">Net Earnings</TableHead>
                    <TableHead className="text-right">Type Split</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSalons?.map((salon) => (
                    <TableRow key={salon.salonId}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={salon.salonImage || ""} />
                            <AvatarFallback>{salon.salonName.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{salon.salonName}</p>
                            <p className="text-xs text-muted-foreground">{salon.city}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{salon.totalPayments}</TableCell>
                      <TableCell className="text-right">
                        ₹{salon.grossEarnings.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        ₹{salon.platformCommission.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ₹{salon.netEarnings.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Badge variant="outline" className="text-xs">
                            {salon.onlinePayments} online
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {salon.cashPayments} cash
                          </Badge>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Totals Row */}
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell>TOTAL ({filteredSalons?.length} salons)</TableCell>
                    <TableCell className="text-right">{totals?.totalPayments}</TableCell>
                    <TableCell className="text-right">
                      ₹{totals?.grossEarnings.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      ₹{totals?.platformCommission.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </TableCell>
                    <TableCell className="text-right">
                      ₹{totals?.netEarnings.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
