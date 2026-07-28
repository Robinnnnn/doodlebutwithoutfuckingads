import MeetmintApp from "./MeetmintApp";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ poll?: string | string[] }>;
}) {
  const params = await searchParams;
  const poll =
    typeof params.poll === "string"
      ? params.poll.slice(0, 100)
      : Array.isArray(params.poll)
        ? params.poll[0]?.slice(0, 100) || null
        : null;

  return <MeetmintApp initialPollId={poll} />;
}
