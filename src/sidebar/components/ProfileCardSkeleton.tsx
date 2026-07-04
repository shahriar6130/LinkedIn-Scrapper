import React from "react";

export function ProfileCardSkeleton() {
  return (
    <div className="bg-surface-secondary rounded-card p-3 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-border" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 bg-border rounded w-3/4" />
          <div className="h-2.5 bg-border rounded w-1/2" />
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <div className="h-2.5 bg-border rounded w-2/3" />
        <div className="h-2.5 bg-border rounded w-1/2" />
        <div className="h-2.5 bg-border rounded w-3/5" />
      </div>
    </div>
  );
}
