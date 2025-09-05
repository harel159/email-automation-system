import React, { useState, useEffect, useRef } from "react";
import { Card } from "@/component/ui/card";
import { Button } from "@/component/ui/button";
import { Input } from "@/component/ui/input";
import ReactQuill from "react-quill";
import { Loader2, Send, X } from "lucide-react";
import { Alert, AlertDescription } from "@/component/ui/alert";
import { Badge } from "@/component/ui/badge";
import { sendEmail } from "@/lib/emailSender";
import { API_BASE_URL } from "@/config";

export default function ManualEmail() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [selectedAuthorities, setSelectedAuthorities] = useState([]);
  const [authorities, setAuthorities] = useState([]);
  const [fromName, setFromName] = useState("My company");
  const [replyTo, setReplyTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/customers`, { credentials: "include" });
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("Invalid response format");
      const valid = data.filter((item) => item.name && item.email);
      setAuthorities(valid);
    } catch (err) {
      console.error("Failed to load customers:", err);
      setAuthorities([]);
    }
  };

  // pick files
  const handlePickFiles = () => fileInputRef.current?.click();
  const onFilesChosen = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const key = (f) => `${f.name}_${f.size}`;
    const existing = new Set(attachments.map(key));
    setAttachments((prev) => [...prev, ...files.filter((f) => !existing.has(key(f)))]);
    e.target.value = ""; // allow re-pick same file later
  };
  const removeFileAt = (idx) => setAttachments((prev) => prev.filter((_, i) => i !== idx));

  // build recipients
  const buildRecipients = () =>
    authorities
      .filter((a) => selectedAuthorities.includes(a.id))
      .map((a) => ({ email: a.email, name: a.name }));

  // send (auto FormData when files exist)
  const handleSendEmail = async () => {
    try {
      setError(null);
      setSuccess(null);

      if (!subject || !body) throw new Error("Please fill in both subject and body.");
      if (selectedAuthorities.length === 0) throw new Error("Please select at least one recipient.");

      setLoading(true);

      const to = buildRecipients();
      if (attachments.length > 0) {
        // multipart with attachments
        const fd = new FormData();
        fd.append(
          "json",
          JSON.stringify({
            to,
            subject,
            body,
            from_name: fromName,
            reply_to: replyTo,
            include_attachments: false, // don't pull template attachments
          })
        );
        attachments.forEach((f) => fd.append("attachments", f));

        const res = await fetch(`${API_BASE_URL}/email/send-all-token`, {
          method: "POST",
          headers: { Authorization: `Bearer ${import.meta.env.VITE_EMAIL_API_TOKEN}` },
          body: fd,
        });
        if (!res.ok) throw new Error(await res.text());
        await res.json();
      } else {
        // no files -> use JSON helper
        await sendEmail({
          to,
          subject,
          body,
          from_name: fromName,
          reply_to: replyTo,
        });
      }

      setSuccess(`Email sent successfully to ${to.length} recipient(s).`);
      setAttachments([]);
    } catch (err) {
      console.error("Send email error:", err);
      setError(err?.message || "Failed to send email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Greeting Customers</h1>
      </div>

      <Card className="p-6">
        {/* Top bar: Recipients on left, actions on right (match EmailManager style) */}
        <div className="flex justify-between items-center mb-6">
          {/* Recipients dropdown */}
          <div className="relative w-[300px]">
            <Button
              onClick={() => setShowDropdown((prev) => !prev)}
              variant="outline"
              className="w-full justify-between"
            >
              {selectedAuthorities.length > 0
                ? `${selectedAuthorities.length} customer(s) selected`
                : "Select Customers"}
              <span>{showDropdown ? "▲" : "▼"}</span>
            </Button>

            {showDropdown && (
              <div className="absolute z-10 w-full mt-1 border rounded-md p-2 max-h-64 overflow-y-auto shadow-md bg-white">
                <label className="block px-2 py-1 font-medium text-sm">Customers</label>
                <div className="border-t my-1" />

                <label className="flex items-center px-2 py-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedAuthorities.length === authorities.length && authorities.length > 0}
                    onChange={(e) =>
                      setSelectedAuthorities(e.target.checked ? authorities.map((a) => a.id) : [])
                    }
                  />
                  <span className="ml-2 text-sm">Select All</span>
                </label>

                {authorities.map((auth) => (
                  <label key={auth.id} className="flex items-center px-2 py-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedAuthorities.includes(auth.id)}
                      onChange={(e) =>
                        setSelectedAuthorities((prev) =>
                          e.target.checked ? [...prev, auth.id] : prev.filter((id) => id !== auth.id)
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

          {/* Actions (top-right) */}
          <div className="flex items-center gap-2">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={onFilesChosen}
            />

            <Button
              type="button"
              onClick={handlePickFiles}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              + Add attachment
            </Button>

            <Button
              type="button"
              onClick={handleSendEmail}
              disabled={loading || selectedAuthorities.length === 0}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Email
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Selected files as chips under the top bar */}
        {attachments.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {attachments.map((f, idx) => (
              <Badge key={`${f.name}-${idx}`} variant="secondary" className="flex items-center gap-2">
                <span className="truncate max-w-[220px]">{f.name}</span>
                <X
                  className="h-3.5 w-3.5 cursor-pointer opacity-70 hover:opacity-100"
                  onClick={() => removeFileAt(idx)}
                />
              </Badge>
            ))}
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="mb-6 bg-green-50 text-green-800 border-green-100">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Sender Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Sender Name</label>
            <Input
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              placeholder="Your name or company name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Reply-To Email</label>
            <Input
              type="email"
              value={replyTo}
              onChange={(e) => setReplyTo(e.target.value)}
              placeholder="Your email address for replies"
            />
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium mb-2">Subject</label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Enter email subject..."
          />
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium mb-2">Message</label>
          <div className="min-h-[200px] border rounded-md">
            <ReactQuill value={body} onChange={setBody} className="h-[160px]" />
          </div>
        </div>
      </Card>
    </div>
  );
}
