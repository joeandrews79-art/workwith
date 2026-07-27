import { redirect } from "next/navigation";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { getActiveTeamContext } from "@/lib/active-team";
import AppShell from "@/components/AppShell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustReset) redirect("/set-password");

  const { teams, activeTeamId } = await getActiveTeamContext(user.id);

  return (
    <AppShell
      name={user.name}
      email={user.email}
      isAdmin={isAdmin(user)}
      teams={teams}
      activeTeamId={activeTeamId}
    >
      {children}
    </AppShell>
  );
}
