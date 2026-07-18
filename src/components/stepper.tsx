interface StepperProps {
  step: 1 | 2 | 3;
}

const STEPS = [
  { n: 1, label: "Event Details" },
  { n: 2, label: "Collaboration" },
  { n: 3, label: "Confirmation" },
] as const;

export function Stepper({ step }: StepperProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {STEPS.map((s, i) => (
        <div key={s.n} className="flex items-center">
          <div className="flex flex-col items-center gap-2">
            <div
              className={[
                "flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold transition",
                s.n < step
                  ? "border-white bg-white text-black"
                  : s.n === step
                    ? "border-border-strong bg-glass text-foreground"
                    : "border-border text-muted",
              ].join(" ")}
            >
              {s.n < step ? "✓" : s.n}
            </div>
            <span
              className={[
                "text-xs font-medium",
                s.n <= step ? "text-foreground" : "text-muted",
              ].join(" ")}
            >
              {s.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={[
                "mx-2 mb-5 h-0.5 w-16 sm:w-24",
                s.n < step ? "bg-white" : "bg-border",
              ].join(" ")}
            />
          )}
        </div>
      ))}
    </div>
  );
}
