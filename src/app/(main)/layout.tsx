import { redirect } from "next/navigation";
import { getCurrentUser, homePathFor } from "@/modules/auth/auth.service";
import { AppShell } from "@/components/layout";
import { hasPermission, ROLE_LABEL, type RoleCode } from "@/common/permissions/permissions";
import { countPendingGrading } from "@/modules/grading/grading.service";
import { countNewLeads } from "@/modules/leads/leads.service";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/doi-mat-khau");

  const roleLabel =
    user.roleCodes.map((c) => ROLE_LABEL[c as RoleCode] ?? c).join(" · ") || "Người dùng";

  const [grading, leads] = await Promise.all([
    hasPermission(user, "grading.manage") ? countPendingGrading(user) : 0,
    hasPermission(user, "lead.view") ? countNewLeads() : 0,
  ]);

  return (
    <AppShell
      allowedPermissions={Object.keys(user.permissions)}
      fullName={user.fullName}
      email={user.username}
      roleLabel={roleLabel}
      homeHref={homePathFor(user)}
      badges={{ grading, leads }}
    >
      {children}
    </AppShell>
  );
}
