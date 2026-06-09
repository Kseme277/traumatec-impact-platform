import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Button from "../ui/button/Button";
import { useSidebar } from "../../context/SidebarContext";
import { useTutorial } from "../../context/TutorialContext";
import { useTranslation } from "../../i18n/useTranslation";

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PADDING = 8;

export default function AppTutorial() {
  const { isActive, currentStep, stepIndex, steps, nextStep, prevStep, stopTutorial } = useTutorial();
  const { isExpanded, isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();
  const { t } = useTranslation();
  const [rect, setRect] = useState<SpotlightRect | null>(null);

  const updateRect = useCallback(() => {
    if (!isActive || !currentStep?.target || currentStep.center) {
      setRect(null);
      return;
    }
    const element = document.querySelector(`[data-tour="${currentStep.target}"]`);
    if (!element) {
      setRect(null);
      return;
    }
    const box = element.getBoundingClientRect();
    setRect({
      top: box.top - PADDING,
      left: box.left - PADDING,
      width: box.width + PADDING * 2,
      height: box.height + PADDING * 2,
    });
    element.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [currentStep, isActive]);

  useEffect(() => {
    if (!isActive) return;
    if (window.innerWidth >= 1024 && !isExpanded) {
      toggleSidebar();
    }
    if (window.innerWidth < 1024 && !isMobileOpen) {
      toggleMobileSidebar();
    }
  }, [isActive, isExpanded, isMobileOpen, toggleMobileSidebar, toggleSidebar]);

  useEffect(() => {
    if (!isActive || !currentStep) return;
    const timer = window.setTimeout(() => {
      if (currentStep.id === "generation" || currentStep.id === "documents") {
        document.querySelector<HTMLElement>('[data-tour="nav-documents"]')?.click();
      }
      if (currentStep.id === "admin") {
        document.querySelector<HTMLElement>('[data-tour="nav-admin"]')?.click();
      }
    }, 320);
    return () => window.clearTimeout(timer);
  }, [currentStep, isActive]);

  useEffect(() => {
    if (!isActive) return;
    const timer = window.setTimeout(updateRect, 280);
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [isActive, currentStep, updateRect]);

  if (!isActive || !currentStep) return null;

  const isLast = stepIndex >= steps.length - 1;
  const isFirst = stepIndex === 0;
  const title = t(currentStep.titleKey);
  const body = t(currentStep.bodyKey);
  const stepLabel = t("tutorial.stepOf")
    .replace("{current}", String(stepIndex + 1))
    .replace("{total}", String(steps.length));

  const tooltip = (
    <div
      className={`fixed z-100001 w-[min(420px,calc(100vw-2rem))] rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xl dark:border-gray-700 dark:bg-gray-900 ${
        currentStep.center || !rect
          ? "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          : rect.top + rect.height + 16 + 200 > window.innerHeight
            ? ""
            : ""
      }`}
      style={
        !currentStep.center && rect
          ? {
              top: Math.min(rect.top + rect.height + 16, window.innerHeight - 220),
              left: Math.min(Math.max(16, rect.left), window.innerWidth - 436),
            }
          : undefined
      }
    >
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-brand-500">{stepLabel}</p>
      <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">{body}</p>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={stopTutorial}
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          {t("tutorial.skip")}
        </button>
        <div className="flex gap-2">
          {!isFirst && (
            <Button size="sm" variant="outline" onClick={prevStep}>
              {t("tutorial.prev")}
            </Button>
          )}
          <Button size="sm" onClick={isLast ? stopTutorial : nextStep}>
            {isLast ? t("tutorial.finish") : t("tutorial.next")}
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(
    <div className="fixed inset-0 z-100000" role="dialog" aria-modal="true" aria-label={t("tutorial.dialogLabel")}>
      {rect && !currentStep.center ? (
        <div
          className="pointer-events-none fixed rounded-xl ring-4 ring-brand-400/80 transition-all duration-300"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.62)",
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-[1px]" />
      )}
      {tooltip}
    </div>,
    document.body,
  );
}
