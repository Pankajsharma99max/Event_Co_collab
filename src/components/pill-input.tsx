import type { ChangeEventHandler } from "react";

interface PillOptionProps {
  name: string;
  value: string;
  label: string;
  defaultChecked?: boolean;
  required?: boolean;
  disabled?: boolean;
  onChange?: ChangeEventHandler<HTMLInputElement>;
}

// Native radio/checkbox visually hidden, label styled as a pill using the
// `has-[:checked]` variant so state lives in the DOM (real form control),
// not duplicated React state.
export function PillRadio({ name, value, label, defaultChecked, required, disabled, onChange }: PillOptionProps) {
  return (
    <label
      className={[
        "cursor-pointer rounded-full border border-border bg-glass px-4 py-2 text-sm font-medium text-muted-2 transition hover:text-foreground",
        "has-[:checked]:border-white has-[:checked]:bg-white has-[:checked]:text-black",
        disabled ? "cursor-not-allowed opacity-40" : "",
      ].join(" ")}
    >
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        required={required}
        disabled={disabled}
        onChange={onChange}
        className="sr-only"
      />
      {label}
    </label>
  );
}

export function PillCheckbox({ name, value, label, defaultChecked, disabled, onChange }: PillOptionProps) {
  return (
    <label
      className={[
        "cursor-pointer rounded-full border border-border bg-glass px-3.5 py-1.5 text-xs font-medium text-muted-2 transition hover:text-foreground",
        "has-[:checked]:border-white has-[:checked]:bg-white has-[:checked]:text-black",
        disabled ? "cursor-not-allowed opacity-40" : "",
      ].join(" ")}
    >
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        disabled={disabled}
        onChange={onChange}
        className="sr-only"
      />
      {label}
    </label>
  );
}
