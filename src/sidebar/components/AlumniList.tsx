import React, { useState } from "react";
import { Search } from "lucide-react";
import { AlumniCard } from "@/sidebar/components/AlumniCard";
import { EmptyState } from "@/sidebar/components/EmptyState";
import type { Alumni } from "@/models";

interface AlumniListProps {
  alumni: Alumni[];
  searchAlumni: (query: string) => Alumni[];
  removeAlumni: (profileLink: string) => void;
}

export function AlumniList({ alumni, searchAlumni, removeAlumni }: AlumniListProps) {
  const [query, setQuery] = useState("");

  const filtered = query ? searchAlumni(query) : alumni;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Search */}
      <div className="relative mb-2">
        <Search
          size={13}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary"
        />
        <input
          type="text"
          placeholder="Search alumni..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-8 pr-3 py-2 text-xs bg-surface-secondary border border-border-light rounded-btn text-text placeholder:text-text-tertiary focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all"
        />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto sidebar-scroll space-y-1.5">
        {filtered.length === 0 ? (
          <EmptyState hasQuery={!!query} />
        ) : (
          filtered.map((alum) => (
            <AlumniCard
              key={alum.profileLink}
              alumni={alum}
              onRemove={() => removeAlumni(alum.profileLink)}
            />
          ))
        )}
      </div>
    </div>
  );
}
