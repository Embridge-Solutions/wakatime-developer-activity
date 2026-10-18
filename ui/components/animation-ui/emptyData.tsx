"use client";

import React from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { Database, Clock, X, RotateCcw } from "lucide-react";
import { Button } from "../ui/button";

// Dynamically import Lottie to optimize performance
const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

export interface FullPageNoDataProps {
  minimal?: boolean;
  className?: string;
  onClose?: () => void;
  date?: Date;
}

/**
 * A ultra-premium "No Data" component with reduced and fixed animation sizing.
 * Restores text context while optimizing the visual footprint for a professional feel.
 */
export function EmptyData({
  minimal = true,
  className,
  onClose,
  date,
}: FullPageNoDataProps) {
  const [animationData, setAnimationData] = React.useState<any>(null);

  // Load the local animation from public/animations/no-data.json
  React.useEffect(() => {
    fetch("/animations/no-data.json")
      .then((res) => res.json())
      .then((data) => setAnimationData(data))
      .catch((err) =>
        console.error("Error loading no-data.json Lottie animation:", err),
      );
  }, []);

  const Illustration = ({ isMinimal = false }) => (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center select-none group w-full",
        isMinimal ? "w-[320px] h-[320px]" : "w-[480px] h-[480px]",
      )}
    >
      {/* Background Depth Effects */}
      <div className="absolute inset-0 z-0 overflow-visible pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.15, 0.1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-teal-500/10 rounded-full blur-[80px]"
        />
      </div>

      {/* Lottie Animation Display */}
      <div className="relative z-10 w-full h-full flex items-center justify-center drop-shadow-[0_25px_50px_rgba(20,184,166,0.1)]">
        {animationData ? (
          <Lottie
            animationData={animationData}
            loop={true}
            className="w-full h-full transform hover:scale-105 transition-transform duration-1000"
          />
        ) : (
          <div className="w-12 h-12 border-4 border-teal-500/10 border-t-teal-500 rounded-full animate-spin" />
        )}
      </div>
    </div>
  );

  // --- MINIMAL (TABLE/IN-PAGE) VIEW ---
  if (minimal) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center py-12 w-full min-h-[500px] px-6 animate-in fade-in zoom-in-95 duration-1000",
          className,
        )}
      >
        <Illustration isMinimal />
      </div>
    );
  }

  // --- FULL PAGE OVERLAY VIEW ---
  return (
    <div
      className={cn(
        "fixed inset-0 z-[1000] flex items-center justify-center bg-white/80 dark:bg-slate-950/90 backdrop-blur-2xl p-10 transition-all duration-700 overflow-hidden",
        className,
      )}
    >
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-10 right-10 p-5 z-[1200] rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl hover:scale-110 active:scale-95 transition-all text-slate-400 hover:text-rose-500 group"
        >
          <X className="w-6 h-6 group-hover:rotate-180 transition-transform duration-700" />
        </button>
      )}

      <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center">
        <Illustration />

        <div className="mt-8 flex flex-col items-center text-center space-y-10">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-slate-950 text-white dark:bg-white dark:text-slate-900 shadow-xl border border-slate-800">
              <Database className="w-4 h-4 text-teal-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em]">
                Status: Zero_Signal
              </span>
            </div>

            <h1 className="text-6xl lg:text-7xl font-black text-slate-900 dark:text-white tracking-tighter italic uppercase">
              No Data{" "}
              <span className="text-transparent bg-clip-text bg-linear-to-r from-teal-500 to-cyan-700">
                Found
              </span>
            </h1>

            <p className="text-lg text-slate-500 dark:text-slate-400 font-medium max-w-xl mx-auto leading-relaxed">
              We completed a full diagnostic sweep of the system architecture,
              but no relevant data points were detected.
            </p>

            {date && (
              <div className="inline-flex items-center gap-3 px-6 py-2 rounded-2xl bg-teal-500/5 text-xs font-mono font-black text-teal-600 dark:text-teal-400 mt-6 border border-teal-500/10">
                <Clock className="w-4 h-4" />
                SYNC_POINT: {date.toLocaleTimeString()}
              </div>
            )}
          </div>

          <Button
            onClick={() => window.location.reload()}
            className="h-16 px-12 rounded-2xl bg-slate-950 dark:bg-white text-white dark:text-slate-900 font-black text-lg transition-all shadow-2xl hover:-translate-y-2 active:scale-95 flex items-center gap-4 group"
          >
            <RotateCcw className="w-5 h-5 group-hover:rotate-[-360deg] transition-transform duration-1000" />
            REFRESH PIPELINE
          </Button>
        </div>
      </div>
    </div>
  );
}

export default EmptyData;
