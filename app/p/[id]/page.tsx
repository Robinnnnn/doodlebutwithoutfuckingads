import DoodleApp from "../../DoodleApp";

export default async function PollPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DoodleApp initialPollId={id.slice(0, 100)} />;
}
