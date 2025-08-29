import React, { useState, useEffect, useCallback } from "react";
import { Card } from "@/component/ui/card";
import { Button } from "@/component/ui/button";
import { Input } from "@/component/ui/input";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { Info, Save, Send, Upload } from "lucide-react";
import { Alert, AlertDescription } from "@/component/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/component/ui/tabs";
import { sendEmail } from "@/lib/emailSender";
import { API_BASE_URL } from "../config";

const TABS = { TEMPLATE: "template", ATTACHMENTS: "attachments" };

export default function EmailManager() {
  const [template, setTemplate] = useState({
    id: null,
    title: "Monthly Status Update",
    subject: "",
    body: "",
    body_html: "",
    attachments: [],
    from_name: "",
    reply_to: "",
    is_active: true
  });
  const [authorities, setAuthorities] = useState([]);
  const [testEmail, setTestEmail] = useState([]);
  const [activeTab, setActiveTab] = useState(TABS.TEMPLATE);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [uploading, setUploading] = useState(false);

  // === API helpers ===
  const apiGetTemplate = async () => {
    const res = await fetch(`${API_BASE_URL}/email/template`, { credentials: "include" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json(); // {id,title,subject,body_html,attachments:[]}
  };

  const apiSaveTemplate = async (payload) => {
    const hasId = Boolean(payload.id);
    const res = await fetch(`${API_BASE_URL}/email/template${hasId ? `/${payload.id}` : ""}`, {
      method: hasId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };

  const apiUploadFile = async (file) => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`${API_BASE_URL}/email/upload-attachment`, {
      method: "POST",
      body: fd,
      credentials: "include",
    });
    if (!res.ok) throw new Error(`Upload HTTP ${res.status}`);
    return res.json(); // {success,savedFilename,originalFilename}
  };

  const apiAddAttachment = async ({ template_id, file_name, file_url }) => {
    const res = await fetch(`${API_BASE_URL}/email/attachments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ template_id, file_name, file_url }),
    });
    if (!res.ok) throw new Error(`Add attach HTTP ${res.status}`);
    return res.json(); // { id, file_name, file_url, created_at }
  };

  const apiDeleteAttachment = async (id) => {
    const res = await fetch(`${API_BASE_URL}/email/attachments/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id }),
    });
    if (!res.ok) throw new Error(`Delete attach HTTP ${res.status}`);
    return res.json();
  };

  // === Load initial data ===
  useEffect(() => {
    (async () => {
      try {
        // Template (PG)
        const t = await apiGetTemplate();
        if (t) {
          setTemplate(prev => ({
            ...prev,
            ...t,
            body: t.body_html || "", // map DB -> editor
            body_html: t.body_html || ""
          }));
        }
        // Authorities for recipients
        const res = await fetch(`${API_BASE_URL}/clients`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setAuthorities(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error("Init load error", e);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  // === Save template (PG) ===
  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      if (!template.subject) throw new Error("Please fill in the subject");
      const payload = {
        id: template.id || undefined,
        title: template.title || "Monthly Status Update",
        subject: template.subject,
        body_html: template.body, // editor content
      };
      const saved = await apiSaveTemplate(payload);
      setTemplate(prev => ({ ...prev, ...saved, body: saved.body_html }));
      setSuccess("Template saved successfully");
    } catch (err) {
      setError(err.message || "Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  // === Send emails (uses server-side attachments from DB) ===
  const handleSend = async () => {
    try {
      setSending(true);
      setError(null);
      setSuccess(null);
      if (!template.subject || !template.body || testEmail.length === 0) {
        throw new Error("Please fill subject, body, and select recipients.");
      }
      const recipients = authorities
        .filter(a => testEmail.includes(a.email))
        .map(a => ({ email: a.email, name: a.name }));

      await sendEmail({
        to: recipients,
        subject: template.subject,
        body: template.body,
        from_name: template.from_name,
        reply_to: template.reply_to,
      });

      setSuccess("Email sent successfully!");
    } catch (err) {
      console.error("Send error:", err);
      setError(err.message || "Failed to send email.");
    } finally {
      setSending(false);
    }
  };

  // === Upload + attach to template (DB metadata) ===
  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!template?.id) {
      setError("Please save or load the template first so it has an ID.");
      return;
    }

    setUploading(true);
    try {
      const up = await apiUploadFile(file); // {savedFilename, originalFilename}
      const meta = await apiAddAttachment({
        template_id: template.id,
        file_name: up.originalFilename,                 // Hebrew display name
        file_url: `/attachments/${up.savedFilename}`,   // ASCII path
      });
      const next = { ...template, attachments: [...(template.attachments || []), meta] };
      setTemplate(next);
      setSuccess(`File ${meta.file_name} added.`);
    } catch (err) {
      console.error("Upload/Add failed:", err);
      setError("Failed to upload attachment.");
    } finally {
      setUploading(false);
      // clear input
      e.target.value = "";
    }
  };

  const handleDeleteAttachment = async (attId) => {
    if (!confirm(`Delete this attachment?`)) return;
    try {
      await apiDeleteAttachment(attId);
      const next = { ...template, attachments: (template.attachments || []).filter(a => a.id !== attId) };
      setTemplate(next);
      setSuccess("Attachment deleted.");
    } catch (e) {
      console.error("Delete failed", e);
      setError("Failed to delete attachment.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Email Template</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value={TABS.TEMPLATE}>Content</TabsTrigger>
          <TabsTrigger value={TABS.ATTACHMENTS}>Attachments</TabsTrigger>
        </TabsList>

        {/* ====== TEMPLATE TAB ====== */}
        <TabsContent value={TABS.TEMPLATE}>
          <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Email Template</h2>
              <div className="flex gap-4 items-center">

                {/* Recipients dropdown */}
                <div className="relative w-[300px]">
                  <Button onClick={() => setShowDropdown(prev => !prev)} variant="outline" className="w-full justify-between">
                    {testEmail.length > 0 ? `${testEmail.length} selected` : "Select Recipients"}
                    <span>{showDropdown ? "▲" : "▼"}</span>
                  </Button>
                  {showDropdown && (
                    <div className="absolute z-10 w-full mt-1 border rounded-md p-2 max-h-64 overflow-y-auto shadow-md bg-white">
                      <label className="block px-2 py-1 font-medium text-sm">Recipients</label>
                      <div className="border-t my-1" />
                      <label className="flex items-center px-2 py-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={testEmail.length === authorities.length}
                          onChange={(e) => setTestEmail(e.target.checked ? authorities.map(a => a.email) : [])}
                        />
                        <span className="ml-2 text-sm">Select All</span>
                      </label>
                      {authorities.map(auth => (
                        <label key={auth.id} className="flex items-center px-2 py-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={testEmail.includes(auth.email)}
                            onChange={(e) =>
                              setTestEmail(prev =>
                                e.target.checked ? [...prev, auth.email] : prev.filter(email => email !== auth.email)
                              )
                            }
                          />
                          <span className="ml-2 text-sm">{auth.name} ({auth.email})</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <Button onClick={handleSend} disabled={sending} className="bg-green-600 hover:bg-green-700">
                  {sending ? "Sending..." : (<><Send className="w-4 h-4 mr-2" /> Send Email</>)}
                </Button>

                <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Saving..." : "Save Template"}
                </Button>
              </div>
            </div>

            {error && <Alert variant="destructive" className="mb-6"><AlertDescription>{error}</AlertDescription></Alert>}
            {success && <Alert className="mb-6 bg-green-50 text-green-800 border-green-100"><AlertDescription>{success}</AlertDescription></Alert>}

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Email Subject</label>
                <Input
                  value={template.subject || ""}
                  onChange={(e) => setTemplate(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Enter email subject..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email Body</label>
                <div className="min-h-[400px] border rounded-md">
                  <ReactQuill
                    theme="snow"
                    value={template.body || ""}
                    onChange={(value) => setTemplate(prev => ({ ...prev, body: value }))}
                    className="h-[360px] rtl-body"
                  />
                </div>
              </div>

              <Alert className="bg-blue-50 border-blue-100">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  {(template.attachments?.length || 0) > 0
                    ? `This email will include ${template.attachments.length} attachment(s).`
                    : "No attachments currently added."}
                </AlertDescription>
              </Alert>
            </div>
          </Card>
        </TabsContent>

        {/* ====== ATTACHMENTS TAB ====== */}
        <TabsContent value={TABS.ATTACHMENTS}>
          <Card className="p-6 space-y-6">
            <h2 className="text-xl font-semibold mb-4">Current Attachments</h2>

            {/* Upload new attachment */}
            <div>
              <label className="block text-sm font-medium mb-2">Upload New Attachment</label>
              <label className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 border px-4 py-2 rounded cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>{uploading ? "Uploading..." : "Choose PDF"}</span>
                <input type="file" accept=".pdf" onChange={handleUpload} className="hidden" />
              </label>
            </div>

            {(template.attachments?.length || 0) === 0 ? (
              <p className="text-gray-500">No attachments found.</p>
            ) : (
              <ul className="space-y-2">
                {template.attachments.map((a) => (
                  <li key={a.id} className="flex justify-between items-center border rounded p-2">
                    <div>
                      <span className="font-medium">{a.file_name}</span>
                      <span className="text-gray-400 text-sm ml-2">{a.file_url}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteAttachment(a.id)}
                      className="text-red-500 hover:underline"
                    >
                      ❌
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
