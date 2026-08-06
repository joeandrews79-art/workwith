import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { assembleProfile } from "@/lib/profile";
import { buildNarrative } from "@/lib/narrative";
import NarrativeEditor from "@/components/NarrativeEditor";

export const dynamic = "force-dynamic";

export default async function EditNarrativePage() {
  const user = (await getCurrentUser())!;
  const profile = await assembleProfile(user.id);
  if (!profile || !profile.domains || !profile.narrative) redirect("/me");

  const generated = buildNarrative(user.name, profile.domains);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-4">
        <Link href="/me" className="text-sm text-muted hover:underline">
          ← Back to my profile
        </Link>
      </div>
      <h1 className="text-2xl font-bold tracking-tight">Personalize your wording</h1>
      <p className="text-muted mt-1 mb-6">
        Edit anything that doesn't sound like you. Leave a field blank to keep the
        auto-generated version. Your scores don't change, only the words.
      </p>
      <NarrativeEditor current={profile.narrative} generated={generated} />
    </div>
  );
}
