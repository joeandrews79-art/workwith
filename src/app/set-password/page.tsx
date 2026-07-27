import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import SetPasswordForm from "@/components/SetPasswordForm";

export const dynamic = "force-dynamic";

export default async function SetPasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <main className="min-h-screen grid place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold">Choose a password</h1>
          <p className="text-sm text-stone-500 mt-1">
            You're signed in as {user.email}. Set a password of your own to
            finish setting up your account.
          </p>
        </div>
        <SetPasswordForm />
      </div>
    </main>
  );
}
