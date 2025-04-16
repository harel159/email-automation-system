import React, { useState, useEffect } from 'react';
import { Card } from "@/component/ui/card";
import { Button } from "@/component/ui/button";
import { Input } from "@/component/ui/input";
import ReactQuill from "react-quill";
import { Checkbox } from "@/component/ui/checkbox";
import { Loader2, Send, X, Copy, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/component/ui/alert";
import { Badge } from "@/component/ui/badge";
import { sendEmail } from "@/lib/emailSender"; 



/**
 * ManualEmail – allows sending a one-time custom email to selected authorities.
 * Includes subject/body/attachments and uses preloaded template defaults.
 */
export default function ManualEmail() {
  // ========== STATE ========== //
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [selectedAuthorities, setSelectedAuthorities] = useState([]);
  const [authorities, setAuthorities] = useState([]);

  const [template, setTemplate] = useState(null);
  const [fromName, setFromName] = useState("");
  const [replyTo, setReplyTo] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // ========== LOAD TEMPLATE + AUTHORITIES ========== //
  useEffect(() => {
    loadAuthorities();
    loadTemplate();
  }, []);

  const loadAuthorities = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/clients");
      const data = await res.json();
      setAuthorities(data || []);
    } catch (err) {
      console.error("Failed to load authorities:", err);
      setAuthorities([]);
    }
  };
  const loadTemplate = async () => {
    try {
      const templates = await EmailTemplate.list(); 
      if (templates && templates.length > 0) {
        const activeTemplate = templates.find(t => t.is_active) || templates[0];
        setTemplate(activeTemplate);
        setAttachments(activeTemplate.attachments || []);
        setFromName(activeTemplate.from_name || "");
        setReplyTo(activeTemplate.reply_to || "");
      }
    } catch (err) {
      console.error("Failed to load template:", err);
    }
  };

  // ========== ACTIONS ========== //

  // Fill subject/body from loaded template
  const handleUseTemplate = () => {
    if (template) {
      setSubject(template.subject || "");
      setBody(template.body || "");
    }
  };

  // Toggle single recipient selection
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
        attachments, // ✅ full list, no slicing
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
  

  // ========== UI ========== //
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Manual Email</h1>
        {template && (
          <Button onClick={handleUseTemplate} variant="outline">
            <Copy className="w-4 h-4 mr-2" />
            Use Template Content
          </Button>
        )}
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-6">Send Custom Email</h2>

        {/* Status Alerts */}
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
          {/* Recipients Section */}
          <div>
            <label className="block text-sm font-medium mb-2">Recipients</label>
            <div className="space-y-4">
              <div className="max-h-[200px] overflow-auto border rounded-md p-2">
                {authorities.length === 0 ? (
                  <p className="text-center text-gray-500 p-4">No authorities available</p>
                ) : (
                  authorities.map(authority => (
                    <div
                      key={authority.id}
                      className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded"
                    >
                      <Checkbox
                        id={`authority-${authority.id}`}
                        checked={selectedAuthorities.includes(authority.id)}
                        onCheckedChange={() => handleSelectAuthority(authority.id)}
                      />
                      <label
                        htmlFor={`authority-${authority.id}`}
                        className="flex-1 flex justify-between cursor-pointer"
                      >
                        <span>{authority.name}</span>
                        <span className="text-gray-500 text-sm">{authority.email}</span>
                      </label>
                    </div>
                  ))
                )}
              </div>

              {/* Selected Recipients (badges) */}
              {selectedAuthorities.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {authorities
                    .filter(auth => selectedAuthorities.includes(auth.id))
                    .map(auth => (
                      <Badge key={auth.id} variant="secondary" className="flex items-center gap-1">
                        {auth.name}
                        <button
                          onClick={() => handleRemoveAuthority(auth.id)}
                          className="ml-1 rounded-full hover:bg-gray-200 p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
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

          {/* Subject & Body */}
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

          {/* Attachment Note */}
          <Alert className="bg-blue-50 border-blue-100">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              This email will use the attachments from your template.
              {attachments?.length > 0
                ? ` Currently ${attachments.length} file(s) will be attached.`
                : " Currently no files are attached."}
            </AlertDescription>
          </Alert>

          {/* Send Button */}
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
