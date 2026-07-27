import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { aiEnabled } from "@/lib/ai";
import QuestionsManager, { QuestionRow } from "@/components/QuestionsManager";

export const dynamic = "force-dynamic";

export default async function QuestionsPage() {
  const user = await getCurrentUser();
  if (!isAdmin(user)) redirect("/dashboard");

  const rows = await prisma.prefQuestion.findMany({
    where: { orgId: user!.orgId },
    orderBy: [{ domain: "asc" }, { order: "asc" }],
  });
  const questions: QuestionRow[] = rows.map((q) => ({
    id: q.id,
    domain: q.domain,
    prompt: q.prompt,
    kind: q.kind,
    options: JSON.parse(q.options || "[]"),
    helpText: q.helpText,
  }));

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link href="/admin" className="text-sm text-stone-500 hover:underline">← Admin</Link>
      </div>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Working-preference questions</h1>
        <p className="text-stone-500 mt-1">
          These are the quick, plain-language questions everyone answers about how
          they like to work. They're separate from the Big Five assessment and are
          shown directly on each profile. Edit them to fit how your team works, and
          Claude can help.
        </p>
      </header>

      <QuestionsManager questions={questions} aiEnabled={aiEnabled()} />
    </div>
  );
}
