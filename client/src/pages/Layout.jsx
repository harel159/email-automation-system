import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  FileText, LayoutDashboard, Menu, X, Mail, Send
} from "lucide-react";
import { Button } from "@/component/ui/button";
import { cn } from "@/lib/utils";

/**
 * Layout component – wraps all pages.
 * Includes sidebar navigation, mobile toggle, and main content container.
 */
export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  /**
   * Determines if a given page is currently active (by comparing the pathname)
   */
  const isActive = (pageName) => {
    const url = createPageUrl(pageName);
    return location.pathname === url;
  };

  return (
    <div className="flex h-screen bg-gray-100">

      {/* Mobile-only dark overlay when sidebar is open */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar menu (slides in on mobile) */}
      <aside className={cn(
        "fixed top-0 left-0 z-50 h-full w-64 bg-white border-r transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between p-4">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Mail className="w-6 h-6 text-blue-600" />
            Email Manager
          </h1>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-6 w-6" />
          </Button>
        </div>

        <nav className="px-4 py-2">
          {/* Primary section */}
          <div className="space-y-1">
            <NavLink label="Dashboard" icon={LayoutDashboard} active={isActive("Dashboard")} setSidebarOpen={setSidebarOpen} />
          </div>

          {/* Email management section */}
          <div className="mt-6 pt-6 border-t">
            <p className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Email Management
            </p>
            <div className="space-y-1">
              <NavLink label="EmailManager" title="Email Template" icon={FileText} active={isActive("EmailManager")} setSidebarOpen={setSidebarOpen} />
              <NavLink label="ManualEmail" title="Manual Email" icon={Send} active={isActive("ManualEmail")} setSidebarOpen={setSidebarOpen} />
            </div>
          </div>

        </nav>
      </aside>

      {/* Main content layout */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden bg-white border-b px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </Button>
        </header>

        {/* Children content */}
        <main className="flex-1 overflow-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

/**
 * Reusable NavLink item
 */
function NavLink({ label, title, icon: Icon, active, setSidebarOpen }) {
  return (
    <Link
      to={createPageUrl(label)}
      className={cn(
        "flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg",
        active && "bg-blue-50 text-blue-700 font-medium"
      )}
      onClick={() => setSidebarOpen(false)}
    >
      <Icon className="w-5 h-5" />
      {title || label}
    </Link>
  );
}
