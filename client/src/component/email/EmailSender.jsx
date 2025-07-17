import React, { useState } from 'react';
import { Button } from "@/component/ui/button";
import { Input } from "@/component/ui/input";
import ReactQuill from "react-quill";
import { Checkbox } from "@/component/ui/checkbox";
import { Loader2, Send, X } from "lucide-react";
import { Alert, AlertDescription } from "@/component/ui/alert";
import { Badge } from "@/component/ui/badge";
import FileUploader from "../template/FileUploader";
import { sendEmail } from "@/lib/emailSender"; 

/**
 * EmailSender Component
 * Handles manual email sending with subject, message, attachments, and recipient selection.
 * 
 * @param {Object[]} authorities - List of all available authorities { id, name, email }
 */
export default function EmailSender({ authorities = [] }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [selectedAuthorities, setSelectedAuthorities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  /** Toggle selection of authority by ID */
  const handleSelectAuthority = (authorityId) => {
    setSelectedAuthorities((prev) =>
      prev.includes(authorityId)
        ? prev.filter(id => id !== authorityId)
        : [...prev, authorityId]
    );
  };

  /** Remove authority from selected list */
  const handleRemoveAuthority = (authorityId) => {
    setSelectedAuthorities((prev) =>
      prev.filter(id => id !== authorityId)
    );
  };

  /** Trigger email sending */
  const handleSendEmail = async () => {
    setError(null);
    setSuccess(null);

    if (!subject.trim() || !body.trim()) {
      return setError("Please fill in both subject and body");
    }

    if (selectedAuthorities.length === 0) {
      return setError("Please select at least one recipient");
    }

    setLoading(true);
    try {
      const selectedEmails = authorities
        .filter(auth => selectedAuthorities.includes(auth.id))
        .map(auth => auth.email);

      // Send each email individually
      for (const email of selectedEmails) {
        await sendEmail({
          to: email,
          subject,
          body,
          from_name:fromName
        });
      }

      setSuccess(`Email sent to ${selectedEmails.length} recipient(s).`);
      setSubject("");
      setBody("");
      setAttachments([]);
      setSelectedAuthorities([]);
    } catch (err) {
      console.error("Email send error:", err);
      setError("Failed to send email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="bg-green-50 text-green-800 border-green-100">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Recipients */}
      <div>
        <label className="block text-sm font-medium mb-2">Recipients</label>
        <div className="space-y-4">
          <div className="max-h-[200px] overflow-auto border rounded-md p-2">
            {authorities.length === 0 ? (
              <p className="text-center text-gray-500 p-4">
                No authorities available
              </p>
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

          {/* Selected Badges */}
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

      {/* Subject */}
      <div>
        <label className="block text-sm font-medium mb-2">Subject</label>
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Enter email subject..."
        />
      </div>

      {/* Body */}
      <div>
        <label className="block text-sm font-medium mb-2">Message</label>
        <div className="min-h-[200px] border rounded-md">
          <ReactQuill
            value={body}
            onChange={setBody}
            className="h-[160px]"
            style={{ direction: "rtl", textAlign: "right" }}
            modules={{
              toolbar: [
                ["bold", "italic", "underline"],
                [{ list: "ordered" }, { list: "bullet" }],
                ["link"]
              ]
            }}
          />
        </div>
      </div>

      {/* Attachments */}
      <div>
        <label className="block text-sm font-medium mb-2">Attachments</label>
        <FileUploader
          attachments={attachments}
          onChange={setAttachments}
        />
      </div>

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
  );
}
