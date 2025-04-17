import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/component/ui/button";
import { Upload, X } from "lucide-react";
import { Card } from "@/component/ui/card";
import { uploadAttachmentFile } from "@/lib/emailAttachments";

/**
 * AttachmentManager handles the file upload process (manual + drag-drop)
 * and keeps the uploaded list synced with the parent template.
 */
export default function AttachmentManager({ savedAttachments = [], onSaveAttachments }) {
  const [attachments, setAttachments] = useState(savedAttachments);

  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  // Sync when parent sends updated attachment list
  useEffect(() => {
    setAttachments(savedAttachments);
  }, [savedAttachments]);

  /**
   * Handle selected files (from input or drop)
   */
  const handleFiles = useCallback(
    async (files) => {
      const fileList = Array.from(files);
      const uploaded = [];
  
      for (const file of fileList) {
        try {
          const res = await uploadAttachmentFile(file);
          uploaded.push({
            file_name: res.filename,
            file_url: `/attachments/${res.filename}`,
            file_size: file.size
          });
        } catch (err) {
          console.error("Upload failed:", err);
          alert(`Upload failed for ${file.name}`);
        }
      }
  
      const combined = [...attachments, ...uploaded];
      console.log("✅ Normalized attachments being saved:", combined);
      setAttachments(combined);
      onSaveAttachments?.(combined);
    },
    [attachments, onSaveAttachments]
  );

  /**
   * Handle file input trigger
   */
  const handleFileInputChange = (e) => {
    if (e.target.files?.length) {
      handleFiles(e.target.files);
    }
  };

  /**
   * Handle drag-and-drop upload
   */
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files?.length) {
      handleFiles(e.dataTransfer.files);
    }
  };

  /**
   * Remove attachment by index
   */
  const handleRemove = (index) => {
    const updated = attachments.filter((_, i) => i !== index);
    setAttachments(updated);
    onSaveAttachments?.(updated);
  };

  return (
    <div className="space-y-4">
      {/* Drop zone / file picker */}
      <div
        ref={dropZoneRef}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="border border-dashed border-gray-400 rounded-md p-6 text-center cursor-pointer bg-white hover:bg-gray-50"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="w-6 h-6 mx-auto mb-2 text-gray-600" />
        <p className="text-sm text-gray-600">Click or drag and drop to upload files</p>
        <input
          type="file"
          multiple
          onChange={handleFileInputChange}
          ref={fileInputRef}
          className="hidden"
        />
      </div>

      {/* Uploaded attachments list */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((file, idx) => (
            <div
              key={idx}
              className="flex justify-between items-center border p-2 rounded bg-gray-50"
            >
              <div>
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-gray-500">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleRemove(idx)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * AttachmentTab: Renders the AttachmentManager in a wrapped tab panel
 */
export const AttachmentTab = ({ template, setTemplate }) => {
  return (
    <Card className="p-6 space-y-6">
      <AttachmentManager
        savedAttachments={template.attachments}
        onSaveAttachments={(updated) =>
          setTemplate((prev) => ({ ...prev, attachments: updated }))
        }
      />
    </Card>
  );
};
