import type { Alumni } from "./alumni";

export interface ExportData {
  leads: Alumni[];
  exportedAt: number;
  count: number;
}
