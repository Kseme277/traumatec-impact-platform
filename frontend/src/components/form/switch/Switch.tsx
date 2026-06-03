import { useCallback, useState } from "react";

interface SwitchProps {
  label?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
  color?: "blue" | "gray";
  "aria-label"?: string;
}

const Switch: React.FC<SwitchProps> = ({
  label,
  checked,
  defaultChecked = false,
  disabled = false,
  onChange,
  color = "blue",
  "aria-label": ariaLabel,
}) => {
  const isControlled = checked !== undefined;
  const [internalChecked, setInternalChecked] = useState(defaultChecked);
  const isChecked = isControlled ? checked : internalChecked;

  const handleToggle = () => {
    if (disabled) return;
    const newCheckedState = !isChecked;
    if (!isControlled) {
      setInternalChecked(newCheckedState);
    }
    onChange?.(newCheckedState);
  };

  const switchColors =
    color === "blue"
      ? {
          background: isChecked ? "bg-brand-500" : "bg-gray-200 dark:bg-white/10",
          knob: isChecked ? "translate-x-full bg-white" : "translate-x-0 bg-white",
        }
      : {
          background: isChecked ? "bg-gray-800 dark:bg-white/10" : "bg-gray-200 dark:bg-white/10",
          knob: isChecked ? "translate-x-full bg-white" : "translate-x-0 bg-white",
        };

  return (
    <label
      className={`inline-flex select-none items-center gap-3 text-sm font-medium ${
        disabled ? "cursor-not-allowed text-gray-400" : "cursor-pointer text-gray-700 dark:text-gray-400"
      }`}
      onClick={(event) => {
        event.preventDefault();
        handleToggle();
      }}
    >
      <div className="relative" role="switch" aria-checked={isChecked} aria-label={ariaLabel ?? label}>
        <div
          className={`block h-6 w-11 rounded-full transition duration-150 ease-linear ${
            disabled ? "pointer-events-none bg-gray-100 dark:bg-gray-800" : switchColors.background
          }`}
        />
        <div
          className={`absolute left-0.5 top-0.5 h-5 w-5 transform rounded-full shadow-theme-sm duration-150 ease-linear ${switchColors.knob}`}
        />
      </div>
      {label ? <span>{label}</span> : null}
    </label>
  );
};

export default Switch;
