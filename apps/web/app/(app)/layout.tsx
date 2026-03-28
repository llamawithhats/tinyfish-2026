import { redirect } from "next/navigation";
import { auth, signOut } from "../../lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/signin");
  }

  return (
    <main className="shell">
      <div className="panel" style={{ marginBottom: 18 }}>
        <div className="metaRow" style={{ justifyContent: "space-between" }}>
          <div>
            <div className="pill">Signed in as {session.user.email}</div>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button className="button secondary" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </div>
      {children}
    </main>
  );
}
