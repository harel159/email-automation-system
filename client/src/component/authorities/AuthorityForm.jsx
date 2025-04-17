import React from "react";
import { Input } from "@/component/ui/input";
import { Button } from "@/component/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/component/ui/select";

// Constants
const SEND_DAY_OPTIONS = Array.from({ length: 28 }, (_, i) => i + 1);

/**
 * AuthorityForm – used for both add & edit
 * @param {object} authority – the existing authority to edit (if any)
 * @param {function} onSubmit – callback when submitting the form
 * @param {function} onCancel – callback when clicking cancel
 */
export default function AuthorityForm({ authority, onSubmit, onCancel }) {
  const [formData, setFormData] = React.useState(authority || {
    name: "",
    email: "",
    send_date: 1,
    status: "active"
  });

  // Internal form handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await onSubmit(formData);
    } catch (err) {
      console.error("❌ Error submitting authority form:", err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Authority Name */}
      <div>
        <label htmlFor="authority-name" className="block text-sm font-medium mb-2">
          Authority Name
        </label>
        <Input
          id="authority-name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Enter authority name"
          required
        />
      </div>

      {/* Email Address */}
      <div>
        <label htmlFor="authority-email" className="block text-sm font-medium mb-2">
          Email Address
        </label>
        <Input
          id="authority-email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="Enter email address"
          required
        />
      </div>

      {/* Send Day */}
      <div>
        <label htmlFor="send-day" className="block text-sm font-medium mb-2">
          Send Date (Day of Month)
        </label>
        <Select
          value={formData.send_date.toString()}
          onValueChange={(value) =>
            setFormData({ ...formData, send_date: parseInt(value) })
          }
        >
          <SelectTrigger id="send-day">
            <SelectValue placeholder="Select day of month" />
          </SelectTrigger>
          <SelectContent>
            {SEND_DAY_OPTIONS.map((day) => (
              <SelectItem key={day} value={day.toString()}>
                Day {day}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status */}
      <div>
        <label htmlFor="status" className="block text-sm font-medium mb-2">
          Status
        </label>
        <Select
          value={formData.status}
          onValueChange={(value) =>
            setFormData({ ...formData, status: value })
          }
        >
          <SelectTrigger id="status">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {authority ? "Update Authority" : "Add Authority"}
        </Button>
      </div>
    </form>
  );
}
