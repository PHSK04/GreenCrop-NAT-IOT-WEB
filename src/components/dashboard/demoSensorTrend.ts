import type { SensorTrendPoint } from './SensorTrendChart';

/** Presentation-only readings. Never written to MachineContext or device telemetry. */
export function createDemoSensorTrend(endTime: number): SensorTrendPoint[] {
  return Array.from({ length: 30 }, (_, index) => {
    const t = index / 29;
    return {
      time: endTime - (29 - index) * 60_000,
      ph: Number((6.65 + .13 * Math.sin(t * 7) + .035 * Math.sin(t * 24)).toFixed(2)),
      temp: Number((26.1 + .7 * t + .17 * Math.sin(t * 9)).toFixed(2)),
      ec: Number((1.62 + .055 * Math.sin(t * 8) + .025 * t).toFixed(3)),
    };
  });
}
