import React from "react";
import { Clock } from "lucide-react";
import type { Alumni } from "@/sidebar/lib/constants";
import { timeAgo, truncate } from "@/sidebar/lib/utils";

interface RecentActivityProps {
  alumni: Alumni[];
}

export function RecentActivity({ alumni }: RecentActivityProps) {
  if (alumni.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <Clock size={11} className="text-text-tertiary" />
        <span className="text-2xs font-medium text-text-tertiary uppercase tracking-wider">
          Recent
        </span>
      </div>
      <div className="space-y-1">
        {alumni.map((alum) => (
          <div
            key={alum.profileLink}
            className="flex items-center justify-between py-1"
          >
            <span className="text-xs text-text-secondary truncate flex-1">
              {truncate(alum.name, 24)}
            </span>
            <span className="text-2xs text-text-tertiary flex-shrink-0 ml-2">
              {timeAgo(alum.addedAt)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
