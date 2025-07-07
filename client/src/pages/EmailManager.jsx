import React, { useState, useEffect, useCallback } from "react";
import { Card } from "@/component/ui/card";
import { Button } from "@/component/ui/button";
import { Input } from "@/component/ui/input";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { AlertCircle, Save, Send, Info, Upload } from "lucide-react";
import { Alert, AlertDescription } from "@/component/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/component/ui/tabs";
import { sendEmail } from "@/lib/emailSender";
import { getEmailTemplate, saveEmailTemplate } from "@/lib/emailTemplates";
import { API_BASE_URL } from "../config"; 

const TABS = {
  TEMPLATE: "template",
  ATTACHMENTS: "attachments",
};

export default function EmailManager() {
  const [template, setTemplate] = useState({ subject: "", body: "", attachments: [], from_name: "", reply_to: "", is_active: true });
  const [authorities, setAuthorities] = useState([]);
  const [testEmail, setTestEmail] = useState([]);
  const [activeTab, setActiveTab] = useState(TABS.TEMPLATE);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [serverAttachments, setServerAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);

  const loadTemplate = useCallback(async () => {
    try {
      const data = await getEmailTemplate();
      if (data) setTemplate(prev => ({ ...prev, ...data }));
      setLoaded(true);
    } catch (err) {
      console.error("❌ Failed to load template:", err);
      setLoaded(true);
    }
  }, []);

  const loadAttachments = async () => {
  try {
    console.log("📥 Fetching attachments from:", `${API_BASE_URL}/email/attachments`);

    const res = await fetch(`${API_BASE_URL}/email/attachments`, {
      credentials: 'include'
    });

    console.log("📤 Response status:", res.status);

    const text = await res.text();
    console.log("📦 Raw response:", text);

    if (!res.ok) throw new Error(`HTTP ${res.status} - ${text}`);

    const data = JSON.parse(text);
    if (!Array.isArray(data)) {
      console.error("🚫 Invalid format from server:", data);
      throw new Error("Server returned unexpected format");
    }

    setServerAttachments(data);
  } catch (err) {
    console.error("❌ Failed to load attachments:", err);
    setServerAttachments([]);
    setError("Could not fetch attachments. Check console logs.");
  }
};


  useEffect(() => {
    loadTemplate();
    loadAttachments();

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

    fetchAuthorities(); 
  }, []);


  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      if (!template.subject) throw new Error("Please fill in the subject");
      await saveEmailTemplate({ ...template });
      setSuccess("Template saved successfully");
    } catch (err) {
      setError(err.message || "Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    try {
      setSending(true);
      setError(null);
      setSuccess(null);
      if (!template.subject || !template.body || testEmail.length === 0) {
        throw new Error("Please fill subject, body, and select recipients.");
      }
      await sendEmail({
        to: testEmail,
        subject: template.subject,
        body: template.body,
        attachments: template.attachments,
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

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await fetch(`${API_BASE_URL}/email/upload-attachment`, {
        method: "POST",
        body: formData,
        credentials: 'include'
      });
      await loadAttachments();
      setSuccess(`File ${file.name} uploaded successfully!`);
    } catch (err) {
      console.error("Upload failed:", err);
      setError("Failed to upload attachment.");
    } finally {
      setUploading(false);
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

                <Button onClick={handleSend} className="bg-green-600 hover:bg-green-700">
                  <Send className="w-4 h-4 mr-2" /> Send Email
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
                    value={template.body}
                    onChange={(value) => setTemplate(prev => ({ ...prev, body: value }))}
                    className="h-[360px]"
                  />
                </div>
              </div>

              <Alert className="bg-blue-50 border-blue-100">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  {serverAttachments.length > 0
                    ? `This email will include ${serverAttachments.length} attachment(s).`
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
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleUpload}
                  className="hidden"
                />
              </label>
            </div>

            {serverAttachments.length === 0 ? (
              <p className="text-gray-500">No attachments found.</p>
            ) : (
              <ul className="space-y-2">
                {serverAttachments.map((file, idx) => (
                  <li key={idx} className="flex justify-between border rounded p-2">
                    <span>{file.name}</span>
                    <span className="text-gray-400 text-sm">{file.sizeKB} KB</span>
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
