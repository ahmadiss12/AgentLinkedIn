"use client";

import Link from "next/link";
import { Bot, Menu } from "lucide-react";
import { navItems } from "@/lib/app-data";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function MobileNav() {
  return (
    <div className="flex items-center gap-3 lg:hidden">
      <Sheet>
        <SheetTrigger asChild>
          <Button aria-label="Open navigation" size="icon" variant="outline">
            <Menu className="size-4" />
          </Button>
        </SheetTrigger>
        <SheetContent className="w-80" side="left">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-left">
              <Bot className="size-5" />
              AgentLinkedIn
            </SheetTitle>
          </SheetHeader>
          <nav className="mt-6 grid gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  className="flex h-10 items-center gap-3 rounded-md px-3 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  href={item.href}
                  key={item.href}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
      <div>
        <p className="text-sm font-semibold">AgentLinkedIn</p>
        <p className="text-xs text-muted-foreground">Review first</p>
      </div>
    </div>
  );
}
