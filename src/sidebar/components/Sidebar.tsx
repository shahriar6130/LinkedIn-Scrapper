import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SIDEBAR_WIDTH, SIDEBAR_COLLAPSED_WIDTH } from "@/core/constants";
import { useServices } from "@/core/container";
import { SidebarHeader } from "@/sidebar/components/SidebarHeader";
import { ProfileCard } from "@/sidebar/components/ProfileCard";
import { AddAlumniButton } from "@/sidebar/components/AddAlumniButton";
import { CollectionStats } from "@/sidebar/components/CollectionStats";
import { AlumniList } from "@/sidebar/components/AlumniList";
import { ExportCard } from "@/sidebar/components/ExportCard";
import { RecentActivity } from "@/sidebar/components/RecentActivity";
import { Toast } from "@/sidebar/components/Toast";
import type { useProfile } from "@/sidebar/hooks/useProfile";
import type { useAlumni } from "@/sidebar/hooks/useAlumni";

interface SidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
  profile: ReturnType<typeof useProfile>;
  alumni: ReturnType<typeof useAlumni>;
}

export function Sidebar({
  isOpen,
  isCollapsed,
  onClose,
  onToggleCollapse,
  profile,
  alumni,
}: SidebarProps) {
  const { export: exportService } = useServices();
  const [toast, setToast] = React.useState<{
    message: string;
    type: "success" | "error" | "warning";
  } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "warning" = "success") => {
    setToast({ message, type });
  };

  const handleAddAlumni = () => {
    if (!profile.profile) return;
    const p = profile.profile;
    const success = alumni.addAlumni({
      name: p.name,
      designation: p.designation,
      companyName: p.companyName,
      profileLink: p.profileLink,
      location: p.location,
      educationInstitute: p.educationInstitute,
      degree: p.degree,
      educationTimeline: p.educationTimeline,
      profilePicture: p.profilePicture,
      hostedPicture: p.hostedPicture ?? "",
      connectionDegree: p.connectionDegree,
      about: p.about ?? "",
      skills: JSON.stringify(p.skills ?? []),
      industry: p.industry ?? "",
      experiences: p.experiences ?? "[]",
    });
    if (success) {
      showToast(`${profile.profile.name} added!`, "success");
    } else {
      showToast("Already in collection", "warning");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed top-0 right-0 h-screen bg-surface shadow-sidebar flex flex-col border-l border-border-light"
          style={{ width: isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH }}
        >
          <SidebarHeader
            isCollapsed={isCollapsed}
            onClose={onClose}
            onToggleCollapse={onToggleCollapse}
          />

          {!isCollapsed && (
            <div className="flex flex-col flex-1 overflow-hidden">
              {/* Profile Section */}
              <div className="px-4 pt-3 pb-2">
                <ProfileCard
                  profile={profile.profile}
                  loading={profile.loading}
                  error={profile.error}
                  onRetry={profile.refetch}
                />
              </div>

              {/* Add Alumni CTA */}
              <div className="px-4 pb-3">
                <AddAlumniButton
                  profile={profile.profile}
                  loading={profile.loading}
                  isAdded={
                    profile.profile
                      ? alumni.isAdded(profile.profile.profileLink)
                      : false
                  }
                  onAdd={handleAddAlumni}
                />
              </div>

              {/* Stats */}
              <div className="px-4 pb-3">
                <CollectionStats
                  totalCount={alumni.totalCount}
                  todayCount={alumni.todayCount}
                />
              </div>

              {/* Alumni List */}
              <div className="flex-1 overflow-hidden flex flex-col px-4">
                <AlumniList
                  alumni={alumni.alumni}
                  searchAlumni={alumni.searchAlumni}
                  removeAlumni={alumni.removeAlumni}
                />
              </div>

              {/* Export */}
              <div className="px-4 py-3 border-t border-border-light">
                <ExportCard
                  count={alumni.totalCount}
                  onExportCSV={() => {
                    exportService.exportCSV(alumni.alumni);
                    showToast("CSV exported!", "success");
                  }}
                  onExportExcel={() => {
                    exportService.exportExcel(alumni.alumni);
                    showToast("Excel exported!", "success");
                  }}
                />
              </div>

              {/* Recent Activity */}
              <div className="px-4 pb-3">
                <RecentActivity alumni={alumni.alumni.slice(0, 3)} />
              </div>
            </div>
          )}

          {/* Toast */}
          {toast && (
            <Toast
              message={toast.message}
              type={toast.type}
              onDismiss={() => setToast(null)}
            />
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
