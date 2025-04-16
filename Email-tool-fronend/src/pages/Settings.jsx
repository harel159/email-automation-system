import React, { useState, useEffect } from "react";
import { Card } from "@/component/ui/card";
import { Button } from "@/component/ui/button";
import { Input } from "@/component/ui/input";
import { UserPlus, User as UserIcon, Users, Mail, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/component/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/component/ui/table";

/**
 * Settings Page – handles user management:
 * - View users
 * - Invite new users
 * - See your own role
 */
export default function Settings() {
  // ========== STATE ========== //
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const [newUserEmail, setNewUserEmail] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // ========== LOAD USERS ========== //
  useEffect(() => {
    loadUsers();
    loadCurrentUser();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await User.list(); // 🔧 Replace with backend API call
      setUsers(data);
    } catch (err) {
      console.error("Failed to load users:", err);
    }
  };

  const loadCurrentUser = async () => {
    try {
      const user = await User.me(); // 🔧 Replace with backend API call
      setCurrentUser(user);
    } catch (err) {
      console.error("Failed to load current user:", err);
    }
  };

  // ========== INVITE USER ========== //
  const handleSubmitInvite = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      if (!newUserEmail) {
        setError("Please enter an email address");
        return;
      }

      await User.invite(newUserEmail); // 🔧 Replace with backend invite endpoint
      setSuccess(`Invitation sent to ${newUserEmail}`);
      setNewUserEmail("");
      loadUsers();
    } catch (err) {
      setError(err.message || "Failed to invite user");
    }
  };

  // ========== UI ========== //
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          User Management
        </h2>

        {/* Alerts */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4 bg-green-50 text-green-800 border-green-100">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Invite form */}
        <form onSubmit={handleSubmitInvite} className="mb-6">
          <div className="flex gap-3 items-start">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Invite New User</label>
              <Input
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="Enter email address"
              />
            </div>
            <Button type="submit" className="mt-8">
              <UserPlus className="w-4 h-4 mr-2" />
              Send Invite
            </Button>
          </div>
        </form>

        {/* User table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} className={currentUser?.id === user.id ? "bg-blue-50" : ""}>
                  <TableCell className="font-medium flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-gray-500" />
                    {user.full_name || "Unnamed User"}
                    {currentUser?.id === user.id && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                        You
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-500" />
                    {user.email}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      user.role === 'admin'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role}
                    </span>
                  </TableCell>
                </TableRow>
              ))}

              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                    No users found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
