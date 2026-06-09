import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { getTutorialSteps, type TutorialStepConfig } from "../config/tutorialSteps";
import { useTipAuth } from "./TipAuthContext";

interface TutorialContextValue {
  isActive: boolean;
  stepIndex: number;
  steps: TutorialStepConfig[];
  currentStep: TutorialStepConfig | null;
  startTutorial: () => void;
  stopTutorial: () => void;
  nextStep: () => void;
  prevStep: () => void;
}

const TutorialContext = createContext<TutorialContextValue | null>(null);

export function TutorialProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { isAdmin } = useTipAuth();
  const [isActive, setIsActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const steps = useMemo(() => getTutorialSteps(isAdmin), [isAdmin]);
  const currentStep = isActive ? (steps[stepIndex] ?? null) : null;

  const goToStep = useCallback(
    (index: number) => {
      const step = steps[index];
      if (!step) return;
      if (step.route) {
        navigate(step.route);
      }
      setStepIndex(index);
    },
    [navigate, steps],
  );

  const startTutorial = useCallback(() => {
    setIsActive(true);
    setStepIndex(0);
    const first = steps[0];
    if (first?.route) {
      navigate(first.route);
    }
  }, [navigate, steps]);

  const stopTutorial = useCallback(() => {
    setIsActive(false);
    setStepIndex(0);
  }, []);

  const nextStep = useCallback(() => {
    if (stepIndex >= steps.length - 1) {
      stopTutorial();
      return;
    }
    goToStep(stepIndex + 1);
  }, [goToStep, stepIndex, steps.length, stopTutorial]);

  const prevStep = useCallback(() => {
    if (stepIndex <= 0) return;
    goToStep(stepIndex - 1);
  }, [goToStep, stepIndex]);

  const value = useMemo(
    () => ({
      isActive,
      stepIndex,
      steps,
      currentStep,
      startTutorial,
      stopTutorial,
      nextStep,
      prevStep,
    }),
    [currentStep, isActive, nextStep, prevStep, startTutorial, stepIndex, steps, stopTutorial],
  );

  return <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>;
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error("useTutorial must be used within TutorialProvider");
  }
  return context;
}
