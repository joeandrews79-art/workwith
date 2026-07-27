import { redirect } from "next/navigation";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import Nav from "@/components/Nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen">
      <Nav name={user.name} email={user.email} isAdmin={isAdmin(user)} />
      <main className="max-w-5xl mx-auto px-4 py-6 sm:py-8">{children}</main>
      <footer className="max-w-5xl mx-auto px-4 py-8 text-[11px] text-stone-400 leading-relaxed">
        WorkWith is a self-report reflection tool built on the public-domain Big
        Five (IPIP-NEO-120, Goldberg / Johnson 2014). It is not a clinical,
        diagnostic, or hiring assessment. Your responses stay in this app and are
        never sent to a third party.
      </footer>
    </div>
  );
}
