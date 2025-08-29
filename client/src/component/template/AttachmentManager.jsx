import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/component/ui/button";
import { Upload, X } from "lucide-react";
import { Card } from "@/component/ui/card";
import { uploadAttachmentFile, addAttachmentMetadata, deleteAttachmentMetadata } from "@/lib/emailAttachments";

/**
 * Props:
 * - template: { id, ... , attachments: [] }
 * - onTemplateChange: fn to update parent (receives new template object)
 */
export default function AttachmentManager({ template, onTemplateChange }) {
  const [attachments, setAttachments] = useState(template?.attachments || []);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setAttachments(template?.attachments || []);
  }, [template?.attachments]);

  const handleFiles = useCallback(
    async (files) => {
      if (!template?.id) {
        alert("Please save or load the template first so it has an ID.");
        return;
      }
      const fileList = Array.from(files);
      const newRows = [];

      for (const file of fileList) {
        try {
          // 1) upload PDF to /attachments folder
          const up = await uploadAttachmentFile(file); // { success, filename }
          // 2) persist metadata in DB
          const row = await addAttachmentMetadata({
            template_id: template.id,
            file_name: file.name,                      // display name (can be Hebrew)
            file_url: `/attachments/${up.filename}`    // path we serve
          });
          newRows.push(row);
        } catch (err) {
          console.error("Upload/Save failed:", err);
          alert(`Upload failed for ${file.name}`);
        }
      }

      if (newRows.length) {
        const combined = [...attachments, ...newRows];
        setAttachments(combined);
        onTemplateChange?.({ ...template, attachments: combined });
      }
    },
    [attachments, onTemplateChange, template]
  );

  const handleFileInputChange = (e) => {
    if (e.target.files?.length) handleFiles(e.target.files);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  };

  const handleRemove = async (index) => {
    const item = attachments[index];
    try {
      if (item?.id) await deleteAttachmentMetadata(item.id);
      const updated = attachments.filter((_, i) => i !== index);
      setAttachments(updated);
      onTemplateChange?.({ ...template, attachments: updated });
    } catch (e) {
      console.error("Delete failed", e);
      alert("Delete failed");
    }
  };

  return (
    <div className="space-y-4">
      {/* Drop zone / picker */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="border border-dashed border-gray-400 rounded-md p-6 text-center cursor-pointer bg-white hover:bg-gray-50"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="w-6 h-6 mx-auto mb-2 text-gray-600" />
        <p className="text-sm text-gray-600">Click or drag and drop to upload PDF files</p>
        <input type="file" accept="application/pdf" multiple onChange={handleFileInputChange} ref={fileInputRef} className="hidden" />
      </div>

      {/* List */}
      {attachments?.length > 0 && (
        <div className="space-y-2">
          {attachments.map((a, idx) => (
            <div key={a.id ?? idx} className="flex justify-between items-center border p-2 rounded bg-gray-50">
              <div>
                <p className="text-sm font-medium">{a.file_name}</p>
                <p className="text-xs text-gray-500">{a.file_url}</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => handleRemove(idx)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Optional wrapper (if you used it before) */
export const AttachmentTab = ({ template, setTemplate }) => (
  <Card className="p-6 space-y-6">
    <AttachmentManager
      template={template}
      onTemplateChange={(next) => setTemplate(next)}
    />
  </Card>
);
