import React from "react";
import { motion } from "framer-motion";
import { UserPlus, Check, Loader2 } from "lucide-react";
import type { ProfileData } from "@/shared/types";

interface AddAlumniButtonProps {
  profile: ProfileData | null;
  loading: boolean;
  isAdded: boolean;
  onAdd: () => void;
}

export function AddAlumniButton({
  profile,
  loading,
  isAdded,
  onAdd,
}: AddAlumniButtonProps) {
  const disabled = !profile || loading || isAdded;

  return (
    <motion.button
      onClick={onAdd}
      disabled={disabled}
      className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-btn text-sm font-semibold transition-all cursor-pointer ${
        isAdded
          ? "bg-success/10 text-success border border-success/20"
          : "bg-brand-500 text-white hover:bg-brand-600 hover:shadow-card"
      } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none`}
      whileHover={!disabled ? { scale: 1.01, y: -1 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
    >
      {loading ? (
        <Loader2 size={15} className="animate-spin" />
      ) : isAdded ? (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 20 }}
        >
          <Check size={15} strokeWidth={2.5} />
        </motion.div>
      ) : (
        <UserPlus size={15} strokeWidth={2} />
      )}
      <span>{loading ? "Reading..." : isAdded ? "Added" : "Add Alumni"}</span>
    </motion.button>
  );
}
