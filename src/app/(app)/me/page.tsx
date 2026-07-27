import Link from "next/link";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { assembleProfile } from "@/lib/profile";
import { getVisibleMembers } from "@/lib/team-data";
import { teamStats } from "@/lib/team";
import { DomainCode, DOMAIN_ORDER } from "@/lib/ipip";
import ProfileView from "@/components/ProfileView";
import ProfileToolbar from "@/components/ProfileToolbar";

export const dynamic = "force-dynamic";

export default async function MyProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const { new: isNew } = await searchParams;
  const user = (await getCurrentUser())!;
  const profile = await assembleProfile(user.id);

  if (!profile || !profile.domains) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <h1 className="text-xl font-bold">You haven't completed your profile</h1>
        <p className="text-stone-500 mt-2">
          Take the 10-to-15 minute assessment to generate your working-style
          profile.
        </p>
        <Link href="/assessment" className="btn btn-primary mt-6">
          Start assessment
        </Link>
      </div>
    );
  }

  const members = await getVisibleMembers(user.orgId, user.id);
  const stats = teamStats(members);
  const teamMean = Object.fromEntries(
    DOMAIN_ORDER.map((d) => [d, stats[d].mean]),
  ) as Record<DomainCode, number>;

  return (
    <div className="max-w-3xl mx-auto">
      {isAdmin(user) && (
        <div className="card p-3 mb-5 flex items-center justify-between gap-3">
          <p className="text-sm text-stone-600">
            You're viewing your <strong>member profile</strong>.
          </p>
          <Link href="/admin" className="btn btn-secondary py-1.5 text-sm">
            Switch to admin
          </Link>
        </div>
      )}
      {isNew && (
        <div
          className="card p-4 mb-5 flex items-start gap-3"
          style={{ background: "#f0fdf4", borderColor: "#bbf7d0" }}
        >
          <span aria-hidden className="text-lg">✅</span>
          <div>
            <p className="font-semibold text-sm">Your profile is ready</p>
            <p className="text-sm text-stone-600">
              Review it below, tweak any wording that doesn't sound like you, then
              share it with your team.
            </p>
          </div>
        </div>
      )}

      <ProfileToolbar
        shared={profile.shared}
        edited={profile.edited}
      />

      <ProfileView profile={profile} teamMean={teamMean} owner />
    </div>
  );
}
