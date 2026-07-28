import { ImageResponse } from "next/og";
import {
  formatPollOptionSummary,
  getPollShareData,
} from "../../../lib/poll-share";

export const alt = "A poll on doodlebutwithoutfuckingads";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const brand = (
  <div
    style={{
      alignItems: "baseline",
      display: "flex",
      fontSize: 29,
      fontWeight: 800,
      letterSpacing: "-1.5px",
    }}
  >
    <span style={{ color: "#1c2c28" }}>doodle</span>
    <span style={{ color: "#1c2c28" }}>butwithout</span>
    <span style={{ color: "#ff806a" }}>fucking</span>
    <span style={{ color: "#267057" }}>ads</span>
    <span style={{ color: "#ff806a" }}>.</span>
    <span style={{ color: "#1c2c28" }}>com</span>
  </div>
);

function truncate(value: string, maxLength: number) {
  return value.length > maxLength
    ? `${value.slice(0, maxLength - 1).trimEnd()}…`
    : value;
}

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const poll = await getPollShareData(rawId.slice(0, 100));
  const title = poll
    ? truncate(poll.title, 80)
    : "This poll isn’t available";
  const eyebrow = poll
    ? `${truncate(poll.organizer, 50)} is finding a time for`
    : "The link may be incomplete or out of date";
  const summary = poll
    ? formatPollOptionSummary(poll)
    : "Make a new poll in seconds — no account required";
  const titleSize = title.length > 58 ? 54 : title.length > 36 ? 62 : 72;

  return new ImageResponse(
    (
      <div
        style={{
          background:
            "radial-gradient(circle at 13% 0%, #f1f7b8 0%, #f8f4e9 40%, #f7f3eb 100%)",
          color: "#1c2c28",
          display: "flex",
          flexDirection: "column",
          fontFamily: "sans-serif",
          height: "100%",
          justifyContent: "space-between",
          padding: "58px 68px 52px",
          width: "100%",
        }}
      >
        <div
          style={{
            alignItems: "center",
            display: "flex",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          {brand}
          <div
            style={{
              border: "2px solid #1c2c28",
              borderRadius: 999,
              color: "#1c2c28",
              display: "flex",
              fontSize: 20,
              fontWeight: 700,
              padding: "10px 19px",
            }}
          >
            GROUP POLL
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 22,
            maxWidth: 1010,
          }}
        >
          <div
            style={{
              color: "#67746f",
              display: "flex",
              fontSize: 27,
              fontWeight: 600,
              letterSpacing: "0.2px",
              marginBottom: 18,
            }}
          >
            {eyebrow}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: titleSize,
              fontWeight: 800,
              letterSpacing: "-2.6px",
              lineHeight: 1.03,
            }}
          >
            {title}
          </div>
          <div
            style={{
              background: "#ff806a",
              display: "flex",
              height: 7,
              marginTop: 20,
              transform: "rotate(-0.4deg)",
              width: Math.min(820, Math.max(260, title.length * 13)),
            }}
          />
        </div>

        <div
          style={{
            alignItems: "center",
            borderTop: "2px solid rgba(28, 44, 40, 0.14)",
            display: "flex",
            justifyContent: "space-between",
            paddingTop: 28,
            width: "100%",
          }}
        >
          <div
            style={{
              color: "#52625d",
              display: "flex",
              fontSize: 26,
              fontWeight: 650,
            }}
          >
            {summary}
          </div>
          <div
            style={{
              alignItems: "center",
              background: "#267057",
              borderRadius: 999,
              color: "#fffdf8",
              display: "flex",
              fontSize: 23,
              fontWeight: 750,
              padding: "14px 24px",
            }}
          >
            Open the poll →
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      headers: {
        "cache-control": poll
          ? "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400"
          : "public, max-age=60, s-maxage=300",
      },
    },
  );
}
