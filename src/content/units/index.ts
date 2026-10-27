// Registry of all Unit files. Add one import + one entry per new Unit.
// parseUnit() runs at import time, so an invalid Unit breaks the build.
import { parseUnit, type Unit } from "../schema";
import g8u01 from "./g8/u01-leisure-time.json";

export const UNITS: Unit[] = [parseUnit(g8u01)];

export function findUnit(id: string): Unit | undefined {
  return UNITS.find((unit) => unit.id === id);
}
