import { auth } from "@clerk/nextjs/server";
import MobilePageBanner from "@/components/MobilePageBanner";

export default async function CsCompPage() {
  await auth.protect();
  return (
    <>
      <MobilePageBanner title="CS comp" subtitle="Coming soon." />
      <main className="hidden bg-ecsess-900 px-10 pb-11 pt-9 lg:block">
        <h1 className="text-4xl font-extrabold text-ecsess-50">CS comp</h1>
        <p className="mt-1.5 text-base text-ecsess-300">Coming soon.</p>
      </main>
    </>
  );
}
