import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const ONBOARDING_KEY_PREFIX = "my-wardrobe:onboarding-tour-complete:";

type TourStep = {
  route: string;
  target: string;
  title: string;
  body: string[];
  examples?: string[];
};

const TOUR_STEPS: TourStep[] = [
  {
    route: "/wardrobe",
    target: "add-clothing",
    title: "Build your digital wardrobe.",
    body: ["Upload clothes and accessories.", "More items make recommendations smarter."],
  },
  {
    route: "/generate",
    target: "generate-outfit",
    title: "Generate complete outfits.",
    body: ["Create looks using clothes you already own."],
    examples: ["Casual", "Date Night", "Wedding", "Office", "Travel"],
  },
  {
    route: "/stylist",
    target: "stylist-input",
    title: "Ask your personal AI stylist.",
    body: [],
    examples: [
      '"What should I wear today?"',
      '"How can I style white sneakers?"',
      '"What matches my navy shirt?"',
    ],
  },
  {
    route: "/shopping",
    target: "smart-buy-recommendations",
    title: "Find useful missing pieces.",
    body: ["Smart Buy recommends items that add more outfit variety."],
    examples: ["White sneakers", "Navy blazer", "Black trousers"],
  },
  {
    route: "/pack",
    target: "packing-recommendations",
    title: "Travel smarter.",
    body: ["Enter your trip details.", "Pack builds a list from your own wardrobe."],
    examples: ["Weekend trip", "Business travel", "Beach vacation"],
  },
  {
    route: "/insights",
    target: "wardrobe-analytics",
    title: "Understand your wardrobe.",
    body: ["See your wardrobe health at a glance."],
    examples: ["Most-used colors", "Category balance", "Missing essentials", "Wardrobe health"],
  },
];

