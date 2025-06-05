import React, { useState, useEffect } from 'react';
import { Card } from "@/component/ui/card";
import { Button } from "@/component/ui/button";
import { Input } from "@/component/ui/input";
import ReactQuill from "react-quill";
import { Loader2, Send, X, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/component/ui/alert";
import { Badge } from "@/component/ui/badge";
import { sendEmail } from "@/lib/emailSender";

export default function ManualEmail() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [selectedAuthorities, setSelectedAuthorities] = useState([]);
  const [authorities, setAuthorities] = useState([]);
  const [fromName, setFromName] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    loadAuthorities();
  }, []);

  const loadAuthorities = async () => {
    try {
      const res = await fetch("/api/clients");
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("Invalid response format");
      const valid = data.filter(item => item.name && item.email);
      const combined = {};
      for (const auth of valid) {
        if (combined[auth.email]) {
          combined[auth.email].name += `, ${auth.name}`;
        } else {
          combined[auth.email] = { ...auth };
        }
      }
      setAuthorities(Object.values(combined));
    } catch (err) {
      console.error("Failed to load authorities:", err);
      setAuthorities([]);
    }
  };

  const handleSendEmail = async () => {
    if (!subject || !body) {
      setError("Please fill in both subject and body");
      return;
    }
    if (selectedAuthorities.length === 0) {
      setError("Please select at least one recipient");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const selectedEmails = authorities
        .filter(auth => selectedAuthorities.includes(auth.id))
        .map(auth => auth.email);

      await sendEmail({
        to: selectedEmails,
        subject,
        body,
        attachments,
        from_name: fromName,
        reply_to: replyTo
      });

      setSuccess(`Email sent successfully to ${selectedEmails.length} recipient(s)`);
    } catch (err) {
      console.error("Send email error:", err);
      setError(err.message || "Failed to send email.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAuthority = (authorityId) => {
    if (selectedAuthorities.includes(authorityId)) {
      setSelectedAuthorities(selectedAuthorities.filter(id => id !== authorityId));
    } else {
      setSelectedAuthorities([...selectedAuthorities, authorityId]);
    }
  };

  const handleRemoveAuthority = (authorityId) => {
    setSelectedAuthorities(selectedAuthorities.filter(id => id !== authorityId));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Manual Email</h1>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-6">Send Custom Email</h2>

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
            <label className="block text-sm font-medium mb-2">Recipients</label>
            <div className="relative w-full">
              <Button
                onClick={() => setShowDropdown(prev => !prev)}
                variant="outline"
                className="w-full justify-between"
              >
                {selectedAuthorities.length > 0 
                  ? `${selectedAuthorities.length} recipient(s) selected`
                  : "Select Recipients"}
                <span>{showDropdown ? "▲" : "▼"}</span>
              </Button>

              {showDropdown && (
                <div className="absolute z-10 w-full mt-1 border rounded-md p-2 max-h-64 overflow-y-auto shadow-md bg-white">
                  <label className="block px-2 py-1 font-medium text-sm">Recipients</label>
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

          <Alert className="bg-blue-50 border-blue-100">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              This email will use the attachments from your template.
              {attachments?.length > 0
                ? ` Currently ${attachments.length} file(s) will be attached.`
                : " Currently no files are attached."}
            </AlertDescription>
          </Alert>

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
