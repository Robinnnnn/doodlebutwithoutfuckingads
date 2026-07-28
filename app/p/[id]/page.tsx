import type { Metadata } from "next";
import DoodleApp from "../../DoodleApp";
import {
  formatPollOptionSummary,
  getPollShareData,
} from "../../../lib/poll-share";

const productName = "doodlebutwithoutfuckingads";

function pollPath(id: string) {
  return `/p/${encodeURIComponent(id)}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id: rawId } = await params;
  const id = rawId.slice(0, 100);
  const poll = await getPollShareData(id);
  const path = pollPath(id);
  const image = `${path}/opengraph-image`;
  const title = poll
    ? `${poll.title} — ${productName}`
    : `Poll unavailable — ${productName}`;
  const description = poll
    ? `Help ${poll.organizer} find a time. ${formatPollOptionSummary(poll)}.`
    : "This poll link may be incomplete or no longer available.";
  const imageAlt = poll
    ? `${poll.title}, organized by ${poll.organizer}`
    : `${productName} poll link unavailable`;

  return {
    title,
    description,
    alternates: { canonical: path },
    robots: poll ? undefined : { index: false, follow: false },
    openGraph: {
      title,
      description,
      type: "website",
      url: path,
      siteName: productName,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: imageAlt,
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: image, alt: imageAlt }],
    },
  };
}

export default async function PollPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DoodleApp initialPollId={id.slice(0, 100)} />;
}
