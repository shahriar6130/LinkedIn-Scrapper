import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle, AlertCircle, AlertTriangle } from "lucide-react";

interface ToastProps {
  message: string;
  type: "success" | "error" | "warning";
  onDismiss: () => void;
}

export function Toast({ message, type, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 2500);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const icons = {
    success: <CheckCircle size={14} className="text-success" />,
    error: <AlertCircle size={14} className="text-error" />,
    warning: <AlertTriangle size={14} className="text-warning" />,
  };

  const bgColors = {
    success: "bg-success/10 border-success/20",
    error: "bg-error/10 border-error/20",
    warning: "bg-warning/10 border-warning/20",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`absolute bottom-4 left-4 right-4 px-3 py-2.5 rounded-btn border ${bgColors[type]} flex items-center gap-2`}
    >
      {icons[type]}
      <span className="text-xs font-medium text-text">{message}</span>
    </motion.div>
  );
}
