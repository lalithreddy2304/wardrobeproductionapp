import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  Shirt,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useUserProfile } from "../hooks/useUserProfile";
import type { Gender, SkinTone, StyleGoal, UserProfile } from "../types";

type Step = 1 | 2 | 3 | 4 | 5;

const goals: Array<{
  value: StyleGoal;
  label: string;
  icon: typeof Sparkles;
}> = [
  { value: "build-wardrobe", label: "Build a better wardrobe", icon: Sparkles },
  { value: "daily-outfits", label: "Get daily outfit inspiration", icon: Shirt },
  { value: "shop-smarter", label: "Shop smarter, buy less", icon: ShoppingBag },
];

const genders: Array<{ value: Gender; label: string }> = [
  { value: "male", label: "Men" },
  { value: "female", label: "Women" },
  { value: "nonbinary", label: "Non-binary / Other" },
];

const skinTones: Array<{
  value: SkinTone;
  label: string;
  color: string;
  note: string;
  palette: string[];
}> = [
  {
    value: "fair",
    label: "Fair",
    color: "#F5E6D3",
    note: "Pastels, navy, jewel tones look stunning on you",
    palette: ["Powder Blue", "Navy", "Emerald", "Soft Rose"],
  },
  {
    value: "light",
    label: "Light",
    color: "#E8C9A0",
    note: "Warm neutrals, dusty rose, olive complement you",
    palette: ["Camel", "Dusty Rose", "Olive", "Ivory"],
  },
  {
    value: "medium",
    label: "Medium",
    color: "#C68642",
    note: "Earth tones, burgundy, warm camel enhance your glow",
    palette: ["Burgundy", "Warm Camel", "Terracotta", "Cream"],
  },
  {
    value: "medium-deep",
    label: "Medium Deep",
    color: "#8D5524",
    note: "Rich jewel tones, gold, burnt orange flatter you",
    palette: ["Sapphire", "Gold", "Burnt Orange", "Plum"],
  },
  {
    value: "deep",
    label: "Deep",
    color: "#4A2912",
    note: "Bright colors, white, gold - almost anything works",
    palette: ["White", "Cobalt", "Gold", "Fuchsia"],
  },
];

const goalLabels: Record<StyleGoal, string> = {
  "build-wardrobe": "Build a better wardrobe",
  "daily-outfits": "Daily outfit inspiration",
  "shop-smarter": "Shop smarter, buy less",
};

const genderLabels: Record<Gender, string> = {
  male: "Male",
  female: "Female",
  nonbinary: "Non-binary",
};

const cardBase =
  "rounded-2xl border border-[color:var(--color-border-soft)] bg-[color:var(--color-surface)] p-4 md:p-6 cursor-pointer transition-all hover:border-[color:var(--color-gold)]/40 text-left";
const selectedCard =
  "border-[color:var(--color-gold)] bg-[color:var(--color-gold)]/10";

