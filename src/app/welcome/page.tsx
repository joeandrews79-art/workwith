import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import WelcomeWizard from "@/components/WelcomeWizard";

export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustReset) redirect("/set-password");

  const completed = await prisma.assessment.findFirst({
    where: { userId: user.id, status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
  });
  const profile = await prisma.profile.findUnique({ where: { userId: user.id } });

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-2 mb-6 justify-center">
          <span className="inline-grid place-items-center w-8 h-8 rounded-lg bg-accent text-on-accent text-sm font-bold">W</span>
          <span className="font-bold text-lg">WorkWith</span>
        </div>
        <WelcomeWizard
          firstName={user.name.split(/\s+/)[0]}
          hasAssessment={Boolean(completed)}
          isShared={Boolean(profile?.shared)}
        />
      </div>
    </main>
  );
}
