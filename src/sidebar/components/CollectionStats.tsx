import React from "react";
import { Users, CalendarPlus } from "lucide-react";

interface CollectionStatsProps {
  totalCount: number;
  todayCount: number;
}

export function CollectionStats({ totalCount, todayCount }: CollectionStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="bg-surface-secondary rounded-btn p-2.5 text-center">
        <div className="flex items-center justify-center gap-1.5 mb-1">
          <Users size={12} className="text-text-tertiary" />
        </div>
        <p className="text-lg font-bold text-text leading-none">{totalCount}</p>
        <p className="text-2xs text-text-tertiary mt-0.5">Total</p>
      </div>
      <div className="bg-surface-secondary rounded-btn p-2.5 text-center">
        <div className="flex items-center justify-center gap-1.5 mb-1">
          <CalendarPlus size={12} className="text-text-tertiary" />
        </div>
        <p className="text-lg font-bold text-text leading-none">{todayCount}</p>
        <p className="text-2xs text-text-tertiary mt-0.5">Today</p>
      </div>
    </div>
  );
}
