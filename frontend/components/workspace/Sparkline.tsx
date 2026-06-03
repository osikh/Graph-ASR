interface Props {
  data: number[];
  color: string;
  w?: number;
  h?: number;
}

export default function Sparkline({ data, color, w = 120, h = 30 }: Props) {
  if (!data.length) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const rng = max - min || 1;
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - ((v - min) / rng) * (h - 4) - 2,
  }));
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];

  return (
    <svg width={w} height={h} style={{ overflow: "visible" }}>
      <path d={`${d} L ${w} ${h} L 0 ${h} Z`} fill={color} opacity="0.10" />
      <path d={d} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last.x} cy={last.y} r="2.6" fill={color} />
    </svg>
  );
}
