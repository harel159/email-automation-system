import React, { useState, useEffect } from "react";
import {
  getAuthorities,
  saveAuthority,
  deleteAuthority
} from "@/lib/authority";
import { Card } from "@/component/ui/card";
import { Input } from "@/component/ui/input";
import { Button } from "@/component/ui/button";
import {
  Plus, Upload, Search, Trash2, Settings as SettingsIcon
} from "lucide-react";
import { format } from "date-fns";
import AuthorityForm from "../component/authorities/AuthorityForm";
import ImportDialog from "../component/authorities/ImportDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/component/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/component/ui/dialog";
import { API_BASE_URL } from "@/config";


/**
 * Dashboard – authority manager
 * Allows:
 * - Viewing + filtering authorities
 * - Adding / editing / deleting authorities
 * - Importing authority list from Excel
 */
export default function Dashboard() {
  // ========== STATE ========== //
  const [authorities, setAuthorities] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingAuthority, setEditingAuthority] = useState(null);

  // ========== LOAD DATA ========== //
const fetchAuthorities = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/clients`, { credentials: 'include' });
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    if (!Array.isArray(data)) throw new Error("Invalid response format");
    setAuthorities(data);
  } catch (err) {
    console.error("❌ Failed to load authorities:", err);
    setAuthorities([]);
  }
};



  useEffect(() => {
    fetchAuthorities();
  }, []);

  // ========== HANDLERS ========== //

  const handleSave = async (data) => {
    try {
      if (editingAuthority) {
        data.id = editingAuthority.id;
      }

      await saveAuthority(data); // 🔧 Backend create/update
      setShowForm(false);
      setEditingAuthority(null);
      await fetchAuthorities(); // refresh list
    } catch (error) {
      console.error("Failed to save authority:", error);
      alert("Error saving authority. Please try again.");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteAuthority(id); // 🔧 Backend delete
      fetchAuthorities(); // refresh list
    } catch (error) {
      console.error("Failed to delete authority:", error);
      alert("Error deleting authority. Please try again.");
    }
  };

  // Filter based on name or email
  const filteredAuthorities = Array.isArray(authorities)
  ? authorities.filter(
      auth =>
        auth.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        auth.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  : []

  // ========== UI ========== //
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <h1 className="text-2xl font-bold">Authorities Management</h1>
        <div className="flex gap-3">
          <Button onClick={() => setShowImport(true)} variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Import Excel
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Authority
          </Button>
        </div>
      </div>

      {/* Main Card */}
      <Card className="p-6">
        {/* Search */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search authorities..."
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
                <TableHead>Authority Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Send Date</TableHead>
                <TableHead>Last Email Sent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAuthorities.map((authority) => (
                <TableRow key={authority.id}>
                  <TableCell className="font-medium">{authority.name}</TableCell>
                  <TableCell>{authority.email}</TableCell>
                  <TableCell>{authority.send_date ? `Day ${authority.send_date}` : "-"}</TableCell>
                  <TableCell>
                    {authority.last_email_sent
                      ? format(new Date(authority.last_email_sent), "MMM d, yyyy")
                      : "Never"}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      authority.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {authority.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingAuthority(authority);
                        setShowForm(true);
                      }}
                    >
                      <SettingsIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleDelete(authority.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}

              {/* Empty State */}
              {filteredAuthorities.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No authorities found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Add/Edit Authority Form */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAuthority ? "Edit Authority" : "Add New Authority"}
            </DialogTitle>
          </DialogHeader>
          <AuthorityForm
            authority={editingAuthority}
            onSubmit={handleSave}
            onCancel={() => {
              setShowForm(false);
              setEditingAuthority(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Excel Import Dialog */}
      <ImportDialog
        open={showImport}
        onOpenChange={setShowImport}
        onSuccess={fetchAuthorities}
      />
    </div>
  );
}
