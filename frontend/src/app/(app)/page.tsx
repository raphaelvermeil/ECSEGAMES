import MobileHeader from "@/components/MobileHeader";
import LandingHero from "@/components/landing/LandingHero";
import LandingSections from "@/components/landing/LandingSections";
import LandingFooter from "@/components/landing/LandingFooter";

// The public front door. It renders inside the (app) shell so the desktop
// Navbar is its header — signed-out visitors get the sign-in button there,
// signed-in ones their UserButton. That bar is `hidden lg:flex`, so on a
// phone MobileHeader supplies the chrome bar + drawer instead; the hero
// below already acts as the title band. It deliberately makes no auth()
// call, so it keeps prerendering like the rest of the group.
export default function Home() {
  return (
    <>
      <MobileHeader />
      <main>
        <LandingHero />
        <LandingSections />
        <LandingFooter />
      </main>
    </>
  );
}
