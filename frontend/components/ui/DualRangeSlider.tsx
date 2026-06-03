"use client";

interface Props {
  low: number;
  high: number;
  onChange: (low: number, high: number) => void;
}

export default function DualRangeSlider({ low, high, onChange }: Props) {
  const GAP = 5;

  return (
    <div className="dual-range">
      <div className="dual-range-track">
        <div className="dual-range-fill" style={{ left: low + "%", width: (high - low) + "%" }} />
      </div>
      <input
        type="range" min={0} max={100} value={low}
        className="dual-range-input"
        onChange={e => {
          const v = Number(e.target.value);
          if (v <= high - GAP) onChange(v, high);
        }}
      />
      <input
        type="range" min={0} max={100} value={high}
        className="dual-range-input"
        onChange={e => {
          const v = Number(e.target.value);
          if (v >= low + GAP) onChange(low, v);
        }}
      />
    </div>
  );
}
