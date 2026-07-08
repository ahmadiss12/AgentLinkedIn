import { Bot } from "lucide-react";
import Link from "next/link";
import { LoginForm } from "@/components/login-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const authEnabled = Boolean(process.env.APP_PASSWORD);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm rounded-md">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-md border border-border bg-muted">
            <Bot className="size-6" />
          </div>
          <CardTitle className="text-lg">AgentLinkedIn</CardTitle>
          <p className="text-sm text-muted-foreground">
            {authEnabled
              ? "This is a personal workspace — enter the password to continue."
              : "Password protection is off (APP_PASSWORD is not set), so the app is open."}
          </p>
        </CardHeader>
        <CardContent>
          {authEnabled ? (
            <LoginForm />
          ) : (
            <Link className="text-sm underline underline-offset-2" href="/">
              Go to the dashboard
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