export function Onboarding() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { saveProfile } = useUserProfile();
  const [step, setStep] = useState<Step>(1);
  const [gender, setGender] = useState<Gender | null>(null);
  const [skinTone, setSkinTone] = useState<SkinTone | null>(null);
  const [styleGoal, setStyleGoal] = useState<StyleGoal | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedSkinTone = useMemo(
    () => skinTones.find((tone) => tone.value === skinTone) ?? null,
    [skinTone]
  );

  const advance = (nextStep: Step) => {
    window.setTimeout(() => setStep(nextStep), 300);
  };

  const complete = async (usedDemoWardrobe: boolean) => {
    if (!gender || !skinTone || !styleGoal) return;
    setSaving(true);
    try {
      const profile: UserProfile = {
        gender,
        skinTone,
        styleGoal,
        onboardingComplete: true,
        usedDemoWardrobe,
      };
      console.log("Saving onboarding usedDemoWardrobe:", usedDemoWardrobe);
      await saveProfile(profile);
      navigate("/", { replace: true });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return <OnboardingLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.profile?.onboardingComplete) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[color:var(--color-bg)] text-[color:var(--color-ink)]">
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=1600&q=85"
          alt=""
          className="h-full w-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[color:var(--color-bg)] via-[color:var(--color-bg)]/95 to-[color:var(--color-bg-elev)]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-6 md:px-10 md:py-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="gold-ring flex h-10 w-10 items-center justify-center rounded-lg">
              <span className="font-serif text-xl leading-none text-[color:var(--color-gold)]">M</span>
            </div>
            <p className="font-serif text-lg">My Wardrobe</p>
          </div>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((dot) => (
              <span
                key={dot}
                className={`h-2.5 rounded-full transition-all ${
                  dot === step
                    ? "w-8 bg-[color:var(--color-gold)]"
                    : "w-2.5 bg-[color:var(--color-border)]"
                }`}
              />
            ))}
          </div>
        </header>

        <section className="grid flex-1 place-items-center py-8 md:py-10">
          <div className="w-full max-w-3xl">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <StepPanel key="goal" title="What brings you here?" subtitle="We'll personalize everything around your goal.">
                  <div className="grid gap-4 md:grid-cols-3">
                    {goals.map((goal) => {
                      const Icon = goal.icon;
                      const selected = styleGoal === goal.value;
                      return (
                        <button
                          key={goal.value}
                          type="button"
                          onClick={() => {
                            setStyleGoal(goal.value);
                            advance(2);
                          }}
                          className={`${cardBase} ${selected ? selectedCard : ""}`}
                        >
                          <Icon className="mb-5 h-7 w-7 text-[color:var(--color-gold)]" />
                          <span className="block font-serif text-2xl leading-tight">{goal.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </StepPanel>
              )}

              {step === 2 && (
                <StepPanel key="gender" title="How do you identify?" subtitle="This helps us show relevant clothing suggestions.">
                  <div className="grid gap-4 md:grid-cols-3">
                    {genders.map((option) => {
                      const selected = gender === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setGender(option.value);
                            advance(3);
                          }}
                          className={`${cardBase} min-h-36 ${selected ? selectedCard : ""}`}
                        >
                          <span className="block font-serif text-3xl leading-tight">{option.label}</span>
                          {selected && <Check className="mt-6 h-5 w-5 text-[color:var(--color-gold)]" />}
                        </button>
                      );
                    })}
                  </div>
                </StepPanel>
              )}

              {step === 3 && (
                <StepPanel key="skin" title="What's your skin tone?" subtitle="We match colors to what genuinely flatters you.">
                  <div className="flex flex-wrap justify-center gap-4">
                    {skinTones.map((tone) => {
                      const selected = skinTone === tone.value;
                      return (
                        <button
                          key={tone.value}
                          type="button"
                          onClick={() => {
                            setSkinTone(tone.value);
                            advance(4);
                          }}
                          className="flex w-24 flex-col items-center gap-3 text-center"
                        >
                          <span
                            className={`h-14 w-14 rounded-full ring-2 ring-transparent cursor-pointer transition-all ${
                              selected
                                ? "ring-[color:var(--color-gold)] ring-offset-2 ring-offset-[color:var(--color-bg)]"
                                : ""
                            }`}
                            style={{ backgroundColor: tone.color }}
                          />
                          <span className="text-xs text-[color:var(--color-ink-muted)]">{tone.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  {selectedSkinTone && (
                    <motion.p
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mx-auto mt-10 max-w-md text-center font-serif text-2xl leading-snug text-[color:var(--color-ink)]"
                    >
                      {selectedSkinTone.note}
                    </motion.p>
                  )}
                </StepPanel>
              )}

              {step === 4 && selectedSkinTone && gender && styleGoal && (
                <StepPanel key="ready" title="Your style profile is ready." subtitle="One last choice before you enter your wardrobe.">
                  <div className="mx-auto max-w-xl rounded-2xl border border-[color:var(--color-border-soft)] bg-[color:var(--color-surface)] p-4 shadow-2xl shadow-black/20 md:p-6">
                    <SummaryRow label="Goal" value={goalLabels[styleGoal]} />
                    <SummaryRow label="Style" value={genderLabels[gender]} />
                    <div className="flex items-center justify-between gap-4 border-t border-[color:var(--color-border-soft)] py-4">
                      <span className="text-sm text-[color:var(--color-ink-muted)]">Skin tone</span>
                      <span className="flex items-center gap-3 text-sm font-medium">
                        <span
                          className="h-6 w-6 rounded-full"
                          style={{ backgroundColor: selectedSkinTone.color }}
                        />
                        {selectedSkinTone.label}
                      </span>
                    </div>
                    <div className="border-t border-[color:var(--color-border-soft)] pt-4">
                      <p className="mb-3 text-sm text-[color:var(--color-ink-muted)]">
                        Personalized color palette
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedSkinTone.palette.map((color) => (
                          <span
                            key={color}
                            className="rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] px-3 py-1 text-xs text-[color:var(--color-ink)]"
                          >
                            {color}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => advance(5)}
                    className="mx-auto mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[color:var(--color-gold-bright)] to-[color:var(--color-gold)] px-8 text-sm font-medium text-[color:var(--color-bg)] shadow-lg shadow-[color:var(--color-gold-shadow)]/30 transition-transform hover:scale-[1.02] disabled:opacity-60 sm:w-auto"
                  >
                    Choose starter option
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </StepPanel>
              )}

              {step === 5 && selectedSkinTone && gender && styleGoal && (
                <StepPanel key="demo" title="How would you like to start?" subtitle="You can explore with sample clothes or begin with an empty wardrobe.">
                  <div className="mx-auto grid max-w-2xl gap-4 md:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => complete(true)}
                      disabled={saving}
                      className={`${cardBase} min-h-36 disabled:cursor-not-allowed disabled:opacity-60 md:min-h-44`}
                    >
                      <Shirt className="mb-5 h-7 w-7 text-[color:var(--color-gold)]" />
                      <span className="block font-serif text-2xl leading-tight md:text-3xl">Start with sample clothes</span>
                      <span className="mt-4 block text-sm leading-6 text-[color:var(--color-ink-muted)]">
                        See outfits and styling tools with a ready-made starter wardrobe.
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => complete(false)}
                      disabled={saving}
                      className={`${cardBase} min-h-36 disabled:cursor-not-allowed disabled:opacity-60 md:min-h-44`}
                    >
                      <Plus className="mb-5 h-7 w-7 text-[color:var(--color-gold)]" />
                      <span className="block font-serif text-2xl leading-tight md:text-3xl">Start fresh</span>
                      <span className="mt-4 block text-sm leading-6 text-[color:var(--color-ink-muted)]">
                        Open an empty wardrobe and add only your own pieces.
                      </span>
                    </button>
                  </div>

                  {saving && (
                    <p className="mt-8 text-center text-sm text-[color:var(--color-ink-muted)]">
                      Preparing wardrobe...
                    </p>
                  )}
                </StepPanel>
              )}
            </AnimatePresence>
          </div>
        </section>

        <footer className="h-12">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep((current) => (current - 1) as Step)}
              className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-2 text-sm text-[color:var(--color-ink-muted)] transition-colors hover:border-[color:var(--color-gold)]/40 hover:text-[color:var(--color-ink)]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          )}
        </footer>
      </div>
    </main>
  );
}

function StepPanel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="mb-10 text-center">
        <h1 className="font-serif text-3xl leading-tight md:text-6xl">{title}</h1>
        <p className="mt-3 text-[color:var(--color-ink-muted)]">{subtitle}</p>
      </div>
      {children}
    </motion.div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 first:pt-0">
      <span className="text-sm text-[color:var(--color-ink-muted)]">{label}</span>
      <span className="text-right text-sm font-medium">{value}</span>
    </div>
  );
}

function OnboardingLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border border-[color:var(--color-border)] border-t-[color:var(--color-gold)]" />
    </div>
  );
}
