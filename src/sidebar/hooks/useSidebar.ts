import { useState, useEffect, useCallback } from "react";

export function useSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  // Listen for toggle events from content script
  useEffect(() => {
    const handler = () => toggle();
    window.addEventListener("alumni-sidebar-toggle", handler);
    return () => window.removeEventListener("alumni-sidebar-toggle", handler);
  }, [toggle]);

  return { isOpen, isCollapsed, toggle, open, close, toggleCollapse };
}
