import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, X } from "lucide-react";

interface LauncherButtonProps {
  count: number;
  isOpen: boolean;
  onClick: () => void;
}

export function LauncherButton({ count, isOpen, onClick }: LauncherButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      className="fixed right-0 top-1/2 -translate-y-1/2 z-[9999999] flex items-center gap-1.5 bg-brand-500 text-white rounded-l-btn pl-2.5 pr-3 py-3 shadow-launcher hover:bg-brand-600 transition-colors cursor-pointer"
      whileHover={{ x: -2 }}
      whileTap={{ scale: 0.97 }}
      initial={{ x: 100 }}
      animate={{ x: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.5 }}
    >
      <AnimatePresence mode="wait">
        {isOpen ? (
          <motion.div
            key="close"
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <X size={18} strokeWidth={2} />
          </motion.div>
        ) : (
          <motion.div
            key="users"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="relative"
          >
            <Users size={18} strokeWidth={2} />
            {count > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1.5 -right-2 bg-white text-brand-500 text-2xs font-bold rounded-pill min-w-[14px] h-[14px] flex items-center justify-center px-0.5"
              >
                {count > 99 ? "99+" : count}
              </motion.span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
