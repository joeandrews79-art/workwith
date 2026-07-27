import { redirect } from "next/navigation";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import AppShell from "@/components/AppShell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustReset) redirect("/set-password");

  return (
    <AppShell name={user.name} email={user.email} isAdmin={isAdmin(user)}>
      {children}
    </AppShell>
  );
}
