"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startRetake } from "@/app/actions";

export default function RetakeIntro({ lastCompleted }: { lastCompleted: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function begin() {
    setLoading(true);
    await startRetake();
    router.refresh();
  }

  return (
    <div className="card p-6 sm:p-8 text-center">
      <h1 className="text-xl font-bold">Retake your assessment</h1>
      <p className="text-stone-500 mt-2">
        You last completed this on {lastCompleted}. Retaking creates a fresh
        profile from your new answers, which resets any edits you made to the
        wording. Your previous responses are replaced.
      </p>
      <button className="btn btn-primary mt-6" onClick={begin} disabled={loading}>
        {loading ? "Starting…" : "Start a fresh assessment"}
      </button>
    </div>
  );
}
