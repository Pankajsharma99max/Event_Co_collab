const EVENT_TYPE_LABELS: Record<string, string> = {
  GENERAL_MEETUP: "Meetup",
  HACKATHON: "Hackathon",
  CONFERENCE: "Conference",
  WORKSHOP: "Workshop",
  DEMO_NIGHT: "Demo night",
  PARTY: "Party",
};

const EVENT_FORMAT_LABELS: Record<string, string> = {
  IN_PERSON: "In-person",
  HYBRID: "Hybrid",
};

interface EventCardProps {
  event: {
    id: string;
    title: string;
    description: string | null;
    eventType: string;
    eventFormat: string;
    startsAt: Date | null;
    location: string;
    websiteUrl: string;
  };
}

export function EventCard({ event }: EventCardProps) {
  const date = event.startsAt
    ? new Date(event.startsAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <a
      href={event.websiteUrl}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="group block rounded-2xl bg-surface p-5 transition hover:bg-surface-2"
    >
      <div className="flex items-center justify-between text-xs">
        <span className="rounded-full border border-border bg-glass px-2.5 py-1 font-medium text-muted-2">
          {EVENT_TYPE_LABELS[event.eventType] ?? event.eventType}
        </span>
        {date && <span className="text-muted">{date}</span>}
      </div>
      <h3 className="mt-3 text-lg font-semibold">{event.title}</h3>
      {event.description && (
        <p className="mt-1.5 line-clamp-2 text-sm text-muted">{event.description}</p>
      )}
      <p className="mt-3 text-xs text-muted">
        {EVENT_FORMAT_LABELS[event.eventFormat] ?? event.eventFormat} · {event.location}
      </p>
    </a>
  );
}
