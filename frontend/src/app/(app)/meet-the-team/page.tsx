import { getTeamMembers } from "@/lib/team";
import TeamView from "./_components/TeamView";

export default async function MeetTheTeamPage() {
  const members = await getTeamMembers();

  return <TeamView members={members} />;
}