type Rect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export function OnboardingTour() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showWelcome, setShowWelcome] = useState(false);
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);

  const storageKey = useMemo(
    () => `${ONBOARDING_KEY_PREFIX}${user?.id ?? "guest"}`,
    [user?.id]
  );
  const currentStep = activeStep !== null ? TOUR_STEPS[activeStep] : null;
  const isLastTourStep = activeStep === TOUR_STEPS.length - 1;

  useEffect(() => {
    if (!user || typeof window === "undefined") return;
    if (window.localStorage.getItem(storageKey) === "true") return;
    setShowWelcome(true);
  }, [storageKey, user]);

  useEffect(() => {
    if (!currentStep || location.pathname === currentStep.route) return;
    navigate(currentStep.route);
  }, [currentStep, location.pathname, navigate]);

  useEffect(() => {
    if (!currentStep || location.pathname !== currentStep.route) {
      setTargetRect(null);
      return;
    }

    let frame = 0;
    const updateRect = () => {
      const target = document.querySelector<HTMLElement>(
        `[data-onboarding-target="${currentStep.target}"]`
      );
      if (!target) {
        setTargetRect(null);
        return;
      }

      target.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
      const rect = target.getBoundingClientRect();
      const padding = 8;
      setTargetRect({
        top: Math.max(8, rect.top - padding),
        left: Math.max(8, rect.left - padding),
        width: Math.min(window.innerWidth - 16, rect.width + padding * 2),
        height: Math.min(window.innerHeight - 16, rect.height + padding * 2),
      });
    };

    frame = window.requestAnimationFrame(updateRect);
    const timer = window.setTimeout(updateRect, 350);
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [currentStep, location.pathname]);

  const complete = () => {
    window.localStorage.setItem(storageKey, "true");
    setShowWelcome(false);
    setActiveStep(null);
    setTargetRect(null);
  };

  const startTour = () => {
    setShowWelcome(false);
    setActiveStep(0);
  };

  const next = () => {
    if (activeStep === null) return;
    if (isLastTourStep) {
      setActiveStep(TOUR_STEPS.length);
      return;
    }
    setActiveStep(activeStep + 1);
  };

  const previous = () => {
    if (activeStep === null || activeStep <= 0) return;
    setActiveStep(activeStep - 1);
  };

  const uploadFirstItem = () => {
    complete();
    navigate("/wardrobe?upload=1");
  };

  const finishStep = activeStep === TOUR_STEPS.length;

  return (
    <>
      {showWelcome && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/65 px-3 pb-[env(safe-area-inset-bottom)] pt-6 backdrop-blur-sm md:items-center md:px-4 md:py-8">
          <div className="flex max-h-[70vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] shadow-2xl md:rounded-2xl">
            <div className="shrink-0 px-4 pt-4 md:px-6 md:pt-6">
              <h2 className="font-serif text-3xl leading-tight text-[color:var(--color-ink)]">
                Welcome to My Wardrobe
              </h2>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 md:px-6">
              <p className="text-sm leading-relaxed text-[color:var(--color-ink-muted)]">
                Your AI stylist, built around clothes you already own.
              </p>
            </div>
            <div className="sticky bottom-0 grid shrink-0 gap-3 border-t border-[color:var(--color-border-soft)] bg-[color:var(--color-bg-elev)] px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 sm:grid-cols-2 md:px-6 md:pb-6">
              <button
                type="button"
                onClick={startTour}
                className="h-11 rounded-full bg-gradient-to-b from-[color:var(--color-gold-bright)] to-[color:var(--color-gold)] px-5 text-sm font-medium text-[color:var(--color-bg)]"
              >
                Show Me Around
              </button>
              <button
                type="button"
                onClick={complete}
                className="h-11 rounded-full border border-[color:var(--color-border)] px-5 text-sm text-[color:var(--color-ink)] hover:border-[color:var(--color-gold)]/50"
              >
                I'll Explore Myself
              </button>
            </div>
          </div>
        </div>
      )}

      {currentStep && !finishStep && (
        <SpotlightOverlay
          rect={targetRect}
          step={currentStep}
          stepNumber={activeStep + 1}
          totalSteps={TOUR_STEPS.length}
          onNext={next}
          onPrevious={previous}
          onSkip={complete}
        />
      )}

      {finishStep && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/65 px-3 pb-[env(safe-area-inset-bottom)] pt-6 backdrop-blur-sm md:items-center md:px-4 md:py-8">
          <div className="flex max-h-[70vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] shadow-2xl md:rounded-2xl">
            <div className="flex shrink-0 items-start justify-between gap-4 px-4 pt-4 md:px-6 md:pt-6">
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-gold)]">
                  Tour complete
                </p>
                <h2 className="mt-1 font-serif text-3xl leading-tight text-[color:var(--color-ink)]">
                  You're Ready
                </h2>
              </div>
              <button
                type="button"
                onClick={complete}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[color:var(--color-ink-muted)] hover:bg-[color:var(--color-surface)] hover:text-[color:var(--color-ink)]"
                aria-label="Close onboarding"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 md:px-6">
              <p className="text-sm leading-relaxed text-[color:var(--color-ink-muted)]">
                Start by uploading a few clothes.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[color:var(--color-ink-muted)]">
                Recommendations improve as your wardrobe grows.
              </p>
            </div>
            <div className="sticky bottom-0 grid shrink-0 gap-3 border-t border-[color:var(--color-border-soft)] bg-[color:var(--color-bg-elev)] px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 sm:grid-cols-2 md:px-6 md:pb-6">
              <button
                type="button"
                onClick={uploadFirstItem}
                className="h-11 rounded-full bg-gradient-to-b from-[color:var(--color-gold-bright)] to-[color:var(--color-gold)] px-5 text-sm font-medium text-[color:var(--color-bg)]"
              >
                Upload First Item
              </button>
              <button
                type="button"
                onClick={complete}
                className="h-11 rounded-full border border-[color:var(--color-border)] px-5 text-sm text-[color:var(--color-ink)] hover:border-[color:var(--color-gold)]/50"
              >
                Finish
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SpotlightOverlay({
  rect,
  step,
  stepNumber,
  totalSteps,
  onNext,
  onPrevious,
  onSkip,
}: {
  rect: Rect | null;
  step: TourStep;
  stepNumber: number;
  totalSteps: number;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
}) {
  const cardStyle = getCardStyle(rect);

  return (
    <div className="fixed inset-0 z-[80] pointer-events-none">
      {rect ? (
        <>
          <div className="fixed left-0 right-0 top-0 bg-black/62 backdrop-blur-[1px]" style={{ height: rect.top }} />
          <div className="fixed left-0 bg-black/62 backdrop-blur-[1px]" style={{ top: rect.top, width: rect.left, height: rect.height }} />
          <div
            className="fixed bg-black/62 backdrop-blur-[1px]"
            style={{
              top: rect.top,
              left: rect.left + rect.width,
              right: 0,
              height: rect.height,
            }}
          />
          <div
            className="fixed left-0 right-0 bottom-0 bg-black/62 backdrop-blur-[1px]"
            style={{ top: rect.top + rect.height }}
          />
          <div
            className="fixed rounded-2xl border border-[color:var(--color-gold)] shadow-[0_0_0_9999px_rgba(0,0,0,0.02),0_0_34px_rgba(212,180,131,0.35)]"
            style={{
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
            }}
          />
        </>
      ) : (
        <div className="fixed inset-0 bg-black/62 backdrop-blur-[1px]" />
      )}

      <div
        className="fixed bottom-0 left-0 right-0 pointer-events-auto flex max-h-[70vh] w-full flex-col overflow-hidden rounded-t-2xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] shadow-2xl md:bottom-auto md:left-auto md:right-auto md:w-[min(92vw,390px)] md:rounded-2xl"
        style={cardStyle}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 px-4 pt-4 md:px-6 md:pt-6">
          <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-gold)]">
            Step {stepNumber} of {totalSteps}
          </p>
          <button
            type="button"
            onClick={onSkip}
            className="flex h-8 items-center rounded-full px-3 text-xs text-[color:var(--color-ink-muted)] hover:bg-[color:var(--color-surface)] hover:text-[color:var(--color-ink)]"
          >
            Skip
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 md:px-6">
          <h2 className="font-serif text-2xl leading-tight text-[color:var(--color-ink)]">
            {step.title}
          </h2>
          <div className="mt-3 space-y-2 text-sm leading-relaxed text-[color:var(--color-ink-muted)]">
            {step.body.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
          {step.examples && (
            <ul className="mt-4 grid gap-1.5 text-sm text-[color:var(--color-ink-muted)]">
              {step.examples.map((example) => (
                <li key={example} className="flex gap-2">
                  <span className="text-[color:var(--color-gold)]">•</span>
                  <span>{example}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="sticky bottom-0 grid shrink-0 grid-cols-2 gap-3 border-t border-[color:var(--color-border-soft)] bg-[color:var(--color-bg-elev)] px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 md:px-6 md:pb-6">
          <button
            type="button"
            onClick={onPrevious}
            disabled={stepNumber === 1}
            className="flex h-11 items-center justify-center gap-2 rounded-full border border-[color:var(--color-border)] px-4 text-sm text-[color:var(--color-ink)] hover:border-[color:var(--color-gold)]/50 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <ArrowLeft className="h-4 w-4" /> Previous
          </button>
          <button
            type="button"
            onClick={onNext}
            className="flex h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[color:var(--color-gold-bright)] to-[color:var(--color-gold)] px-4 text-sm font-medium text-[color:var(--color-bg)]"
          >
            Next <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function getCardStyle(rect: Rect | null): CSSProperties {
  if (window.innerWidth < 768) {
    return {
      bottom: 0,
      left: 0,
      right: 0,
      top: "auto",
    };
  }

  if (!rect) {
    return {
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -50%)",
    };
  }

  const cardWidth = Math.min(window.innerWidth * 0.92, 390);
  const spaceBelow = window.innerHeight - (rect.top + rect.height);
  const placeBelow = spaceBelow > 250 || rect.top < 250;
  const left = Math.min(
    Math.max(16, rect.left + rect.width / 2 - cardWidth / 2),
    window.innerWidth - cardWidth - 16
  );
  const preferredTop = placeBelow ? rect.top + rect.height + 14 : rect.top - 320;
  const top = Math.min(Math.max(16, preferredTop), Math.max(16, window.innerHeight - 320));

  return {
    left,
    top,
  };
}
