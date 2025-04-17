import React, { useCallback, useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/component/ui/button";
import { AlertCircle, Upload } from "lucide-react";
import { Alert, AlertDescription } from "@/component/ui/alert";
import { bulkCreateAuthorities } from "@/lib/authority";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/component/ui/dialog";

/**
 * ImportDialog – Uploads an Excel file and parses rows into authorities
 * @param {boolean} open – whether the dialog is visible
 * @param {function} onOpenChange – controls dialog visibility
 * @param {function} onSuccess – callback triggered after successful import
 */
export default function ImportDialog({ open, onOpenChange, onSuccess }) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);

  // Handle drag enter/leave/over to highlight drop zone
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  }, []);

  // ✅ Process a selected Excel file
  const processFile = async (file) => {
    try {
      setError(null);
      setProcessing(true);

      const excelBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(excelBuffer);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const sheetData = XLSX.utils.sheet_to_json(sheet);

      // Clean each entry
      const cleaned = sheetData.map(entry => ({
        name: entry.name?.toString().trim(),
        email: entry.email?.toString().trim(),
        send_date: parseInt(entry.send_date),
        status: entry.status?.toLowerCase() === "inactive" ? "inactive" : "active"
      }));

      // Send to backend
      await bulkCreateAuthorities(cleaned);
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      console.error("📛 Import error:", err);
      setError("Failed to import file. Make sure it's a valid Excel file.");
    } finally {
      setProcessing(false);
    }
  };

  // Drop handler
  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer?.files?.[0];
    if (!file || !isValidExcel(file)) {
      return setError("Please upload a valid Excel file (.xlsx or .xls)");
    }

    await processFile(file);
  }, [onSuccess, onOpenChange]);

  // File picker handler
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !isValidExcel(file)) {
      return setError("Please upload a valid Excel file (.xlsx or .xls)");
    }

    await processFile(file);
  };

  const isValidExcel = (file) =>
    file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

  const triggerFileDialog = () => {
    document.getElementById("file-upload")?.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Authorities</DialogTitle>
        </DialogHeader>

        {/* Display error */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Dropzone */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center ${
            isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {processing ? (
            <div className="space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-gray-600">Processing file...</p>
            </div>
          ) : (
            <>
              <Upload className="h-8 w-8 mx-auto text-gray-400 mb-4" />
              <p className="text-sm text-gray-600 mb-2">
                Drag and drop your Excel file here, or
              </p>
              <Button type="button" variant="outline" className="mx-auto" onClick={triggerFileDialog}>
                Browse Files
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                Supports Excel files (.xlsx, .xls)
              </p>
            </>
          )}
        </div>

        {/* Hidden input used by Browse Files button */}
        <input
          id="file-upload"
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={handleFileSelect}
        />
      </DialogContent>
    </Dialog>
  );
}
