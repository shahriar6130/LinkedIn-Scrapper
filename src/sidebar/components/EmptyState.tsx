import React from "react";
import { UserX, SearchX } from "lucide-react";

interface EmptyStateProps {
  hasQuery?: boolean;
}

export function EmptyState({ hasQuery }: EmptyStateProps) {
  if (hasQuery) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <SearchX size={28} className="text-text-tertiary mb-2" />
        <p className="text-xs text-text-secondary font-medium">No results found</p>
        <p className="text-2xs text-text-tertiary mt-0.5">
          Try a different search term
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center mb-3">
        <UserX size={18} className="text-brand-500" />
      </div>
      <p className="text-xs text-text font-medium">No alumni collected yet</p>
      <p className="text-2xs text-text-tertiary mt-1 max-w-[200px] leading-relaxed">
        Visit a LinkedIn profile and click "Add Alumni" to start building your collection.
      </p>
    </div>
  );
}
