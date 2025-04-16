import React, { useState, useEffect, useCallback } from "react";
import { Card } from "@/component/ui/card";
import { Button } from "@/component/ui/button";
import { Input } from "@/component/ui/input";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

import { AlertCircle, Save, Send, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/component/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/component/ui/tabs";
import { sendEmail } from "@/lib/emailSender";

import { AttachmentTab } from "../component/template/AttachmentManager";
import { getEmailTemplate, saveEmailTemplate } from "@/lib/emailTemplates";

const TABS = {
  TEMPLATE: "template",
  ATTACHMENTS: "attachments",
  SENDER: "sender", // Reserved for future
};

/**
 * EmailManager handles:
 * - Loading/saving email template
 * - Editing subject/body
 * - Selecting test recipients
 * - Triggering test send
 */
export default function EmailManager() {
  // ========== STATE ========== //
  const [template, setTemplate] = useState({
    subject: "",
    body: "",
    attachments: [],
    is_active: true,
    from_name: "",
    reply_to: ""
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

  // ========== LOAD TEMPLATE + AUTHORITIES ========== //
  const loadTemplate = useCallback(async () => {
    try {
      const data = await getEmailTemplate();
      if (data) {
        setTemplate((prev) => ({
          ...prev,
          subject: data.subject || "",
          body: data.body || "",
          attachments: data.attachments || [],
          is_active: data.is_active ?? true,
          from_name: data.from_name || "",
          reply_to: data.reply_to || "",
          id: data.id,
        }));
      }
      setLoaded(true);
    } catch (err) {
      console.error("❌ Failed to load template:", err);
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadTemplate();
    const fetchAuthorities = async () => {
      try {
        // TEMP MOCK for testing without DB
        const mockData = [
          { id: 1, name: "City Hall", email: "harel.jerbi1@gmail.com" },
          { id: 2, name: "Water Authority", email: "shai@roadprotect.co.il" },
          { id: 3, name: "Fire Dept", email: "fire@example.com" }
        ];
        setAuthorities(mockData);
      } catch (err) {
        console.error("Failed to load mock authorities:", err);
      }
    };
    
    fetchAuthorities();
  }, []);

  // ========== SAVE TEMPLATE ========== //
  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      if (!template.subject) throw new Error("Please fill in the subject");

      const dataToSave = {
        subject: template.subject,
        body: template.body,
        attachments: template.attachments || [],
        is_active: template.is_active,
        from_name: template.from_name || "",
        reply_to: template.reply_to || "",
      };

      await saveEmailTemplate(dataToSave);
      setSuccess("Template saved successfully");
    } catch (err) {
      setError(err.message || "Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  // ========== SEND TEST EMAIL ========== //
  const handleSend = async () => {
    try {
      setSending(true);
      setError(null);
      setSuccess(null);
  
      if (!template.subject || !template.body || testEmail.length === 0) {
        throw new Error("Please fill subject, body, and select recipients.");
      }
      console.log("📤 Sending payload:", {
        to: testEmail,
        subject: template.subject,
        body: template.body,
        attachments: template.attachments,
        from_name: template.from_name,
        reply_to: template.reply_to
      });
  
      await sendEmail({
        to: testEmail,
        subject: template.subject,
        body: template.body,
        from_name: template.from_name,
        reply_to: template.reply_to
      });
  
      setSuccess("Email sent successfully!");
    } catch (err) {
      console.error("Send error:", err);
      setError(err.message || "Failed to send email.");
    } finally {
      setSending(false);
    }
  };

  // ========== RENDER ========== //
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Email Template</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value={TABS.TEMPLATE}>Content</TabsTrigger>
          <TabsTrigger value={TABS.ATTACHMENTS}>Attachments</TabsTrigger>
          <TabsTrigger value={TABS.SENDER}>Sender Settings</TabsTrigger>
        </TabsList>

        {/* ==================== TEMPLATE TAB ==================== */}
        <TabsContent value={TABS.TEMPLATE}>
          <Card className="p-6">
            {/* Toolbar */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Email Template</h2>
              <div className="flex gap-4 items-center">

                {/* Recipients Dropdown */}
                <div className="relative w-[300px]">
                  <Button
                    onClick={() => setShowDropdown(prev => !prev)}
                    variant="outline"
                    className="w-full justify-between"
                  >
                    Select Recipients <span>{showDropdown ? "▲" : "▼"}</span>
                  </Button>

                  {showDropdown && (
                    <div className="absolute z-10 w-full mt-1 border rounded-md p-2 max-h-64 overflow-y-auto shadow-md bg-white">
                      <label className="block px-2 py-1 font-medium text-sm">Recipients</label>
                      <div className="border-t my-1" />

                      {/* Select All */}
                      <label className="flex items-center px-2 py-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={testEmail.length === authorities.length}
                          onChange={(e) =>
                            setTestEmail(e.target.checked ? authorities.map(a => a.email) : [])
                          }
                        />
                        <span className="ml-2 text-sm">Select All</span>
                      </label>

                      {/* Individual Authorities */}
                      {authorities.map(auth => (
                        <label key={auth.id} className="flex items-center px-2 py-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={testEmail.includes(auth.email)}
                            onChange={(e) =>
                              setTestEmail(prev =>
                                e.target.checked
                                  ? [...prev, auth.email]
                                  : prev.filter(email => email !== auth.email)
                              )
                            }
                          />
                          <span className="ml-2 text-sm">
                            {auth.name} ({auth.email})
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <Button onClick={handleSend} className="bg-green-600 hover:bg-green-700">
                  <Send className="w-4 h-4 mr-2" />
                  Send Email
                </Button>

                <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Saving..." : "Save Template"}
                </Button>
              </div>
            </div>

            {/* Alerts */}
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="mb-6 bg-green-50 text-green-800 border-green-100">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            {/* Subject + Body */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Email Subject</label>
                <Input
                  value={template.subject || ""}
                  onChange={(e) =>
                    setTemplate((prev) => ({ ...prev, subject: e.target.value }))
                  }
                  placeholder="Enter email subject..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email Body</label>
                <div className="min-h-[400px] border rounded-md">
                  <ReactQuill
                    theme="snow"
                    value={template.body}
                    onChange={(value) =>
                      setTemplate((prev) => ({ ...prev, body: value }))
                    }
                    className="h-[360px]"
                  />
                </div>
              </div>

              {/* Attachment Note */}
              <Alert className="bg-blue-50 border-blue-100">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  {template.attachments?.length > 0
                    ? `This email will include ${template.attachments.length} attachment(s). You can manage them in the Attachments tab.`
                    : "No attachments will be included with this email. Add attachments in the Attachments tab."}
                </AlertDescription>
              </Alert>
            </div>
          </Card>
        </TabsContent>

        {/* ==================== ATTACHMENTS TAB ==================== */}
        <TabsContent value={TABS.ATTACHMENTS}>
          <AttachmentTab
            template={template}
            setTemplate={setTemplate}
            onSend={handleSend}
          />
        </TabsContent>

        {/* (Optional Future) SENDER TAB */}
        <TabsContent value={TABS.SENDER}>
          <Card className="p-6 text-sm text-gray-600">Sender configuration coming soon.</Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
