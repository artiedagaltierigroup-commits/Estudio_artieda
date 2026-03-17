import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header email={user.email} />
        <main className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(247,214,224,0.45),_transparent_30%),linear-gradient(180deg,_rgba(255,248,251,0.92),_rgba(255,248,251,1))] p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
