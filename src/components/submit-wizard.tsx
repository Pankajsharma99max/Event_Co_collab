"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Stepper } from "@/components/stepper";
import { PillRadio, PillCheckbox } from "@/components/pill-input";
import { withBasePath } from "@/lib/base-path";

const REQUIRED_COHOST_EMAIL = "aviral.lancer@gmail.com";

const EVENT_FORMATS = [
  { value: "IN_PERSON", label: "In-person" },
  { value: "HYBRID", label: "Hybrid (In-person + Remote)" },
];

const EVENT_TYPES = [
  { value: "GENERAL_MEETUP", label: "General meetup" },
  { value: "HACKATHON", label: "Hackathon" },
  { value: "CONFERENCE", label: "Conference" },
  { value: "WORKSHOP", label: "Workshop" },
  { value: "DEMO_NIGHT", label: "Demo night" },
  { value: "PARTY", label: "Party" },
];

const TICKETING_TYPES = [
  { value: "FREE", label: "Free" },
  { value: "PAID", label: "Paid" },
  { value: "HYBRID", label: "Hybrid (Free + Paid)" },
];

const ATTENDEE_BUCKETS = [
  { value: "UNDER_50", label: "<50" },
  { value: "50_150", label: "50-150" },
  { value: "150_300", label: "150-300" },
  { value: "300_PLUS", label: "300+" },
];

const THEMES = [
  "agents",
  "evals",
  "infrastructure",
  "safety",
  "multimodal",
  "voice",
  "robotics",
  "data",
  "applications",
  "research",
  "other",
];

interface EventDraft {
  id: string;
  devnovateEventId: string | null;
  websiteUrl: string;
  platform: "DEVNOVATE" | "LUMA" | "OTHER";
  requiredLumaHostId: string;
  verificationToken: string;
}

interface EventDetailsPayload {
  title: string;
  eventFormat: string;
  eventType: string;
  ticketingType: string;
  expectedAttendees?: string;
  themes: string[];
  wantsSponsorship: boolean;
  additionalInfo: string;
  location: string;
  websiteUrl: string;
}

