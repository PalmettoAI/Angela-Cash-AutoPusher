import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in — Angela's Listing Pusher",
};

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-[68vh] max-w-sm flex-col justify-center">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back, Angela
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to post a new listing to all your sites at once.
        </p>
      </div>

      <LoginForm />

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Trouble signing in? Reach out to Palmetto&nbsp;AI&nbsp;Automation.
      </p>
    </div>
  );
}
