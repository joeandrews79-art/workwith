import Link from "next/link";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { assembleProfile } from "@/lib/profile";
import { getVisibleMembers } from "@/lib/team-data";
import { teamStats } from "@/lib/team";
import { DomainCode, DOMAIN_ORDER } from "@/lib/ipip";
import ProfileView from "@/components/ProfileView";
import ProfileToolbar from "@/components/ProfileToolbar";
import PreferencesEditor from "@/components/PreferencesEditor";
import InterpretationGuide from "@/components/InterpretationGuide";
import SlackConnect from "@/components/SlackConnect";
import { getMySlackStatus } from "@/app/actions";
import { getOrgQuestions, getUserAnswers } from "@/lib/prefs";
import { prisma } from "@/lib/db";
import { interpretEnabled, InterpretationResult } from "@/lib/interpret";

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

  const [questions, prefAnswers] = await Promise.all([
    getOrgQuestions(user.orgId),
    getUserAnswers(user.id),
  ]);

  const slackStatus = await getMySlackStatus();

  const aiOn = interpretEnabled();
  let interpretation: InterpretationResult | null = null;
  if (aiOn) {
    const p = await prisma.profile.findUnique({
      where: { userId: user.id },
      select: { interpretation: true },
    });
    if (p?.interpretation) {
      try {
        interpretation = JSON.parse(p.interpretation) as InterpretationResult;
      } catch {
        interpretation = null;
      }
    }
  }

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
          style={{ background: "rgba(34,197,94,0.12)", borderColor: "rgba(34,197,94,0.35)" }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0 mt-0.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m22 4-10 10.01-3-3" /></svg>
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

      {aiOn && (
        <div className="mt-6">
          <InterpretationGuide initial={interpretation} />
        </div>
      )}

      <div className="mt-6">
        <PreferencesEditor questions={questions} initial={prefAnswers} />
      </div>

      {slackStatus.enabled && (
        <div className="mt-6">
          <SlackConnect
            connected={slackStatus.connected}
            preMeetingEnabled={slackStatus.preMeetingEnabled}
          />
        </div>
      )}
    </div>
  );
}
