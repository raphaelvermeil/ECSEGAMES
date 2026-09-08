import { auth } from "@clerk/nextjs/server";
import CsCompView from "./_components/CsCompView";

export default async function CsCompPage() {
  await auth.protect();

  const { getToken } = await auth();
  const token = await getToken();
  const meRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const user = await meRes.json();

  return <CsCompView me={{ name: user.name, program: user.major }} />;
}
