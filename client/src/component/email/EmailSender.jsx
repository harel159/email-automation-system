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

export default function EmailSender({ authorities = [] }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [selectedAuthorities, setSelectedAuthorities] = useState([]);
  const [fromName, setFromName] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleToggleAuthority = (authorityId) => {
    setSelectedAuthorities((current) =>
      current.includes(authorityId)
        ? current.filter((id) => id !== authorityId)
        : [...current, authorityId]
    );
  };

  const handleRemoveAuthority = (authorityId) => {
    setSelectedAuthorities((prev) =>
      prev.filter(id => id !== authorityId)
    );
  };

  const handleSendEmail = async () => {
    setError(null);
    setSuccess(null);

    if (!subject.trim() || !body.trim()) {
      return setError("Please fill in both subject and body.");
    }

    if (selectedAuthorities.length === 0) {
      return setError("Please select at least one recipient.");
    }

    setLoading(true);
    try {
      const selectedList = authorities.filter(auth =>
        selectedAuthorities.includes(auth.id)
      );

      for (const auth of selectedList) {
        const dynamicSubject = `${subject} – ${auth.name}`;
        await sendEmail({
          to: [{ email: auth.email, name: auth.name }],
          subject: dynamicSubject,
          body,
          from_name: fromName,
          reply_to: replyTo
        });
      }

      setSuccess(`Email sent to ${selectedList.length} recipient(s).`);
      setSubject("");
      setBody("");
      setAttachments([]);
      setSelectedAuthorities([]);
      setFromName("");
      setReplyTo("");
    } catch (err) {
      console.error("❌ Email send error:", err);
      setError("Failed to send email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Error / Success */}
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

      {/* Recipients Dropdown */}
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

        {/* Selected Badges */}
        {selectedAuthorities.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {authorities
              .filter((auth) => selectedAuthorities.includes(auth.id))
              .map((auth) => (
                <Badge
                  key={auth.id}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => handleRemoveAuthority(auth.id)}
                >
                  {auth.name}
                  <X className="ml-1 h-3 w-3" />
                </Badge>
              ))}
          </div>
        )}
      </div>

      {/* From Name */}
      <div>
        <label className="block text-sm font-medium mb-2">From Name</label>
        <Input
          value={fromName}
          onChange={(e) => setFromName(e.target.value)}
          placeholder="e.g. Road Protect"
        />
      </div>

      {/* Reply-To */}
      <div>
        <label className="block text-sm font-medium mb-2">Reply-To Address</label>
        <Input
          value={replyTo}
          onChange={(e) => setReplyTo(e.target.value)}
          placeholder="e.g. support@roadprotect.com"
        />
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

      {/* Message */}
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
