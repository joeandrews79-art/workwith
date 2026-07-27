import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { assembleProfile } from "@/lib/profile";
import { getAnsweredPreferences } from "@/lib/prefs";
import ProfileReportView from "@/components/ProfileReportView";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

export default async function ReportPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustReset) redirect("/set-password");

  const profile = await assembleProfile(user.id);
  if (!profile || !profile.domains) redirect("/me");

  const prefs = await getAnsweredPreferences(user.orgId, user.id);
  const date = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="rpt-screen">
      <style>{RPT_CSS}</style>
      <div className="rpt-toolbar">
        <Link href="/me" className="rpt-back">← Back to my profile</Link>
        <PrintButton />
      </div>
      <ProfileReportView profile={profile} prefs={prefs} date={date} />
      <p className="rpt-hint">Tip: in the print dialog, choose "Save as PDF" as the destination.</p>
    </div>
  );
}

const RPT_CSS = `
.rpt-screen{min-height:100vh;background:#eef2f8;padding:26px 16px 64px;color:#1b2333;
  font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  position:relative;z-index:0;-webkit-font-smoothing:antialiased;}
.rpt-toolbar{max-width:760px;margin:0 auto 16px;display:flex;justify-content:space-between;align-items:center;gap:12px;}
.rpt-back{color:#5c6880;text-decoration:none;font-size:14px;}
.rpt-back:hover{color:#1b2333;}
.rpt-btn{font:inherit;font-size:14px;font-weight:600;border-radius:9px;padding:9px 16px;cursor:pointer;border:1px solid #d4dbe6;background:#fff;color:#1b2333;}
.rpt-btn-primary{background:#2563eb;color:#fff;border-color:#2563eb;}
.rpt-hint{max-width:760px;margin:14px auto 0;font-size:12.5px;color:#8a95a8;text-align:center;}
.rpt-paper{max-width:760px;margin:0 auto;background:#fff;border:1px solid #e2e7f0;border-radius:14px;
  padding:44px 46px;box-shadow:0 4px 24px rgba(16,24,40,.08);}
.rpt-head{border-bottom:2px solid #1b2333;padding-bottom:18px;margin-bottom:26px;}
.rpt-brand{display:flex;align-items:center;gap:8px;font-weight:800;font-size:15px;}
.rpt-mark{width:26px;height:26px;border-radius:7px;background:#2563eb;color:#fff;display:grid;place-items:center;font-weight:800;font-size:14px;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
.rpt-kicker{text-transform:uppercase;letter-spacing:.08em;font-size:12px;font-weight:700;color:#2563eb;margin:16px 0 4px;}
.rpt-name{font-size:30px;font-weight:800;margin:0;letter-spacing:-.01em;}
.rpt-role{font-size:16px;color:#5c6880;margin:2px 0 0;}
.rpt-date{font-size:13px;color:#8a95a8;margin:8px 0 0;}
.rpt-block{margin:0 0 26px;}
.rpt-h2{font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:#8a95a8;font-weight:700;margin:0 0 12px;border-bottom:1px solid #e2e7f0;padding-bottom:6px;}
.rpt-lead{font-size:16.5px;line-height:1.6;margin:0;}
.rpt-sections{display:grid;gap:14px;}
.rpt-h3{font-size:14px;font-weight:700;margin:0 0 3px;}
.rpt-sec p{margin:0;font-size:14.5px;line-height:1.55;color:#33405a;}
.rpt-list{margin:0;padding-left:18px;}
.rpt-list li{font-size:14.5px;line-height:1.55;margin-bottom:7px;color:#33405a;}
.rpt-note{font-size:12.5px;color:#8a95a8;margin:0 0 14px;}
.rpt-traits{display:grid;gap:16px;}
.rpt-trait-top{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:5px;}
.rpt-trait-name{font-weight:600;font-size:15px;}
.rpt-trait-score{font-weight:700;font-size:15px;font-variant-numeric:tabular-nums;}
.rpt-bar{height:8px;background:#eef1f6;border-radius:99px;overflow:hidden;}
.rpt-bar-fill{display:block;height:100%;border-radius:99px;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
.rpt-poles{display:flex;justify-content:space-between;font-size:11.5px;color:#8a95a8;margin-top:4px;}
.rpt-facets{display:grid;grid-template-columns:1fr 1fr;gap:16px 30px;}
.rpt-facet-domain{font-size:13px;font-weight:700;margin:0 0 7px;}
.rpt-facet-row{display:grid;grid-template-columns:1fr 46px 22px;align-items:center;gap:8px;margin-bottom:5px;}
.rpt-facet-name{font-size:12.5px;color:#33405a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.rpt-facet-track{height:6px;background:#eef1f6;border-radius:99px;overflow:hidden;}
.rpt-facet-fill{display:block;height:100%;border-radius:99px;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
.rpt-facet-score{font-size:12px;font-variant-numeric:tabular-nums;color:#5c6880;text-align:right;}
.rpt-prefs{display:grid;gap:12px;}
.rpt-pref dt{font-size:13px;color:#5c6880;margin-bottom:2px;}
.rpt-pref dd{font-size:14.5px;margin:0;color:#1b2333;font-weight:500;}
.rpt-foot{margin-top:30px;padding-top:14px;border-top:1px solid #e2e7f0;font-size:11.5px;color:#8a95a8;line-height:1.5;}
.rpt-avoid-break{break-inside:avoid;}
@media print{
  body::before{display:none !important;}
  .rpt-screen{background:#fff !important;padding:0;}
  .rpt-toolbar,.rpt-hint{display:none !important;}
  .rpt-paper{box-shadow:none;border:none;border-radius:0;max-width:none;margin:0;padding:0;}
  @page{margin:15mm;}
}
`;
