"use client";

import React from "react";
import { APP_CONFIG } from "@/config/config";
import { BRAND, PRINT_TITLE } from "@/config/brand.config";

type PrintLayoutProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  companyName?: string;
  logoPath?: string;
  showWatermark?: boolean;
  watermarkPath?: string;
  showPageNumbers?: boolean;
  totalPageCount?: number;
  orientation?: "landscape" | "portrait";

};

export default function PrintLayout({
  title,
  subtitle,
  children,
  companyName = APP_CONFIG.COMPANY_NAME,
  logoPath = BRAND.logo.print,
  showWatermark = Boolean(BRAND.logo.watermark),
  watermarkPath = BRAND.logo.watermark,
  showPageNumbers = true,
  totalPageCount,
  orientation = "landscape",

}: PrintLayoutProps) {
  const isLandscape = orientation === "landscape";

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          @page { margin: 0; size: A4; }
          *, *::before, *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            background-color: #ffffff !important;
          }
          .print-container { 
            width: 100%;
            max-width: 210mm;
            min-height: 297mm;
            counter-reset: page; 
            margin: 0 auto;
            background-color: #ffffff !important;
            position: relative;
          }
          @media print {
            .print-container {
               width: 210mm !important;
               max-width: none !important;
            }
          }
          thead { 
            display: table-header-group; 
            counter-increment: page;
          }
          tfoot { display: table-footer-group; }
          .page-number::after { content: "Page " counter(page)${totalPageCount ? ` " of ${totalPageCount}"` : ""}; }
          .print-content-area, .print-content-area > div, .print-content-area table {
            width: 100% !important;
            min-width: 100% !important;
            max-width: none !important;
            table-layout: auto !important;
          }
        }
      `,
        }}
      />

      {/* 1. Dashboard View (Screen Only) */}
      <div className="print:hidden">{children}</div>

      {/* 2. Print View (Generated Only for Print) */}
      <div className="hidden print:block print-container print:m-0 print:bg-white">
        {/* WATERMARK (Centered on all pages) */}
        {showWatermark && (
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[100] opacity-[0.08] flex items-center justify-center overflow-hidden">
            <img
              src={watermarkPath}
              alt="Watermark"
              className="w-[400px] h-auto object-contain"
            />
          </div>
        )}
        {/* VISUAL FIXED HEADER (REPEATING) */}
        <div className="fixed top-0 left-0 right-0 h-[70px] z-[200] print:block hidden">
          <div className="w-full bg-slate-950 border-b-[3px] border-theme-primary px-5 py-2 h-[70px] flex items-center justify-between shadow-sm">
            {/* Left Side: Logo & Company Name */}
            <div className="flex items-center gap-3 h-full">
              <div className="flex items-center justify-center h-full shrink-0">
                <img
                  src={logoPath}
                  alt={BRAND.logo.alt}
                  className="h-[44px] w-auto max-w-[150px] object-contain"
                />
              </div>
              <div className="flex flex-col justify-center h-full">
                <h1 className="text-[20px] font-black text-white tracking-[0.07em]">
                  {companyName}
                </h1>
                <p className="text-[9px] font-semibold text-slate-400 tracking-widest uppercase leading-none">
                  {PRINT_TITLE}
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="h-10 w-px bg-white/20 mx-2 shrink-0" />

            {/* Right Side: Report Title & Subtitle */}
            <div className="text-right flex flex-col items-end justify-center flex-1">
              <p className="text-[16px] font-bold text-white tracking-tight leading-tight">
                {title}
              </p>
              {subtitle && (
                <p className="text-[11px] font-medium text-slate-300 tracking-tight mt-0.5 whitespace-nowrap">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* VISUAL FIXED FOOTER (STATIC TEXT ONLY) */}
        <div className="fixed bottom-0 left-0 right-0 h-[40px] z-[200] flex flex-col justify-end pb-[0.5cm] px-4 print:block hidden">
          <div className="w-full border-t border-gray-300 pt-3 bg-white">
            <div className="flex items-center justify-between text-gray-500 text-[9px]">
              <div className="w-1/3 text-left font-bold  ">
                <span suppressHydrationWarning>
                  {APP_CONFIG.POWERED_BY_TEXT}
                </span>
              </div>
              <div className="w-1/3 text-center">
                {/* Page numbers removed as requested */}
              </div>
              <div className="w-1/3 text-right font-bold uppercase tracking-tighter">
                <span suppressHydrationWarning>
                  {new Date().toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}{" "}
                  |{" "}
                  {new Date().toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT SHELL (DIV BASED) */}
        <div className="w-full relative flex flex-col">
          {/* Header Spacer for Fixed Header */}
          <div className="h-[75px] w-full print-header-space shrink-0"></div>

          {/* Body Content Area */}
          <div className=" w-full px-2 pb-[80px]">
            <div className="relative z-10 w-full">
              {/* MAIN CONTENT CARD */}
              <div className="bg-white border border-gray-100 rounded-xl p-0 relative overflow-hidden w-full">
                {/* Decorative Background Accents */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-red-50/30 rounded-bl-full -mr-20 -mt-20 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-red-50/20 rounded-tr-full -ml-16 -mb-16 pointer-events-none"></div>

                <div className="relative z-10 w-full">
                  {/* MAIN CONTENT AREA */}
                  <div className="print-content-area w-full">{children}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Spacer for Fixed Footer */}
          <div className="h-[70px] w-full print-footer-space shrink-0"></div>
        </div>
      </div>
    </>
  );
}
