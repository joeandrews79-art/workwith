import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustReset) redirect("/set-password");
  if (!user.onboardedAt) redirect("/welcome");
  redirect("/dashboard");
}
