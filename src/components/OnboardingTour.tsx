import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, X } from "lucide-react";
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
    body: [
      "Upload shirts, pants, shoes, and accessories.",
      "The more clothes you add, the smarter your recommendations become.",
    ],
  },
  {
    route: "/generate",
    target: "generate-outfit",
    title: "Generate complete outfits from your wardrobe.",
    body: [
      "The AI combines clothing you already own and creates looks for different occasions.",
    ],
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
    title: "Smart Buy identifies missing pieces in your wardrobe.",
    body: [
      "Instead of buying random clothes, it recommends items that increase outfit variety and improve your wardrobe.",
    ],
    examples: ["White sneakers", "Navy blazer", "Black trousers"],
  },
  {
    route: "/pack",
    target: "packing-recommendations",
    title: "Travel smarter.",
    body: [
      "Tell us your destination and trip length.",
      "Pack creates a wardrobe-aware packing list using the clothes you already own.",
    ],
    examples: ["Weekend trip", "Business travel", "Beach vacation"],
  },
  {
    route: "/insights",
    target: "wardrobe-analytics",
    title: "Understand your wardrobe.",
    body: ["See:"],
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

  const uploadFirstItem = () => {
    complete();
    navigate("/wardrobe?upload=1");
  };

  const finishStep = activeStep === TOUR_STEPS.length;

  return (
    <>
      {showWelcome && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/65 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] p-5 shadow-2xl md:p-6">
            <h2 className="font-serif text-3xl leading-tight text-[color:var(--color-ink)]">
              Welcome to My Wardrobe
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[color:var(--color-ink-muted)]">
              Your AI-powered personal stylist built around the clothes you already own.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
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
          onSkip={complete}
        />
      )}

      {finishStep && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/65 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] p-5 shadow-2xl md:p-6">
            <div className="flex items-start justify-between gap-4">
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
            <p className="mt-3 text-sm leading-relaxed text-[color:var(--color-ink-muted)]">
              Start by uploading a few clothes.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[color:var(--color-ink-muted)]">
              Your recommendations become better as your wardrobe grows.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
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
  onSkip,
}: {
  rect: Rect | null;
  step: TourStep;
  stepNumber: number;
  totalSteps: number;
  onNext: () => void;
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
        className="fixed pointer-events-auto w-[min(92vw,390px)] rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] p-4 shadow-2xl md:p-5"
        style={cardStyle}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
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
        <button
          type="button"
          onClick={onNext}
          className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[color:var(--color-gold-bright)] to-[color:var(--color-gold)] px-5 text-sm font-medium text-[color:var(--color-bg)]"
        >
          Next <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function getCardStyle(rect: Rect | null): CSSProperties {
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
