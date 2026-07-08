import type { ReactNode } from "react";
import { Bot, ShieldCheck } from "lucide-react";
import { MobileNav } from "@/components/mobile-nav";
import { NotificationsBell } from "@/components/notifications-bell";
import { SidebarNav } from "@/components/sidebar-nav";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-border bg-sidebar/80 px-5 py-5 lg:block">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-md border border-border bg-background">
            <Bot className="size-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">AgentLinkedIn</p>
            <p className="text-xs text-muted-foreground">Research to review</p>
          </div>
        </div>
        <Separator className="my-5" />
        <SidebarNav />
        <div className="absolute bottom-5 left-5 right-5 rounded-md border border-border bg-background/70 p-4">
          <div className="mb-2 flex items-center gap-2">
            <ShieldCheck className="size-4 text-emerald-400" />
            <Badge variant="secondary">Approval required</Badge>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            Drafts cannot be scheduled or posted until you explicitly approve
            them.
          </p>
        </div>
      </aside>
      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur md:px-6 lg:px-8">
          <MobileNav />
          <div className="hidden lg:block">
            <p className="text-sm font-medium">AI content control room</p>
            <p className="text-xs text-muted-foreground">
              Discover, draft, review, schedule.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="hidden sm:inline-flex" variant="outline">
              Manual publishing
            </Badge>
            <Badge className="hidden sm:inline-flex" variant="secondary">
              Approval required
            </Badge>
            <NotificationsBell />
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
