import {
  BarChart3,
  CalendarClock,
  Database,
  FileText,
  History,
  Home,
  Newspaper,
  Settings,
} from "lucide-react";

export const navItems = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/topics", label: "Topics", icon: Newspaper },
  { href: "/drafts", label: "Drafts", icon: FileText },
  { href: "/sources", label: "Sources", icon: Database },
  { href: "/schedule", label: "Schedule", icon: CalendarClock },
  { href: "/history", label: "History", icon: History },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];
