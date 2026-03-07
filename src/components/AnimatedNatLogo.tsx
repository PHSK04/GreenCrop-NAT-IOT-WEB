import { useEffect, useMemo, useState } from "react";

type Point = { x: number; y: number };
type Segment = Point[];

const LOGO_WIDTH = 804;
const LOGO_HEIGHT = 498;
const PHASES = [0, 0.34, 0.68];

const RAW_SEGMENTS: Array<Array<[number, number]>> = [
  [[0.042, 0.262], [0.042, 0.595]],
  [[0.079, 0.196], [0.079, 0.552], [0.166, 0.552]],
  [[0.113, 0.286], [0.113, 0.667]],
  [[0.097, 0.096], [0.319, 0.619]],
  [[0.323, 0.222], [0.323, 0.566]],
  [[0.448, 0.62], [0.543, 0.292]],
  [[0.543, 0.292], [0.639, 0.611]],
  [[0.512, 0.432], [0.612, 0.432]],
  [[0.683, 0.183], [0.928, 0.183]],
  [[0.814, 0.183], [0.814, 0.575]],
  [[0.748, 0.319], [0.857, 0.319]],
  [[0.857, 0.319], [0.857, 0.523]],
];

const CIRCUIT_SEGMENTS: Segment[] = RAW_SEGMENTS.map((points) =>
  points.map(([x, y]) => ({ x: x * LOGO_WIDTH, y: y * LOGO_HEIGHT })),
);

const distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);

const lerp = (a: Point, b: Point, t: number): Point => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});

const polylineLength = (points: Segment): number => {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) total += distance(points[i - 1], points[i]);
  return total;
};

const pointAtDistance = (points: Segment, offset: number): Point => {
  if (points.length <= 1) return points[0] ?? { x: 0, y: 0 };

  let traversed = 0;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const segLen = distance(a, b);
    const end = traversed + segLen;
    if (offset <= end || i === points.length - 1) {
      const local = segLen === 0 ? 0 : Math.max(0, Math.min(1, (offset - traversed) / segLen));
      return lerp(a, b, local);
    }
    traversed = end;
  }

  return points[points.length - 1];
};

const extractSectionLines = (points: Segment, from: number, to: number) => {
  const lines: Array<{ a: Point; b: Point }> = [];
  if (to <= from) return lines;

  let traversed = 0;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const segLen = distance(a, b);
    const segStart = traversed;
    const segEnd = traversed + segLen;
    const overlapStart = Math.max(from, segStart);
    const overlapEnd = Math.min(to, segEnd);

    if (overlapEnd > overlapStart && segLen > 0) {
      const t1 = (overlapStart - segStart) / segLen;
      const t2 = (overlapEnd - segStart) / segLen;
      lines.push({ a: lerp(a, b, t1), b: lerp(a, b, t2) });
    }

    traversed = segEnd;
  }

  return lines;
};

interface AnimatedNatLogoProps {
  src: string;
  className?: string;
  speedMs?: number;
}

export function AnimatedNatLogo({ src, className = "", speedMs = 2200 }: AnimatedNatLogoProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      setProgress(((now - start) % speedMs) / speedMs);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [speedMs]);

  const metrics = useMemo(() => {
    const lengths = CIRCUIT_SEGMENTS.map((segment) => polylineLength(segment));
    const starts: number[] = [];
    let total = 0;
    for (const len of lengths) {
      starts.push(total);
      total += len;
    }
    return { lengths, starts, total };
  }, []);

  const dynamic = useMemo(() => {
    const trails: Array<{ id: string; a: Point; b: Point }> = [];
    const heads: Array<{ id: string; p: Point }> = [];
    const trailLength = metrics.total * 0.16;

    for (const phase of PHASES) {
      const headDistance = ((progress + phase) % 1) * metrics.total;
      const tailDistance = headDistance - trailLength;

      for (let i = 0; i < CIRCUIT_SEGMENTS.length; i += 1) {
        const segment = CIRCUIT_SEGMENTS[i];
        const segStart = metrics.starts[i];
        const segEnd = segStart + metrics.lengths[i];
        const from = Math.max(segStart, tailDistance);
        const to = Math.min(segEnd, headDistance);
        if (to <= from) continue;

        const sectionLines = extractSectionLines(segment, from - segStart, to - segStart);
        sectionLines.forEach((line, index) => {
          trails.push({ id: `${phase}-${i}-${index}`, a: line.a, b: line.b });
        });
      }

      let headIndex = CIRCUIT_SEGMENTS.length - 1;
      for (let i = 0; i < CIRCUIT_SEGMENTS.length; i += 1) {
        const start = metrics.starts[i];
        const end = start + metrics.lengths[i];
        if (headDistance >= start && headDistance <= end) {
          headIndex = i;
          break;
        }
      }

      const local = Math.max(0, Math.min(metrics.lengths[headIndex], headDistance - metrics.starts[headIndex]));
      heads.push({ id: `head-${phase}`, p: pointAtDistance(CIRCUIT_SEGMENTS[headIndex], local) });
    }

    return { trails, heads };
  }, [progress, metrics]);

  return (
    <div className={`relative ${className}`} style={{ aspectRatio: `${LOGO_WIDTH} / ${LOGO_HEIGHT}` }}>
      <img
        src={src}
        alt="GreenCrop NAT IOT"
        className="h-full w-full select-none object-contain"
        draggable={false}
      />
      <svg
        viewBox={`0 0 ${LOGO_WIDTH} ${LOGO_HEIGHT}`}
        className="pointer-events-none absolute inset-0 h-full w-full"
      >
        {CIRCUIT_SEGMENTS.map((segment, index) => (
          <polyline
            key={`base-${index}`}
            points={segment.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="rgba(132,255,150,0.18)"
            strokeWidth={3.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {dynamic.trails.map((trail) => (
          <line
            key={trail.id}
            x1={trail.a.x}
            y1={trail.a.y}
            x2={trail.b.x}
            y2={trail.b.y}
            stroke="rgba(155,255,138,0.66)"
            strokeWidth={7.2}
            strokeLinecap="round"
          />
        ))}

        {dynamic.heads.map((head) => (
          <g key={head.id}>
            <circle cx={head.p.x} cy={head.p.y} r={11} fill="rgba(135,255,104,0.38)" />
            <circle cx={head.p.x} cy={head.p.y} r={4.2} fill="rgba(246,255,224,0.98)" />
          </g>
        ))}
      </svg>
    </div>
  );
}
