import { useUser, SignIn, SignOutButton } from "@clerk/clerk-react";
import { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { useApi } from "./lib/api";
import type { Profile } from "./types";
import ProfileSetup from "./components/ProfileSetup";
import HingeApp from "./components/HingeApp";
import AdminPanel from "./components/AdminPanel";

export default function App() {
  const { isLoaded, isSignedIn, user } = useUser();
  const api = useApi();

  // undefined = still loading, null = no profile yet
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [view, setView] = useState<"app" | "admin">("app");

  const email = user?.primaryEmailAddress?.emailAddress ?? "";

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) { setProfile(null); return; }

    api.me()
      .then(setProfile)
      .catch(() => setProfile(null));
  }, [isLoaded, isSignedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (!isLoaded || profile === undefined) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Not signed in ───────────────────────────────────────────────────────────
  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-[#F9F8F6] flex flex-col items-center justify-center gap-8 p-4">
        <div className="text-center select-none">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-purple-600 rounded-2xl mb-4 shadow-lg shadow-purple-200">
            <Heart className="w-7 h-7 fill-white text-white" />
          </div>
          <h1 className="text-3xl font-serif font-bold text-zinc-900">
            <span className="italic text-purple-600">cvr</span>.connect
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Exclusively for CVR College students</p>
        </div>
        <SignIn
          appearance={{ elements: { card: "shadow-none border border-zinc-200 rounded-2xl" } }}
          afterSignInUrl="/"
          afterSignUpUrl="/"
        />
      </div>
    );
  }

  // ── Wrong email domain ──────────────────────────────────────────────────────
  if (isSignedIn && !email.endsWith("@cvr.ac.in")) {
    return (
      <div className="min-h-screen bg-[#F9F8F6] flex items-center justify-center p-4">
        <div className="text-center max-w-sm bg-white rounded-2xl border border-zinc-200 p-8">
          <div className="text-4xl mb-4">🚫</div>
          <h2 className="text-xl font-semibold text-zinc-900">CVR students only</h2>
          <p className="text-sm text-zinc-500 mt-2 leading-relaxed">
            You signed in with <strong>{email}</strong>. This app is only for{" "}
            <strong>@cvr.ac.in</strong> email addresses.
          </p>
          <SignOutButton>
            <button className="mt-6 w-full py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors">
              Sign out
            </button>
          </SignOutButton>
        </div>
      </div>
    );
  }

  // ── Profile setup (first login) ─────────────────────────────────────────────
  if (isSignedIn && profile === null) {
    return <ProfileSetup email={email} onComplete={setProfile} />;
  }

  // ── Admin panel ─────────────────────────────────────────────────────────────
  if (view === "admin") {
    return <AdminPanel onBack={() => setView("app")} />;
  }

  // ── Main app ────────────────────────────────────────────────────────────────
  return (
    <HingeApp
      profile={profile!}
      onProfileUpdate={setProfile}
      onAdminClick={profile?.is_admin ? () => setView("admin") : undefined}
    />
  );
}
