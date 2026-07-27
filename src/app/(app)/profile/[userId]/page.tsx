import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assembleProfile } from "@/lib/profile";
import { getAnsweredPreferences } from "@/lib/prefs";
import { getVisibleMembers } from "@/lib/team-data";
import { teamStats } from "@/lib/team";
import { DomainCode, DOMAIN_ORDER } from "@/lib/ipip";
import ProfileView from "@/components/ProfileView";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const viewer = (await getCurrentUser())!;

  const target = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });
  if (!target || target.orgId !== viewer.orgId) notFound();

  const isSelf = target.id === viewer.id;
  if (isSelf) {
    // Own profile lives at /me (with edit controls).
    const { redirect } = await import("next/navigation");
    redirect("/me");
  }

  // Access control: only shared profiles are viewable by others.
  if (!target.profile?.shared) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <h1 className="text-xl font-bold">This profile isn't shared</h1>
        <p className="text-stone-500 mt-2">
          {target.name} hasn't shared their working-style profile with the team yet.
        </p>
        <Link href="/directory" className="btn btn-secondary mt-6">
          Back to team
        </Link>
      </div>
    );
  }

  const profile = await assembleProfile(target.id);
  if (!profile || !profile.domains) notFound();

  const members = await getVisibleMembers(viewer.orgId, viewer.id);
  const stats = teamStats(members);
  const teamMean = Object.fromEntries(
    DOMAIN_ORDER.map((d) => [d, stats[d].mean]),
  ) as Record<DomainCode, number>;
  const preferences = await getAnsweredPreferences(target.orgId, target.id);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/directory" className="text-sm text-stone-500 hover:underline">
          ← Team
        </Link>
        <Link href={`/compare?a=${viewer.id}&b=${target.id}`} className="btn btn-secondary py-1.5 text-sm">
          Compare with me
        </Link>
      </div>
      <ProfileView profile={profile} teamMean={teamMean} preferences={preferences} />
    </div>
  );
}
