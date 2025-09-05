import React, { useState, useEffect } from 'react';
import { Card } from "@/component/ui/card";
import { Button } from "@/component/ui/button";
import { Input } from "@/component/ui/input";
import ReactQuill from "react-quill";
import { Loader2, Send, X, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/component/ui/alert";
import { Badge } from "@/component/ui/badge";
import { sendEmail } from "@/lib/emailSender";
import {API_BASE_URL} from "@/config";

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

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/customers`, {
        credentials: 'include',
      });
      const data = await res.json();

      if (!Array.isArray(data)) throw new Error("Invalid response format");

      // ensure valid {name,email}
      const valid = data.filter(item => item.name && item.email);

      setAuthorities(valid); // or setRecipients if you renamed the state
    } catch (err) {
      console.error("Failed to load customers:", err);
      setAuthorities([]); // or setRecipients([])
    }
  };  
  // helper fns inside the component:
  const fileInputId = "manual-attachments-input"; 
  const onAddFiles = (e) => {
    const chosen = Array.from(e.target.files || []);
    // de-dup by name+size
    const key = (f) => `${f.name}_${f.size}`;
    const existing = new Set(attachments.map(key));
    const merged = [...attachments, ...chosen.filter(f => !existing.has(key(f)))];
    setAttachments(merged);
    e.target.value = ""; // allow same file to be re-picked
  };

  const removeFileAt = (idx) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSendEmail = async () => {
    if (!subject || !body) { setError("Please fill in both subject and body"); return; }
    if (selectedAuthorities.length === 0) { setError("Please select at least one recipient"); return; }

    setLoading(true); setError(null); setSuccess(null);

    try {
      const selectedRecipients = authorities
        .filter(auth => selectedAuthorities.includes(auth.id))
        .map(auth => ({ email: auth.email, name: auth.name }));

      await sendEmail({
        to: selectedRecipients,
        subject,
        body,
        attachments,            // <-- File[] (one-time)
        from_name: fromName,
        reply_to: replyTo,
        include_attachments: false // IMPORTANT: don’t pull DB/template attachments
      });

      setSuccess(`Email sent successfully to ${selectedRecipients.length} recipient(s)`);
      setAttachments([]);
    } catch (err) {
      console.error("Send email error:", err);
      setError(err.message || "Failed to send email.");
    } finally {
      setLoading(false);
    }
  };


  const handleRemoveAuthority = (authorityId) => {
    setSelectedAuthorities(selectedAuthorities.filter(id => id !== authorityId));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Mail to customers</h1>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-6">Send Custom Email to customers</h2>

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

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Customers</label>
            <div className="relative w-full">
              <Button
                onClick={() => setShowDropdown(prev => !prev)}
                variant="outline"
                className="w-full justify-between"
              >
                {selectedAuthorities.length > 0 
                  ? `${selectedAuthorities.length} recipient(s) selected`
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
                      checked={selectedAuthorities.length === authorities.length}
                      onChange={(e) =>
                        setSelectedAuthorities(e.target.checked ? authorities.map(a => a.id) : [])
                      }
                    />
                    <span className="ml-2 text-sm">Select All</span>
                  </label>

                  {authorities.map(auth => (
                    <label key={auth.id} className="flex items-center px-2 py-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedAuthorities.includes(auth.id)}
                        onChange={(e) =>
                          setSelectedAuthorities(prev =>
                            e.target.checked
                              ? [...prev, auth.id]
                              : prev.filter(id => id !== auth.id)
                          )
                        }
                      />
                      <span className="ml-2 text-sm">{auth.name} ({auth.email})</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

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

          <div>
            <label className="block text-sm font-medium mb-2">Subject</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter email subject..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Message</label>
            <div className="min-h-[200px] border rounded-md">
              <ReactQuill
                value={body}
                onChange={setBody}
                className="h-[160px]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById(fileInputId)?.click()}
              >
                + Add attachment
              </Button>
              <input
                id={fileInputId}
                type="file"
                multiple
                hidden
                onChange={onAddFiles}
                // optional: accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.zip"
              />
              {attachments.length > 0 && (
                <Badge variant="secondary">{attachments.length} file(s) selected</Badge>
              )}
            </div>

            {attachments.length > 0 && (
              <ul className="divide-y rounded border">
                {attachments.map((f, idx) => (
                  <li key={idx} className="flex items-center justify-between p-2 text-sm">
                    <span className="truncate">
                      {f.name} <span className="opacity-60">({(f.size/1024).toFixed(1)} KB)</span>
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-red-600"
                      onClick={() => removeFileAt(idx)}
                    >
                      <X className="h-4 w-4 mr-1" /> Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>


          <Button
            onClick={handleSendEmail}
            disabled={loading || selectedAuthorities.length === 0}
            className="w-full"
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
      </Card>
    </div>
  );
}
