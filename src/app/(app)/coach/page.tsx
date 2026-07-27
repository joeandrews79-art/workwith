import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assembleProfile } from "@/lib/profile";
import { coachEnabled, type CoachingPlan } from "@/lib/coach";
import { formatDate } from "@/components/Bits";
import Coach from "@/components/Coach";

export const dynamic = "force-dynamic";

export default async function CoachPage() {
  const user = (await getCurrentUser())!;
  const profile = await assembleProfile(user.id);
  const hasProfile = Boolean(profile && profile.domains);

  let initialPlan: CoachingPlan | null = null;
  let generatedAt: string | null = null;
  if (hasProfile) {
    const row = await prisma.profile.findUnique({
      where: { userId: user.id },
      select: { coaching: true, coachingAt: true },
    });
    if (row?.coaching) {
      try {
        initialPlan = JSON.parse(row.coaching) as CoachingPlan;
        generatedAt = row.coachingAt ? formatDate(row.coachingAt) : null;
      } catch {
        initialPlan = null;
      }
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Coach</h1>
        <p className="text-stone-500 mt-1">
          Personal, practical advice for working with the grain of who you are, and
          flexing on purpose where it helps.
        </p>
      </header>

      <Coach
        hasProfile={hasProfile}
        enabled={coachEnabled()}
        initialPlan={initialPlan}
        generatedAt={generatedAt}
      />
    </div>
  );
}
