import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getVisibleMembers } from "@/lib/team-data";
import MeetingPlanner from "@/components/MeetingPlanner";

export const dynamic = "force-dynamic";

export default async function MeetingPage() {
  const user = (await getCurrentUser())!;
  const members = await getVisibleMembers(user.orgId, user.id);
  const viewer = members.find((m) => m.id === user.id);
  const others = members.filter((m) => m.id !== user.id);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Meeting prep</h1>
        <p className="text-stone-500 mt-1">
          Add the people in an upcoming meeting to read the room's communication
          dynamic and get tailored advice on how to show up.
        </p>
      </header>

      {!viewer ? (
        <div className="card p-6 text-center">
          <p className="font-semibold">Complete your own profile first</p>
          <p className="text-sm text-stone-500 mt-1 mb-4">
            Meeting advice is tuned to your profile, so you'll need to finish the
            assessment before using this.
          </p>
          <Link href="/assessment" className="btn btn-primary">
            Start assessment
          </Link>
        </div>
      ) : (
        <MeetingPlanner viewer={viewer} others={others} />
      )}
    </div>
  );
}
