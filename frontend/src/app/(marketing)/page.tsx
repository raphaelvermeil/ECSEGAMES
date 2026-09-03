import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import LandingHeader from "@/components/landing/LandingHeader";
import LandingHero from "@/components/landing/LandingHero";
import LandingSections from "@/components/landing/LandingSections";
import LandingFooter from "@/components/landing/LandingFooter";

// The public landing page — the one route in the app that renders without a
// session, which is why it lives outside the (app) group: that group's
// layout calls auth.protect() and bounces anyone without a team to
// /select-team. It is also the one file exempted from the
// @clerk/next/require-auth-protection lint rule (see eslint.config.mjs).
//
// Signed-in visitors never see it — they go straight to the app. Because
// that redirect happens here on the server, everything below renders for
// anonymous visitors only and needs no signed-in branch.
export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) {
    redirect("/schedule");
  }

  return (
    <div className="min-h-screen bg-sched-bg">
      <LandingHeader />
      <LandingHero />
      <LandingSections />
      <LandingFooter />
    </div>
  );
}
