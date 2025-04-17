import React, { useState, useCallback } from "react";
import { Button } from "@/component/ui/button";
import { AlertCircle, Upload, Paperclip, X, File as FileIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/component/ui/alert";
import { Progress } from "@/component/ui/progress";

/**
 * FileUploader – component to upload multiple PDF files with validation, drag & drop support,
 * progress tracking, and attachment management.
 */
export default function FileUploader({ attachments = [], onChange }) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});

  /**
   * Handle drag UI state
   */
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (["dragenter", "dragover"].includes(e.type)) {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  }, []);

  /**
   * Upload validated PDF files one-by-one with progress simulation
   */
  const uploadFiles = async (files) => {
    try {
      setError(null);
      setUploading(true);

      const validFiles = files.filter(file =>
        file.type === "application/pdf" && file.size <= 10 * 1024 * 1024
      );

      if (validFiles.length === 0) {
        throw new Error("Please upload PDF files under 10MB each");
      }

      const results = [];
      const failures = [];

      for (const file of validFiles) {
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

        const interval = setInterval(() => {
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: Math.min((prev[file.name] || 0) + 10, 90),
          }));
        }, 100);

        try {
          const { file_url } = await UploadFile({ file }); // 🔁 Real API call here

          results.push({
            file_name: file.name,
            file_url,
            file_size: file.size,
          });

          setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
        } catch (err) {
          console.error(`❌ Upload failed for ${file.name}:`, err);
          failures.push(file.name);
        } finally {
          clearInterval(interval);
          await new Promise(res => setTimeout(res, 300));
        }
      }

      if (results.length === 0) {
        throw new Error("All uploads failed. Please try again.");
      }

      if (failures.length > 0) {
        setError(`Failed: ${failures.join(", ")}. ${results.length} uploaded.`);
      }

      onChange([...attachments, ...results]);
    } catch (err) {
      setError(err.message || "Upload failed. Try again.");
    } finally {
      setUploading(false);
      setUploadProgress({});
    }
  };

  /**
   * Drag & drop handler
   */
  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) await uploadFiles(files);
  }, [attachments, onChange]);

  /**
   * File picker handler
   */
  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length) await uploadFiles(files);
  };

  /**
   * Remove an attachment by index
   */
  const handleRemove = (index) => {
    const newAttachments = attachments.filter((_, i) => i !== index);
    onChange(newAttachments);
  };

  const formatFileSize = (bytes) =>
    bytes < 1024
      ? `${bytes} bytes`
      : bytes < 1048576
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / 1048576).toFixed(1)} MB`;

  return (
    <div className="space-y-4">
      {/* Error alert */}
      {error && (
        <Alert variant={error.includes("uploaded") ? "default" : "destructive"}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Drag & drop box or progress bar */}
      <div className="space-y-2">
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition ${
            isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            id="file-upload"
            className="hidden"
            multiple
            accept=".pdf"
            onChange={handleFileSelect}
          />

          {uploading ? (
            <div className="space-y-4">
              {Object.entries(uploadProgress).map(([fileName, progress]) => (
                <div key={fileName}>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span className="truncate max-w-[200px]">{fileName}</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              ))}
            </div>
          ) : (
            <>
              <Paperclip className="h-8 w-8 mx-auto text-gray-400 mb-4" />
              <p className="text-sm text-gray-600 mb-2">
                Drag and drop PDF files here, or
              </p>
              <label htmlFor="file-upload">
                <Button variant="outline" size="sm" className="mx-auto">
                  <Upload className="w-4 h-4 mr-2" />
                  Browse Files
                </Button>
              </label>
              <p className="text-xs text-gray-500 mt-2">
                PDF only • Max 10MB per file • Upload as many as you want
              </p>
            </>
          )}
        </div>
      </div>

      {/* Attachments list */}
      {attachments.length > 0 && (
        <div className="border rounded-lg p-4">
          <h3 className="text-sm font-medium mb-2">Attachments ({attachments.length})</h3>
          <div className="space-y-2">
            {attachments.map((att, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-gray-50 rounded"
              >
                <div className="flex items-center gap-2">
                  <FileIcon className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium truncate max-w-[200px]">
                    {att.file_name}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({formatFileSize(att.file_size)})
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleRemove(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
