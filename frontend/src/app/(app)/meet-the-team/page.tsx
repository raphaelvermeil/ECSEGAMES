import { auth } from "@clerk/nextjs/server";
import { getTeamMembers } from "@/lib/team";
import TeamView from "./_components/TeamView";

export default async function MeetTheTeamPage() {
  await auth.protect();
  const members = await getTeamMembers();

  return <TeamView members={members} />;
}
