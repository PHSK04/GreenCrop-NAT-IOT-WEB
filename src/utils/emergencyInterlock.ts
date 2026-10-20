export type EmergencyInterlock = {
  requestedAt: number;
  confirmedAt: number | null;
};

// Release requires a board-confirmed lock followed by a newer unlocked sample.
// Sensor-only packets, reconnects and old cached samples must not release a stop.
export function updateEmergencyInterlock(
  current: EmergencyInterlock | null,
  sample: { locked: boolean; timestamp: number; lockReported: boolean },
): EmergencyInterlock | null {
  if (!sample.lockReported || !Number.isFinite(sample.timestamp)) return current;
  if (sample.locked) {
    if (!current) return { requestedAt: sample.timestamp, confirmedAt: sample.timestamp };
    if (sample.timestamp < current.requestedAt) return current;
    return { ...current, confirmedAt: Math.max(current.confirmedAt ?? 0, sample.timestamp) };
  }
  if (current?.confirmedAt != null && sample.timestamp > current.confirmedAt) return null;
  return current;
}
