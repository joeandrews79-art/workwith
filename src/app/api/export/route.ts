import { getCurrentUser } from "@/lib/auth";
import { assembleProfile } from "@/lib/profile";
import { prisma } from "@/lib/db";

/** Privacy: let a user export everything WorkWith holds about them, as JSON. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const assessments = await prisma.assessment.findMany({
    where: { userId: user.id },
    orderBy: { startedAt: "desc" },
  });
  const profile = await assembleProfile(user.id);

  const payload = {
    exportedAt: new Date().toISOString(),
    account: {
      name: user.name,
      email: user.email,
      title: user.title,
      role: user.role,
    },
    profile: profile && {
      shared: profile.shared,
      refreshedAt: profile.refreshedAt,
      domains: profile.domains,
      facets: profile.facets,
      narrative: profile.narrative,
    },
    assessments: assessments.map((a) => ({
      id: a.id,
      status: a.status,
      startedAt: a.startedAt,
      completedAt: a.completedAt,
      responses: safeParse(a.responses),
      domainScores: safeParse(a.domainScores),
      facetScores: safeParse(a.facetScores),
    })),
    note: "WorkWith is a self-report reflection tool based on the public-domain IPIP-NEO-120. Not a clinical or hiring assessment.",
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="workwith-${user.name.replace(/\s+/g, "-").toLowerCase()}.json"`,
    },
  });
}

function safeParse(s: string | null) {
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}
