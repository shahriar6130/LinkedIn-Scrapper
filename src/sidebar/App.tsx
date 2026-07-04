import React from "react";
import { useSidebar } from "@/sidebar/hooks/useSidebar";
import { useAlumni } from "@/sidebar/hooks/useAlumni";
import { useProfile } from "@/sidebar/hooks/useProfile";
import { LauncherButton } from "@/sidebar/components/LauncherButton";
import { Sidebar } from "@/sidebar/components/Sidebar";

export default function App() {
  const sidebar = useSidebar();
  const alumni = useAlumni();
  const profile = useProfile();

  return (
    <>
      <LauncherButton
        count={alumni.totalCount}
        isOpen={sidebar.isOpen}
        onClick={sidebar.toggle}
      />
      <Sidebar
        isOpen={sidebar.isOpen}
        isCollapsed={sidebar.isCollapsed}
        onClose={sidebar.close}
        onToggleCollapse={sidebar.toggleCollapse}
        profile={profile}
        alumni={alumni}
      />
    </>
  );
}
