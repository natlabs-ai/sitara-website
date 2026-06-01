import React from "react";

interface StepProgressBarProps {
  steps: { id: string; label: string }[];
  currentIndex: number;
  activeClassName?: string;
  inactiveClassName?: string;
  activeStyle?: React.CSSProperties;
  inactiveStyle?: React.CSSProperties;
}

export default function StepProgressBar({
  steps,
  currentIndex,
  activeClassName = "bg-[--gold-color]",
  inactiveClassName = "bg-neutral-700",
  activeStyle,
  inactiveStyle,
}: StepProgressBarProps) {
  const current = steps[currentIndex];
  if (!current) return null;

  return (
    <nav className="no-print mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-[--gold-color]">
          {current.label}
        </span>
        <span className="text-xs text-neutral-400">
          Step {currentIndex + 1} of {steps.length}
        </span>
      </div>
      <div className="flex gap-1">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= currentIndex ? activeClassName : inactiveClassName
            }`}
            style={i <= currentIndex ? activeStyle : inactiveStyle}
          />
        ))}
      </div>
    </nav>
  );
}
