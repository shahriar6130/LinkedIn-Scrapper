import React from "react";
import { MapPin, Building2, GraduationCap, ExternalLink, RefreshCw } from "lucide-react";
import { ProfileCardSkeleton } from "@/sidebar/components/ProfileCardSkeleton";
import type { ProfileData } from "@/sidebar/lib/constants";
import { truncate } from "@/sidebar/lib/utils";

interface ProfileCardProps {
  profile: ProfileData | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

export function ProfileCard({ profile, loading, error, onRetry }: ProfileCardProps) {
  if (loading) return <ProfileCardSkeleton />;

  if (error || !profile) {
    return (
      <div className="bg-surface-secondary rounded-card p-3 text-center">
        <p className="text-xs text-text-tertiary mb-2">
          {error || "No profile detected"}
        </p>
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1 text-xs text-brand-500 hover:text-brand-600 font-medium transition-colors"
        >
          <RefreshCw size={12} />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-surface-secondary rounded-card p-3">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-border">
          {profile.profilePicture ? (
            <img
              src={profile.profilePicture.replace(/scale_\d+_\d+/, "scale_400_400")}
              alt={profile.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-tertiary text-sm font-semibold">
              {profile.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-text leading-tight truncate">
            {profile.name}
          </h2>
          {profile.designation && (
            <p className="text-xs text-text-secondary mt-0.5 truncate">
              {truncate(profile.designation, 50)}
            </p>
          )}
        </div>
      </div>

      {/* Meta rows */}
      <div className="mt-2.5 space-y-1.5">
        {profile.companyName && (
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <Building2 size={12} className="text-text-tertiary flex-shrink-0" />
            <span className="truncate">{profile.companyName}</span>
          </div>
        )}
        {profile.location && (
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <MapPin size={12} className="text-text-tertiary flex-shrink-0" />
            <span className="truncate">{profile.location}</span>
          </div>
        )}
        {profile.educationInstitute && (
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <GraduationCap size={12} className="text-text-tertiary flex-shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="truncate">{profile.educationInstitute}</span>
              {(profile.degree || profile.educationTimeline) && (
                <span className="text-2xs text-text-tertiary truncate">
                  {profile.degree}{profile.degree && profile.educationTimeline ? " · " : ""}{profile.educationTimeline}
                </span>
              )}
            </div>
          </div>
        )}
        <a
          href={profile.profileLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs text-brand-500 hover:text-brand-600 transition-colors"
        >
          <ExternalLink size={12} className="flex-shrink-0" />
          <span className="truncate">{profile.profileLink}</span>
        </a>
      </div>
    </div>
  );
}
