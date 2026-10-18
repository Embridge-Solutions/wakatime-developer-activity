"use client";

import { useEffect, useState, useRef } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter, usePathname } from "next/navigation";
import { menuItems } from "@/config/data-config";
import { useScopes } from "@/hooks/useScopes";
import BrandLogo from "@/components/common/BrandLogo";

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const isPathActive = (currentPath: string, item: any): boolean => {
  if (!currentPath || !item) return false;

  const current = currentPath.replace(/\/$/, "");
  const itemPath = item.path.replace(/\/$/, "");

  if (current === itemPath) return true;
  if (current.startsWith(itemPath + "/")) return true;

  if (item.subPaths && Array.isArray(item.subPaths)) {
    return item.subPaths.some((subPath: string) => {
      const normalizedSub = subPath.replace(/\/$/, "");
      return current === normalizedSub || current.startsWith(normalizedSub + "/");
    });
  }

  return false;
};

const Sidebar = ({ isCollapsed, onToggle }: SidebarProps) => {
  const router = useRouter();
  const currentPath = usePathname();
  const [pathName, setPathName] = useState("");
  const { canAccess, ready } = useScopes();

  // Dynamic scroll state indicators
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollTop, setCanScrollTop] = useState(false);
  const [canScrollBottom, setCanScrollBottom] = useState(false);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      setCanScrollTop(scrollTop > 5);
      setCanScrollBottom(scrollTop + clientHeight < scrollHeight - 5);
    }
  };

  useEffect(() => {
    setPathName(currentPath);
  }, [currentPath]);

  // Filter menu items by scope (`<access>_view`). Items without `access` are always visible.
  const visibleMenuItems = menuItems.filter((item) => !item.access || canAccess(item.access));

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener("scroll", checkScroll);
    }
    window.addEventListener("resize", checkScroll);
    return () => {
      if (el) el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [visibleMenuItems, isCollapsed]);

  return (
    <div
      className={cn(
        "relative z-20 h-full bg-theme-sidebar-bg text-white flex flex-col rounded-lg shrink-0 transition-colors duration-300 shadow-xl",
        "transition-[width] duration-300 ease-in-out border-r border-theme-border",
        isCollapsed ? "w-[70px]" : "w-64",
      )}
    >
      {/* ── Header / Logo ───────────────────────────────────────── */}
      <div
        className="relative flex items-center px-3 py-3 select-none border-b border-theme-border bg-theme-sidebar-bg transition-colors duration-300"
      >
        {/* Logo block */}
        {isCollapsed ? (
          /* Collapsed: compact logo fit to collapsed sidebar width */
          <div className="flex w-full justify-center items-center py-0.5">
            <BrandLogo variant="compact" className="h-8 max-w-[46px]" />
          </div>
        ) : (
          /* Expanded: brand logo header */
          <div className="flex items-center flex-1 min-w-0 h-10 px-1 overflow-hidden">
            <BrandLogo className="h-10 max-w-[150px]" />
          </div>
        )}

        {/* Toggle button — floating on the right edge */}
        {!isCollapsed && (
          <button
            type="button"
            onClick={onToggle}
            title="Collapse sidebar"
            className={cn(
              "ml-auto flex items-center justify-center w-7 h-7 rounded-lg shrink-0",
              "text-gray-400 transition-all duration-200 cursor-pointer",
              "hover:bg-white/10 hover:text-theme-primary",
              "hover:shadow-[0_0_8px_var(--theme-glow)]",
            )}
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
        {isCollapsed && (
          <button
            type="button"
            onClick={onToggle}
            title="Expand sidebar"
            className={cn(
              "absolute -right-3 top-2.5 z-10",
              "flex items-center justify-center w-6 h-6 rounded-full",
              "bg-theme-primary text-theme-active-text cursor-pointer",
              "shadow-[0_0_10px_var(--theme-glow-border)]",
              "hover:opacity-90 hover:scale-110",
              "transition-all duration-200",
              "border-2 border-theme-sidebar-bg",
            )}
            style={{ color: "var(--theme-active-text)" }}
          >
            <PanelLeftOpen className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Navigation Section with Dynamic Scroll Indicators */}
      <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden">
        {/* Dynamic Top Scroll Shadow Indicator */}
        <div
          className={cn(
            "absolute top-0 left-0 right-0 h-5 pointer-events-none z-10 transition-opacity duration-300 bg-gradient-to-b from-[var(--theme-sidebar-bg)] to-transparent",
            canScrollTop ? "opacity-100" : "opacity-0"
          )}
        />

        {/* Modernized Dynamic Scrollable Nav Container */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto py-3 sidebar-scrollbar space-y-3"
        >
          <div className="px-4">
            {!isCollapsed && (
              <p className="font-display text-[11px] font-semibold text-gray-500 uppercase tracking-[0.18em]">
                Menu
              </p>
            )}
          </div>
          <nav className="space-y-1 px-2">
            {/* Skeleton while scopes load */}
            {!ready && (
              <div className="space-y-1.5 animate-pulse">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-9 rounded-md bg-white/10",
                      isCollapsed ? "w-9 mx-auto" : "w-full",
                    )}
                  />
                ))}
              </div>
            )}
            {/* Scope-filtered menu items */}
            {ready &&
              visibleMenuItems.map((item, index) => {
                const Icon = item.icon;
                const active = isPathActive(pathName, item);

                return (
                  <a
                    key={index}
                    href={item.path}
                    onClick={(e) => {
                      e.preventDefault();
                      router.push(item.path);
                    }}
                    className={cn(
                      "relative flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors duration-200 group",
                      active
                        ? "bg-white/[0.07] text-white font-semibold"
                        : "text-theme-sidebar-text hover:bg-white/[0.04] hover:text-white",
                      isCollapsed && "justify-center px-0 w-10 h-10 mx-auto",
                    )}
                    title={isCollapsed ? item.label : undefined}
                  >
                    {/* Slanted brand bar marks the active page */}
                    {active && (
                      <span className="forge-marker absolute left-0 top-1/2 -translate-y-1/2" />
                    )}
                    {Icon && (
                      <Icon
                        className={cn(
                          "h-5 w-5 shrink-0 transition-colors duration-200",
                          active ? "text-theme-primary" : "text-gray-400 group-hover:text-white"
                        )}
                      />
                    )}

                    {!isCollapsed && (
                      <span className="text-sm font-medium whitespace-nowrap flex-1">
                        {item.label}
                      </span>
                    )}

                  </a>
                );
              })}
          </nav>
        </div>

        {/* Dynamic Bottom Scroll Shadow Indicator */}
        <div
          className={cn(
            "absolute bottom-0 left-0 right-0 h-5 pointer-events-none z-10 transition-opacity duration-300 bg-gradient-to-t from-[var(--theme-sidebar-bg)] to-transparent",
            canScrollBottom ? "opacity-100" : "opacity-0"
          )}
        />
      </div>

    </div>
  );
};

export default Sidebar;
