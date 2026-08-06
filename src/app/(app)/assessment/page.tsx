import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Responses } from "@/lib/scoring";
import Assessment from "@/components/Assessment";
import RetakeIntro from "@/components/RetakeIntro";
import { formatDate } from "@/components/Bits";

export const dynamic = "force-dynamic";

export default async function AssessmentPage() {
  const user = (await getCurrentUser())!;

  const inProgress = await prisma.assessment.findFirst({
    where: { userId: user.id, status: "IN_PROGRESS" },
    orderBy: { startedAt: "desc" },
  });

  const completed = await prisma.assessment.findFirst({
    where: { userId: user.id, status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
  });

  // Returning user who already completed and has nothing in progress:
  // offer a deliberate retake rather than silently wiping their profile.
  if (!inProgress && completed) {
    return (
      <div className="max-w-xl mx-auto">
        <RetakeIntro lastCompleted={formatDate(completed.completedAt)} />
        <p className="text-center mt-4">
          <Link href="/me" className="text-sm text-muted underline">
            Back to my profile
          </Link>
        </p>
      </div>
    );
  }

  const assessment =
    inProgress ??
    (await prisma.assessment.create({
      data: { userId: user.id, status: "IN_PROGRESS" },
    }));

  let initial: Responses = {};
  try {
    initial = JSON.parse(assessment.responses) as Responses;
  } catch {
    initial = {};
  }

  return (
    <div>
      <header className="max-w-xl mx-auto mb-2">
        <h1 className="text-xl font-bold">Your working-style assessment</h1>
        <p className="text-muted text-sm mt-1">
          Answer honestly about how you generally are, not how you would like to
          be. About 10 to 15 minutes. Your progress saves automatically.
        </p>
      </header>
      <Assessment assessmentId={assessment.id} initialResponses={initial} />
    </div>
  );
}