export function SubmitWizard() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [event, setEvent] = useState<EventDraft | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [requiredFilled, setRequiredFilled] = useState(false);

  const [verifyState, setVerifyState] = useState<
    | { status: "idle" }
    | { status: "checking" }
    | { status: "error"; reason: string }
    | { status: "manual"; reason: string }
  >({ status: "idle" });

  const [copied, setCopied] = useState(false);
  const [savedValues, setSavedValues] = useState<EventDetailsPayload | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  // Synchronous in-flight guard. The disabled-button states below update via
  // React state, which is async — a fast double/triple-click can fire the
  // handler several times before the button re-renders as disabled, sending
  // duplicate requests (duplicate event rows on step 1, duplicate verify
  // calls on step 2). A ref flips synchronously, so the 2nd+ click no-ops.
  const inFlight = useRef(false);

  const checkRequiredFilled = useCallback(() => {
    const form = formRef.current;
    if (!form) {
      setRequiredFilled(false);
      return;
    }
    // checkValidity() covers every native-required field except the themes
    // checkbox group (checkboxes can't express "at least one of N" via the
    // `required` attribute), so that's checked separately here.
    const themesChecked = form.querySelectorAll('input[name="themes"]:checked').length > 0;
    setRequiredFilled(form.checkValidity() && themesChecked);
  }, []);

  // Re-check validity whenever step 1 (re-)mounts — e.g. going back from
  // step 2 after resubmitting fills defaults from `savedValues` synchronously
  // via defaultValue/defaultChecked, but that doesn't fire an `onChange`, so
  // without this the sponsorship toggle would look disabled despite every
  // required field already being filled.
  useEffect(() => {
    if (step === 1) {
      checkRequiredFilled();
    }
  }, [step, checkRequiredFilled]);

  async function handleDetailsSubmit(formData: FormData) {
    if (inFlight.current) return;
    inFlight.current = true;
    setFormError(null);
    setSubmitting(true);

    const payload: EventDetailsPayload = {
      title: String(formData.get("title") ?? ""),
      eventFormat: String(formData.get("eventFormat") ?? ""),
      eventType: String(formData.get("eventType") ?? ""),
      ticketingType: String(formData.get("ticketingType") ?? ""),
      expectedAttendees: String(formData.get("expectedAttendees") ?? "") || undefined,
      themes: formData.getAll("themes").map(String),
      wantsSponsorship: formData.get("wantsSponsorship") === "on",
      additionalInfo: String(formData.get("additionalInfo") ?? ""),
      location: String(formData.get("location") ?? ""),
      websiteUrl: String(formData.get("websiteUrl") ?? ""),
    };
    setSavedValues(payload);

    try {
      // If we already created a draft in this session (the user went back
      // from step 2 to fix something), update it instead of creating a
      // second, orphaned event row.
      const res = await fetch(withBasePath(event ? `/api/events/${event.id}` : "/api/events"), {
        method: event ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error ?? "Could not save event details");
        setSubmitting(false);
        return;
      }

      setEvent({
        id: data.event.id,
        devnovateEventId: data.event.devnovateEventId,
        websiteUrl: data.event.websiteUrl,
        platform: data.event.platform,
        requiredLumaHostId: data.event.requiredLumaHostId,
        verificationToken: data.event.verificationToken,
      });
      setStep(2);
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
      inFlight.current = false;
    }
  }

  async function handleVerify() {
    if (!event || inFlight.current) return;
    inFlight.current = true;
    setVerifyState({ status: "checking" });

    try {
      const res = await fetch(withBasePath(`/api/events/${event.id}/verify-cohost`), { method: "POST" });
      const data = await res.json();

      if (res.ok && data.success) {
        setStep(3);
        setVerifyState({ status: "idle" });
      } else if (data.manualReview) {
        setVerifyState({ status: "manual", reason: data.reason });
      } else {
        // Early-exit failures (not signed in, rate limited, event not found,
        // forbidden) respond with `error`, not `reason` — fall back to it so
        // those specific messages aren't swallowed into a generic one.
        setVerifyState({ status: "error", reason: data.reason ?? data.error ?? "Verification failed" });
      }
    } catch {
      setVerifyState({ status: "error", reason: "Network error. Please try again." });
    } finally {
      inFlight.current = false;
    }
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable — user can still select the text manually.
    }
  }

  return (
    <div>
      <div className="mb-10">
        <Stepper step={step} />
      </div>

      {step === 1 && (
        <div className="rounded-2xl bg-surface p-6 sm:p-8">
          <h1 className="text-xl font-bold">Event details</h1>
          <p className="mt-1 text-sm text-muted">
            Tell us about the event you want listed on Devnovate.
          </p>

          <form
            ref={formRef}
            action={handleDetailsSubmit}
            onChange={checkRequiredFilled}
            className="mt-6 space-y-6"
          >
            <Field
              label="Event title"
              name="title"
              required
              minLength={3}
              maxLength={140}
              defaultValue={savedValues?.title}
            />

            <FieldGroup label="Event Format" required hint="Fully remote events are not supported for now">
              {EVENT_FORMATS.map((o) => (
                <PillRadio
                  key={o.value}
                  name="eventFormat"
                  value={o.value}
                  label={o.label}
                  required
                  defaultChecked={savedValues?.eventFormat === o.value}
                />
              ))}
            </FieldGroup>

            <FieldGroup label="Event Type" required hint="Pick the closest type">
              {EVENT_TYPES.map((o) => (
                <PillRadio
                  key={o.value}
                  name="eventType"
                  value={o.value}
                  label={o.label}
                  required
                  defaultChecked={savedValues?.eventType === o.value}
                />
              ))}
            </FieldGroup>

            <FieldGroup label="Ticketing Type" required>
              {TICKETING_TYPES.map((o) => (
                <PillRadio
                  key={o.value}
                  name="ticketingType"
                  value={o.value}
                  label={o.label}
                  required
                  defaultChecked={savedValues?.ticketingType === o.value}
                />
              ))}
            </FieldGroup>

            <FieldGroup label="Expected Attendees" hint="Your best estimate is fine">
              {ATTENDEE_BUCKETS.map((o) => (
                <PillRadio
                  key={o.value}
                  name="expectedAttendees"
                  value={o.value}
                  label={o.label}
                  defaultChecked={savedValues?.expectedAttendees === o.value}
                />
              ))}
            </FieldGroup>

            <FieldGroup label="Primary Themes" required hint="Pick the closest tags">
              {THEMES.map((t) => (
                <PillCheckbox
                  key={t}
                  name="themes"
                  value={t}
                  label={t}
                  defaultChecked={Boolean(savedValues?.themes.includes(t))}
                />
              ))}
            </FieldGroup>

            <Field
              label="Location (city or 'Online')"
              name="location"
              required
              minLength={2}
              maxLength={200}
              defaultValue={savedValues?.location}
            />
            <Field
              label="Luma event link"
              name="websiteUrl"
              type="url"
              required
              placeholder="https://luma.com/your-event"
              defaultValue={savedValues?.websiteUrl}
            />

            <div className="rounded-xl border border-border bg-surface-2 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">Collaboration Opportunities</p>
                  <p className="mt-0.5 text-sm text-muted">Are you looking for event sponsors?</p>
                </div>
                <label className="relative inline-flex shrink-0 cursor-pointer items-center">
                  <input
                    type="checkbox"
                    name="wantsSponsorship"
                    disabled={!requiredFilled}
                    defaultChecked={savedValues?.wantsSponsorship}
                    className="peer sr-only"
                  />
                  <span className="h-6 w-11 rounded-full bg-white/15 transition peer-checked:bg-white peer-disabled:cursor-not-allowed peer-disabled:opacity-40" />
                  <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white transition peer-checked:translate-x-5 peer-checked:bg-black" />
                </label>
              </div>
              <p className="mt-3 text-xs text-muted">
                {requiredFilled
                  ? "If interested, we will tap our network of partnering AI companies."
                  : "⬆️ Please complete the required fields above first"}
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm text-muted" htmlFor="additionalInfo">
                Additional Information
              </label>
              <p className="mb-2 text-xs text-muted">Anything else we should know about your event?</p>
              <textarea
                id="additionalInfo"
                name="additionalInfo"
                maxLength={3000}
                rows={3}
                placeholder="Feel free to share any additional context, special requirements, or unique aspects of your event..."
                defaultValue={savedValues?.additionalInfo}
                className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 outline-none focus:border-white/40"
              />
            </div>

            {formError && <p className="text-sm text-danger">{formError}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-white px-4 py-2.5 font-medium text-black transition hover:bg-white/90 disabled:opacity-60"
            >
              {submitting ? "Saving…" : "Continue"}
            </button>
          </form>
        </div>
      )}

      {step === 2 && event && (
        <div className="rounded-2xl bg-surface p-6 sm:p-8">
          <button
            onClick={() => setStep(1)}
            className="mb-4 text-sm text-muted hover:text-foreground"
          >
            ← Back to event details
          </button>
          <h1 className="text-xl font-bold">Collaboration options</h1>

          <div className="mt-6 rounded-xl border border-border bg-surface-2 p-5">
            {event.platform === "OTHER" ? (
              <>
                <h2 className="font-semibold">Verify with a code</h2>
                <p className="mt-1 text-sm text-muted">
                  We don&apos;t have a direct host-check for this platform, so verify by
                  proving you can edit the event listing:
                </p>

                <div className="mt-4 rounded-lg border border-border bg-background/60 p-4 text-sm">
                  <p className="font-medium text-foreground">Instructions:</p>
                  <ol className="mt-2 list-decimal space-y-2 pl-4 text-muted">
                    <li>
                      Open your{" "}
                      <a
                        href={event.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="text-foreground underline underline-offset-2"
                      >
                        event page
                      </a>{" "}
                      and edit its public description
                    </li>
                    <li>
                      Paste this exact code anywhere in the description:{" "}
                      <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-border bg-glass px-2.5 py-1 font-mono text-xs text-foreground">
                        {event.verificationToken}
                        <button
                          type="button"
                          onClick={() => copyText(event.verificationToken)}
                          className="text-muted-2 hover:text-foreground"
                        >
                          {copied ? "Copied" : "Copy"}
                        </button>
                      </span>
                    </li>
                    <li>Save/publish the page so it&apos;s visible to the public</li>
                    <li>Click Verify below — you can remove the code afterward</li>
                  </ol>
                </div>
              </>
            ) : (
              <>
                <h2 className="font-semibold">
                  Add as co-host {event.platform === "LUMA" ? "" : "Manager"}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  To list this event on Devnovate, add us as a host on your{" "}
                  {event.platform === "LUMA" ? "Luma" : "devnovate.co"} event
                  {event.platform === "DEVNOVATE"
                    ? " — our team confirms this manually, so there's no live check here."
                    : ":"}
                </p>

                <div className="mt-4 rounded-lg border border-border bg-background/60 p-4 text-sm">
                  <p className="font-medium text-foreground">Instructions:</p>
                  {event.platform === "LUMA" ? (
                    <ol className="mt-2 list-decimal space-y-2 pl-4 text-muted">
                      <li>
                        Open your{" "}
                        <a
                          href={event.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="text-foreground underline underline-offset-2"
                        >
                          Luma event
                        </a>{" "}
                        and open the host management panel
                      </li>
                      <li>Click &quot;Add Host&quot; and search by email</li>
                      <li>
                        Add{" "}
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-glass px-2.5 py-1 font-mono text-xs text-foreground">
                          {REQUIRED_COHOST_EMAIL}
                          <button
                            type="button"
                            onClick={() => copyText(REQUIRED_COHOST_EMAIL)}
                            className="text-muted-2 hover:text-foreground"
                          >
                            {copied ? "Copied" : "Copy"}
                          </button>
                        </span>{" "}
                        — that&apos;s the email on{" "}
                        <a
                          href={`https://luma.com/user/${event.requiredLumaHostId}`}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="underline underline-offset-2"
                        >
                          this Luma profile
                        </a>
                      </li>
                      <li>Make sure the event is published/public on Luma</li>
                    </ol>
                  ) : (
                    <ol className="mt-2 list-decimal space-y-2 pl-4 text-muted">
                      <li>
                        Open your event&apos;s{" "}
                        <a
                          href={event.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="text-foreground underline underline-offset-2"
                        >
                          management page
                        </a>{" "}
                        on devnovate.co
                      </li>
                      <li>Scroll down to the &quot;Hosts&quot; section and click Add Host</li>
                      <li>
                        Add{" "}
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-glass px-2.5 py-1 font-mono text-xs text-foreground">
                          {REQUIRED_COHOST_EMAIL}
                          <button
                            type="button"
                            onClick={() => copyText(REQUIRED_COHOST_EMAIL)}
                            className="text-muted-2 hover:text-foreground"
                          >
                            {copied ? "Copied" : "Copy"}
                          </button>
                        </span>
                      </li>
                      <li>with &quot;Manager&quot; permissions</li>
                      <li>Publish/list the event on devnovate.co if it isn&apos;t already public</li>
                    </ol>
                  )}
                </div>
              </>
            )}

            {verifyState.status === "error" && (
              <p className="mt-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                {verifyState.reason}
              </p>
            )}
            {verifyState.status === "manual" && (
              <p className="mt-4 rounded-lg border border-border bg-glass px-3 py-2 text-sm text-muted-2">
                {verifyState.reason}
              </p>
            )}

            {verifyState.status === "manual" ? (
              <Link
                href="/dashboard"
                className="mt-5 block w-full rounded-full bg-white px-4 py-3 text-center font-medium text-black transition hover:bg-white/90"
              >
                Go to dashboard
              </Link>
            ) : (
              <button
                onClick={handleVerify}
                disabled={verifyState.status === "checking"}
                className="mt-5 w-full rounded-full bg-white px-4 py-3 font-medium text-black transition hover:bg-white/90 disabled:opacity-60"
              >
                {verifyState.status === "checking"
                  ? "Submitting…"
                  : event.platform === "DEVNOVATE"
                    ? "Submit for review"
                    : "Verify & Continue"}
              </button>
            )}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="rounded-2xl bg-surface p-6 text-center sm:p-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-2xl text-success">
            ✓
          </div>
          <h1 className="mt-4 text-xl font-bold">Submitted for review</h1>
          <p className="mt-2 text-muted">
            We&apos;ve confirmed the co-host and that your event is live. It&apos;s now
            verified and will appear on the homepage.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-block rounded-full bg-white px-6 py-2.5 font-medium text-black transition hover:bg-white/90"
          >
            Go to dashboard
          </Link>
        </div>
      )}
    </div>
  );
}

function FieldGroup({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm text-muted">
        {label}
        {required && <span className="text-danger">*</span>}
        {hint && <span className="ml-2 text-xs text-muted/70">{hint}</span>}
      </label>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  minLength,
  maxLength,
  placeholder,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm text-muted" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        minLength={minLength}
        maxLength={maxLength}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 outline-none focus:border-white/40"
      />
    </div>
  );
}
