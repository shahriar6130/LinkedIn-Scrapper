import React from "react";
import { motion } from "framer-motion";
import { X, ExternalLink, GraduationCap } from "lucide-react";
import type { Alumni } from "@/models";
import { truncate } from "@/utils";

interface AlumniCardProps {
  alumni: Alumni;
  onRemove: () => void;
}

export function AlumniCard({ alumni, onRemove }: AlumniCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="group relative bg-surface-secondary rounded-btn p-2.5 hover:shadow-card transition-all cursor-pointer"
      onClick={() => window.open(alumni.profileLink, "_blank")}
    >
      <div className="flex items-start gap-2.5">
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-border">
          {alumni.profilePicture ? (
            <img
              src={alumni.profilePicture.replace(/scale_\d+_\d+/, "scale_400_400")}
              alt={alumni.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-tertiary text-xs font-semibold">
              {alumni.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <h3 className="text-xs font-semibold text-text truncate">
              {alumni.name}
            </h3>
            <ExternalLink
              size={10}
              className="text-text-tertiary flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            />
          </div>
          {alumni.designation && (
            <p className="text-2xs text-text-secondary truncate mt-0.5">
              {truncate(alumni.designation, 40)}
            </p>
          )}
          {alumni.companyName && (
            <p className="text-2xs text-text-tertiary truncate">
              {alumni.companyName}
            </p>
          )}
          {alumni.educationInstitute && (
            <div className="flex items-center gap-1 mt-0.5">
              <GraduationCap size={9} className="text-text-tertiary flex-shrink-0" />
              <div className="flex flex-col min-w-0">
                <p className="text-2xs text-text-tertiary truncate">
                  {truncate(alumni.educationInstitute, 40)}
                </p>
                {(alumni.degree || alumni.educationTimeline) && (
                  <p className="text-2xs text-text-tertiary/70 truncate">
                    {alumni.degree}{alumni.degree && alumni.educationTimeline ? " · " : ""}{alumni.educationTimeline}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Remove button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute top-1.5 right-1.5 p-1 rounded-btn opacity-0 group-hover:opacity-100 hover:bg-error/10 text-text-tertiary hover:text-error transition-all"
        title="Remove"
      >
        <X size={12} />
      </button>
    </motion.div>
  );
}
