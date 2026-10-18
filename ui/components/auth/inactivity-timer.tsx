"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { clearTokens } from "@/utils/auth";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { INACTIVE_LIMIT, COUNTDOWN_LIMIT } from "@/config/config";
import { useUserLogoutMutation } from "@/redux/slice/auth";

const IDLE_TIMEOUT = INACTIVE_LIMIT * 60 * 1000; // 10 minutes of complete inactivity
const COUNTDOWN_TIME = COUNTDOWN_LIMIT * 60 * 1000; // 5 minutes countdown before log out

const InactivityTimer = () => {
  const router = useRouter();
  const [userLogout] = useUserLogoutMutation();
  const [isIdle, setIsIdle] = useState(false);
  const [timeLeft, setTimeLeft] = useState(COUNTDOWN_TIME);

  const idleTimeout = useRef<NodeJS.Timeout | null>(null);
  const countdownInterval = useRef<NodeJS.Timeout | null>(null);

  const logout = useCallback(async () => {
    try {
      await userLogout().unwrap();
      clearTokens();
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      clearTokens();
      router.push("/login");
    }
  }, [router]);

  const startIdleTimer = useCallback(() => {
    if (idleTimeout.current) clearTimeout(idleTimeout.current);
    if (countdownInterval.current) clearInterval(countdownInterval.current);

    setIsIdle(false);
    setTimeLeft(COUNTDOWN_TIME);

    idleTimeout.current = setTimeout(() => {
      setIsIdle(true);
    }, IDLE_TIMEOUT);
  }, []);

  const resetTimer = useCallback(() => {
    // We only explicitly reset if the user interacts.
    // They requested: "incase user use the application again its refereshed show remove that timer"
    startIdleTimer();
  }, [startIdleTimer]);

  useEffect(() => {
    startIdleTimer();

    const events = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
      "click",
    ];

    const handleActivity = () => {
      resetTimer();
    };

    events.forEach((event) => window.addEventListener(event, handleActivity));

    return () => {
      if (idleTimeout.current) clearTimeout(idleTimeout.current);
      if (countdownInterval.current) clearInterval(countdownInterval.current);
      events.forEach((event) =>
        window.removeEventListener(event, handleActivity),
      );
    };
  }, [resetTimer, startIdleTimer]);

  useEffect(() => {
    if (isIdle) {
      countdownInterval.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1000) {
            clearInterval(countdownInterval.current!);
            logout(); // Log out immediately when time reaches 0
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);
    }

    return () => {
      if (countdownInterval.current) clearInterval(countdownInterval.current);
    };
  }, [isIdle, logout]);

  if (!isIdle) return null;

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200 border border-slate-100">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="w-6 h-6 text-rose-500 animate-pulse" />
          <h2 className="text-lg font-semibold text-slate-800">
            Session Expiring
          </h2>
        </div>

        <p className="text-sm text-slate-500 mb-5">
          You will be logged out in{" "}
          <span className="font-mono font-bold text-rose-600 text-base">
            {String(minutes).padStart(2, "0")}:
            {String(seconds).padStart(2, "0")}
          </span>{" "}
          due to inactivity.
        </p>

        <div className="flex w-full gap-3">
          <Button
            variant="outline"
            className="flex-1 py-4 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-50 h-10 text-sm font-medium"
            onClick={logout}
          >
            Log Out
          </Button>
          <Button
            onClick={resetTimer}
            className="flex-1 py-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white h-10 text-sm font-medium"
          >
            Stay Logged In
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InactivityTimer;
