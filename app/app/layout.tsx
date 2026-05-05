import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth guard — only authenticated users see /app/*. Real Supabase Auth
  // wiring lands in Phase 3. For now, this is a placeholder so the route
  // structure is in place and the gate is documented.
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (!data.user) redirect("/login");
    } catch {
      // Until Supabase is configured, allow through with a notice banner.
    }
  }

  return (
    <main className="mx-auto max-w-[1100px] px-7 py-[5vh]">
      <div className="mb-6 rounded-md border border-dashed border-border bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
        Dashboard scaffold. Real auth + data wiring arrives with Phase 3.
      </div>
      {children}
    </main>
  );
}
