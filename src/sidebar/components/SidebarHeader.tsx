import React from "react";
import { X, PanelRightClose, PanelRightOpen } from "lucide-react";

interface SidebarHeaderProps {
  isCollapsed: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
}

export function SidebarHeader({
  isCollapsed,
  onClose,
  onToggleCollapse,
}: SidebarHeaderProps) {
  if (isCollapsed) {
    return (
      <div className="flex items-center justify-center py-3 border-b border-border-light">
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-btn hover:bg-surface-secondary text-text-secondary transition-colors"
        >
          <PanelRightOpen size={16} strokeWidth={2} />
        </button>
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-10 bg-surface border-b border-border-light px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-btn bg-brand-50 flex items-center justify-center">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-brand-500"
          >
            <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" />
            <rect x="2" y="9" width="4" height="12" />
            <circle cx="4" cy="4" r="2" />
          </svg>
        </div>
        <div>
          <h1 className="text-sm font-semibold tracking-tight text-text leading-tight">
            Alumni Scraper
          </h1>
          <p className="text-2xs text-text-tertiary font-normal">
            DU Network Collector
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-btn hover:bg-surface-secondary text-text-secondary transition-colors"
          title="Collapse"
        >
          <PanelRightClose size={15} strokeWidth={2} />
        </button>
        <button
          onClick={onClose}
          className="p-1.5 rounded-btn hover:bg-surface-secondary text-text-secondary transition-colors"
          title="Close"
        >
          <X size={15} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
