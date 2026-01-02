import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, FileSpreadsheet, FileText, TrendingUp, Calendar } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface MonthlyCommission {
  month: string;
  totalPayments: number;
  totalAmount: number;
  totalCommission: number;
  onlinePayments: number;
  onlineCommission: number;
  cashPayments: number;
  cashCommission: number;
}

export const CommissionReports = () => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());

  const { data: commissionData, isLoading } = useQuery({
    queryKey: ["commission-reports", selectedYear],
    queryFn: async () => {
      const startDate = `${selectedYear}-01-01`;
      const endDate = `${selectedYear}-12-31`;

      const { data: payments, error } = await supabase
        .from("payments")
        .select("*")
        .gte("created_at", startDate)
        .lte("created_at", endDate)
        .in("status", ["captured", "completed"]);

      if (error) throw error;

      // Group by month
      const monthlyData: Record<string, MonthlyCommission> = {};

      for (let i = 0; i < 12; i++) {
        const monthDate = new Date(parseInt(selectedYear), i, 1);
        const monthKey = format(monthDate, "yyyy-MM");
        monthlyData[monthKey] = {
          month: format(monthDate, "MMMM yyyy"),
          totalPayments: 0,
          totalAmount: 0,
          totalCommission: 0,
          onlinePayments: 0,
          onlineCommission: 0,
          cashPayments: 0,
          cashCommission: 0,
        };
      }

      payments?.forEach((payment) => {
        const monthKey = format(new Date(payment.created_at), "yyyy-MM");
        if (monthlyData[monthKey]) {
          monthlyData[monthKey].totalPayments += 1;
          monthlyData[monthKey].totalAmount += Number(payment.amount);
          monthlyData[monthKey].totalCommission += Number(payment.platform_fee);

          if (payment.payment_method === "cash") {
            monthlyData[monthKey].cashPayments += 1;
            monthlyData[monthKey].cashCommission += Number(payment.platform_fee);
          } else {
            monthlyData[monthKey].onlinePayments += 1;
            monthlyData[monthKey].onlineCommission += Number(payment.platform_fee);
          }
        }
      });

      return Object.values(monthlyData);
    },
  });

  const totalCommission = commissionData?.reduce((sum, m) => sum + m.totalCommission, 0) || 0;
  const totalAmount = commissionData?.reduce((sum, m) => sum + m.totalAmount, 0) || 0;

  const exportToCSV = () => {
    if (!commissionData) return;

    const headers = [
      "Month",
      "Total Payments",
      "Total Amount (₹)",
      "Platform Commission (₹)",
      "Online Payments",
      "Online Commission (₹)",
      "Cash Payments",
      "Cash Commission (₹)",
    ];

    const rows = commissionData.map((m) => [
      m.month,
      m.totalPayments,
      m.totalAmount.toFixed(2),
      m.totalCommission.toFixed(2),
      m.onlinePayments,
      m.onlineCommission.toFixed(2),
      m.cashPayments,
      m.cashCommission.toFixed(2),
    ]);

    // Add totals row
    rows.push([
      "TOTAL",
      commissionData.reduce((sum, m) => sum + m.totalPayments, 0),
      totalAmount.toFixed(2),
      totalCommission.toFixed(2),
      commissionData.reduce((sum, m) => sum + m.onlinePayments, 0),
      commissionData.reduce((sum, m) => sum + m.onlineCommission, 0).toFixed(2),
      commissionData.reduce((sum, m) => sum + m.cashPayments, 0),
      commissionData.reduce((sum, m) => sum + m.cashCommission, 0).toFixed(2),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `commission-report-${selectedYear}.csv`;
    link.click();
  };

  const exportToPDF = () => {
    if (!commissionData) return;

    const doc = new jsPDF();

    // Title
    doc.setFontSize(20);
    doc.text(`Commission Report - ${selectedYear}`, 14, 22);

    // Summary
    doc.setFontSize(12);
    doc.text(`Total Revenue: ₹${totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 14, 35);
    doc.text(`Total Commission: ₹${totalCommission.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 14, 42);
    doc.text(`Generated on: ${format(new Date(), "dd MMM yyyy, hh:mm a")}`, 14, 49);

    // Table
    autoTable(doc, {
      startY: 58,
      head: [
        [
          "Month",
          "Payments",
          "Amount (₹)",
          "Commission (₹)",
          "Online",
          "Cash",
        ],
      ],
      body: [
        ...commissionData.map((m) => [
          m.month,
          m.totalPayments,
          m.totalAmount.toFixed(2),
          m.totalCommission.toFixed(2),
          m.onlinePayments,
          m.cashPayments,
        ]),
        [
          "TOTAL",
          commissionData.reduce((sum, m) => sum + m.totalPayments, 0),
          totalAmount.toFixed(2),
          totalCommission.toFixed(2),
          commissionData.reduce((sum, m) => sum + m.onlinePayments, 0),
          commissionData.reduce((sum, m) => sum + m.cashPayments, 0),
        ],
      ],
      theme: "striped",
      headStyles: { fillColor: [99, 102, 241] },
      footStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0], fontStyle: "bold" },
    });

    doc.save(`commission-report-${selectedYear}.pdf`);
  };

  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold">Monthly Commission Reports</h3>
          <p className="text-sm text-muted-foreground">
            View and export commission data by month
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-32">
              <Calendar className="h-4 w-4 mr-2" />
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue ({selectedYear})</p>
                <p className="text-2xl font-bold">
                  ₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Download className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Commission ({selectedYear})</p>
                <p className="text-2xl font-bold text-green-600">
                  ₹{totalCommission.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Monthly Commission</p>
                <p className="text-2xl font-bold text-blue-600">
                  ₹{(totalCommission / 12).toLocaleString("en-IN", { minimumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Payments</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead className="text-right">Online</TableHead>
                    <TableHead className="text-right">Cash</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissionData?.map((month) => (
                    <TableRow key={month.month}>
                      <TableCell className="font-medium">{month.month}</TableCell>
                      <TableCell className="text-right">{month.totalPayments}</TableCell>
                      <TableCell className="text-right">
                        ₹{month.totalAmount.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        ₹{month.totalCommission.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="text-xs">
                          {month.onlinePayments} (₹{month.onlineCommission.toFixed(0)})
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary" className="text-xs">
                          {month.cashPayments} (₹{month.cashCommission.toFixed(0)})
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Totals Row */}
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell>TOTAL</TableCell>
                    <TableCell className="text-right">
                      {commissionData?.reduce((sum, m) => sum + m.totalPayments, 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      ₹{totalAmount.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      ₹{totalCommission.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="text-right">
                      {commissionData?.reduce((sum, m) => sum + m.onlinePayments, 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      {commissionData?.reduce((sum, m) => sum + m.cashPayments, 0)}
                    </TableCell>
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
