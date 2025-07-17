import React, { useState } from 'react';
import { Button } from "@/component/ui/button";
import { Input } from "@/component/ui/input";
import ReactQuill from "react-quill";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/component/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/component/ui/popover";
import { Checkbox } from "@/component/ui/checkbox";
import { Loader2, ChevronsUpDown, Send, X } from "lucide-react";
import { Alert, AlertDescription } from "@/component/ui/alert";
import { Badge } from "@/component/ui/badge";
import FileUploader from "../template/FileUploader";
import { sendEmail } from "@/lib/emailSender";


// TODO: Make sure you import SendEmail function from your API lib
// import { SendEmail } from "@/lib/emailSender"; 

/**
 * Component for sending manual emails to selected authorities.
 */
export default function EmailSender({ authorities = [] }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [selectedAuthorities, setSelectedAuthorities] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  /**
   * Toggle selection of an authority by ID.
   */
  const handleToggleAuthority = (authorityId) => {
    setSelectedAuthorities((current) =>
      current.includes(authorityId)
        ? current.filter((id) => id !== authorityId)
        : [...current, authorityId]
    );
  };

  /**
   * Send email to all selected authorities (individually).
   */
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
        .filter((auth) => selectedAuthorities.includes(auth.id))
        .map((auth) => auth.email);


      for (const email of selectedEmails) {
        await sendEmail({
          to: email,
          subject,
          body,
          from_name: "Road Protect",
          reply_to: "harel@roadprotect.com"
        });
      }

      setSuccess(`Email sent to ${selectedEmails.length} recipient(s)`);
      setSubject("");
      setBody("");
      setAttachments([]);
      setSelectedAuthorities([]);
    } catch (err) {
      console.error("❌ Send failed:", err);
      setError("Failed to send email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Error & Success Messages */}
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

      {/* Recipients Selector */}
      <div>
        <label className="block text-sm font-medium mb-2">Recipients</label>
        <Popover open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              {selectedAuthorities.length > 0
                ? `${selectedAuthorities.length} selected`
                : "Select recipients..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0">
            <Command>
              <CommandInput placeholder="Search authorities..." />
              <CommandEmpty>No authority found.</CommandEmpty>
              <CommandGroup className="max-h-[300px] overflow-auto">
                {authorities.map((auth) => (
                  <CommandItem
                    key={auth.id}
                    onSelect={() => handleToggleAuthority(auth.id)}
                    className="flex items-center gap-2"
                  >
                    <Checkbox
                      checked={selectedAuthorities.includes(auth.id)}
                      className="h-4 w-4"
                    />
                    <span>{auth.name}</span>
                    <span className="text-xs text-gray-500 ml-auto">{auth.email}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Badges for Selected Authorities */}
        {selectedAuthorities.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {authorities
              .filter((auth) => selectedAuthorities.includes(auth.id))
              .map((auth) => (
                <Badge
                  key={auth.id}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => handleToggleAuthority(auth.id)}
                >
                  {auth.name}
                  <X className="ml-1 h-3 w-3" />
                </Badge>
              ))}
          </div>
        )}
      </div>

      {/* Subject */}
      <div>
        <label className="block text-sm font-medium mb-2">Subject</label>
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Enter subject..."
        />
      </div>

      {/* Message Body */}
      <div>
        <label className="block text-sm font-medium mb-2">Message</label>
        <div className="min-h-[200px] border rounded-md">
          <ReactQuill value={body} onChange={setBody} className="h-[160px] rtl-body" />
        </div>
      </div>

      {/* File Attachments */}
      <div>
        <label className="block text-sm font-medium mb-2">Attachments</label>
        <FileUploader attachments={attachments} onChange={setAttachments} />
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
