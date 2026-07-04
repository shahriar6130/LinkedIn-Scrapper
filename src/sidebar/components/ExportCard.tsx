import React from "react";
import { FileText, FileSpreadsheet } from "lucide-react";

interface ExportCardProps {
  count: number;
  onExportCSV: () => void;
  onExportExcel: () => void;
}

export function ExportCard({ count, onExportCSV, onExportExcel }: ExportCardProps) {
  const disabled = count === 0;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onExportCSV}
        disabled={disabled}
        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-btn text-xs font-medium border border-border bg-surface text-text-secondary hover:bg-surface-secondary hover:text-text hover:border-border transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        <FileText size={13} />
        <span>CSV</span>
      </button>
      <button
        onClick={onExportExcel}
        disabled={disabled}
        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-btn text-xs font-medium border border-border bg-surface text-text-secondary hover:bg-surface-secondary hover:text-text hover:border-border transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        <FileSpreadsheet size={13} />
        <span>Excel</span>
      </button>
      {count > 0 && (
        <span className="text-2xs text-text-tertiary">{count}</span>
      )}
    </div>
  );
}
