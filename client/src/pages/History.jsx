import React, { useState, useEffect } from "react";
import { Card } from "@/component/ui/card";
import { Input } from "@/component/ui/input";
import { Search, Download } from "lucide-react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/component/ui/table";

/**
 * Email History Page
 * - Displays past email logs
 * - Allows filtering by authority
 * - Can export logs to CSV
 */
export default function History() {
  // ========== STATE ========== //
  const [logs, setLogs] = useState([]);
  const [authorities, setAuthorities] = useState({});
  const [searchTerm, setSearchTerm] = useState("");

  // ========== LOAD ========== //
  useEffect(() => {
    fetchLogsAndAuthorities();
  }, []);

  const fetchLogsAndAuthorities = async () => {
    const [logsData, authoritiesData] = await Promise.all([
      EmailLog.list("-sent_date"), // 🔧 Needs real API
      Authority.list()             // 🔧 Needs real API
    ]);

    setLogs(logsData);
    const authorityMap = authoritiesData.reduce((acc, auth) => {
      acc[auth.id] = auth;
      return acc;
    }, {});
    setAuthorities(authorityMap);
  };

  // ========== FILTER ========== //
  const filteredLogs = logs.filter(log => {
    const authority = authorities[log.authority_id];
    const query = searchTerm.toLowerCase();
    return (
      authority?.name.toLowerCase().includes(query) ||
      authority?.email.toLowerCase().includes(query)
    );
  });

  // ========== EXPORT CSV ========== //
  const exportToCSV = () => {
    const csvRows = [
      ["Date", "Authority", "Email", "Status", "Error"],
      ...filteredLogs.map(log => [
        format(new Date(log.sent_date), "yyyy-MM-dd HH:mm:ss"),
        authorities[log.authority_id]?.name || "",
        authorities[log.authority_id]?.email || "",
        log.status,
        log.error_message || ""
      ])
    ];

    const csvContent = csvRows
      .map(row => row.map(value => `"${value?.toString().replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `email_logs_${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ========== UI ========== //
  return (
    <div className="space-y-6">
      {/* Header + Export */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <h1 className="text-2xl font-bold">Email History</h1>
        <button
          onClick={exportToCSV}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export to CSV
        </button>
      </div>

      <Card className="p-6">
        {/* Search input */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by authority name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Authority</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => {
                const authority = authorities[log.authority_id];
                return (
                  <TableRow key={log.id}>
                    <TableCell>
                      {format(new Date(log.sent_date), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    <TableCell className="font-medium">{authority?.name}</TableCell>
                    <TableCell>{authority?.email}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        log.status === 'success'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {log.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-red-600">{log.error_message}</TableCell>
                  </TableRow>
                );
              })}

              {/* Empty state */}
              {filteredLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    No email logs found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
