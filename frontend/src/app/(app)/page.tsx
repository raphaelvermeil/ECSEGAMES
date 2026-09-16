import LandingHero from "@/components/landing/LandingHero";
import LandingSections from "@/components/landing/LandingSections";
import LandingFooter from "@/components/landing/LandingFooter";

// The public front door. It renders inside the (app) shell so the normal
// Navbar is its header — signed-out visitors get the sign-in button there,
// signed-in ones their UserButton — and it deliberately makes no auth()
// call, so it keeps prerendering like the rest of the group.
export default function Home() {
  return (
    <main>
      <LandingHero />
      <LandingSections />
      <LandingFooter />
    </main>
  );
}
