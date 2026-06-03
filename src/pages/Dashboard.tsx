import { useEffect, useMemo, useState } from "react";
import type React from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  MessageCircle,
  Plus,
  ShoppingBag,
  Wand2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useWardrobe } from "../context/WardrobeContext";
import { FallbackImage } from "../components/ui/FallbackImage";
import type { Category, ClothingItem, Outfit } from "../types";

const categories: Category[] = ["tops", "bottoms", "shoes", "accessories"];
const NEUTRALS = [
  "black",
  "white",
  "navy",
  "grey",
  "gray",
  "beige",
  "cream",
  "ivory",
  "tan",
  "camel",
  "brown",
  "charcoal",
  "white",
  "off-white",
  "stone",
  "slate",
];

type CategoryCount = {
  cat: Category;
  count: number;
};

type DashboardData = {
  tops: ClothingItem[];
  bottoms: ClothingItem[];
  shoes: ClothingItem[];
  accessories: ClothingItem[];
  combinations: number;
  recentItems: ClothingItem[];
  favoriteOutfits: Outfit[];
  latestOutfit: Outfit | undefined;
  health: number;
  healthTip: string;
  weakest: CategoryCount;
};

const sectionMotion = (index: number) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay: index * 0.08 },
});

export function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, outfits, loading, error } = useWardrobe();

  const data = useMemo(() => deriveDashboardData(items, outfits), [items, outfits]);
  const firstName = user?.displayName?.split(" ")[0] ?? "there";
  const greeting = getGreeting();

  if (loading) return <DashboardLoader />;

  if (error) {
    return (
      <div className="mx-auto mt-20 max-w-md rounded-2xl border border-[color:var(--color-border-soft)] bg-[color:var(--color-surface)] p-8 text-center">
        <p className="text-sm text-[color:var(--color-ink)]">{error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-5 md:space-y-6">
      <HeroSection
        greeting={greeting}
        firstName={firstName}
        items={items}
        combinations={data.combinations}
        health={data.health}
        healthTip={data.healthTip}
        onNavigate={navigate}
      />

      <TodaysOutfitSection
        latestOutfit={data.latestOutfit}
        items={items}
        onNavigate={navigate}
      />

      <StatsSection
        itemCount={items.length}
        combinations={data.combinations}
        outfitCount={outfits.length}
        favoriteCount={data.favoriteOutfits.length}
      />

      <SmartNudge
        weakest={data.weakest}
        health={data.health}
        combinations={data.combinations}
        gainIfAdded={(cat) => gainIfAdded(cat, data)}
        onNavigate={navigate}
      />

      <QuickActions
        itemCount={items.length}
        combinations={data.combinations}
        onNavigate={navigate}
      />

      {items.length > 0 && (
        <RecentAdditions items={data.recentItems} onNavigate={navigate} />
      )}
    </div>
  );
}

function HeroSection({
  greeting,
  firstName,
  items,
  combinations,
  health,
  healthTip,
  onNavigate,
}: {
  greeting: string;
  firstName: string;
  items: ClothingItem[];
  combinations: number;
  health: number;
  healthTip: string;
  onNavigate: (path: string) => void;
}) {
  const hero = getHeroState(items.length, combinations);

  return (
    <motion.section
      {...sectionMotion(0)}
      className="relative overflow-hidden rounded-2xl border border-[color:var(--color-border-soft)] bg-[color:var(--color-surface)] md:rounded-3xl"
    >
      <div className="absolute inset-0 aurora-bg opacity-70" />
      <div className="relative grid gap-6 p-5 md:grid-cols-[1fr_220px] md:gap-8 md:p-9">
        <div className="flex flex-col justify-between gap-5 md:gap-6">
          <div>
            <h1 className="font-serif text-[34px] leading-tight text-[color:var(--color-ink)] md:text-[58px] md:leading-none">
              {greeting}, {firstName}.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-[color:var(--color-ink-muted)] md:mt-4 md:text-base">
              {hero.subtitle}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {hero.actions.map((action) => (
              <button
                key={action.path}
                type="button"
                onClick={() => onNavigate(action.path)}
                className={
                  action.primary
                    ? "inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[color:var(--color-gold-bright)] to-[color:var(--color-gold)] px-5 text-sm font-medium text-[color:var(--color-bg)] sm:w-auto"
                    : "inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-[color:var(--color-border)] px-5 text-sm text-[color:var(--color-ink)] hover:border-[color:var(--color-gold)]/50 sm:w-auto"
                }
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>

        <div className="hidden md:flex md:items-center md:justify-center">
          <HealthRing health={health} tip={healthTip} />
        </div>
      </div>
    </motion.section>
  );
}

function TodaysOutfitSection({
  latestOutfit,
  items,
  onNavigate,
}: {
  latestOutfit: Outfit | undefined;
  items: ClothingItem[];
  onNavigate: (path: string) => void;
}) {
  const outfitItems = latestOutfit
    ? latestOutfit.items
        .map((ref) => items.find((item) => item.id === ref.itemId))
        .filter((item): item is ClothingItem => Boolean(item))
    : [];

  return (
    <motion.section
      {...sectionMotion(1)}
      className="rounded-2xl border border-[color:var(--color-border-soft)] border-l-4 border-l-[color:var(--color-gold)] bg-[color:var(--color-surface)] p-4 md:p-6"
    >
      {!latestOutfit ? (
        <div className="flex flex-col items-center justify-center py-8 text-center md:py-10">
          <HangerIllustration />
          <h2 className="mt-5 font-serif text-2xl text-[color:var(--color-ink)] md:text-3xl">
            No saved looks yet
          </h2>
          <p className="mt-2 text-sm text-[color:var(--color-ink-muted)]">
            Generate your first outfit and save it here
          </p>
          <button
            type="button"
            onClick={() => onNavigate("/generate")}
            className="mt-6 h-11 w-full rounded-full bg-[color:var(--color-gold)] px-5 text-sm font-medium text-[color:var(--color-bg)] sm:w-auto"
          >
            Generate a look →
          </button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-serif text-2xl text-[color:var(--color-ink)] md:text-4xl">
                {latestOutfit.name}
              </h2>
              <span className="rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] px-3 py-1 text-xs uppercase tracking-widest text-[color:var(--color-gold)]">
                {latestOutfit.occasion}
              </span>
            </div>
            {latestOutfit.notes && (
              <p className="mt-3 max-w-2xl text-sm italic leading-relaxed text-[color:var(--color-ink-muted)]">
                {latestOutfit.notes}
              </p>
            )}
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={() => onNavigate("/generate")}
                className="h-10 w-full rounded-full bg-[color:var(--color-gold)] px-4 text-sm font-medium text-[color:var(--color-bg)] sm:w-auto"
              >
                Generate new look
              </button>
              <button
                type="button"
                onClick={() => onNavigate("/saved")}
                className="h-10 w-full rounded-full border border-[color:var(--color-border)] px-4 text-sm text-[color:var(--color-ink)] hover:border-[color:var(--color-gold)]/50 sm:w-auto"
              >
                View all saved
              </button>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto lg:max-w-md">
            {outfitItems.map((item) => (
              <FallbackImage
                key={item.id}
                src={item.imageUrl}
                alt={item.name}
                category={item.category}
                fallbackLabel={item.name}
                className="h-24 w-24 shrink-0 rounded-xl object-cover"
              />
            ))}
          </div>
        </div>
      )}
    </motion.section>
  );
}

function StatsSection({
  itemCount,
  combinations,
  outfitCount,
  favoriteCount,
}: {
  itemCount: number;
  combinations: number;
  outfitCount: number;
  favoriteCount: number;
}) {
  return (
    <motion.section {...sectionMotion(2)} className="grid gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-4">
      <StatCard value={itemCount} label="Pieces in wardrobe" />
      <StatCard value={combinations === 0 ? "—" : combinations} label="Real outfits" title={combinations === 0 ? "Add tops + bottoms" : undefined} />
      <StatCard value={outfitCount} label="Saved looks" />
      <StatCard value={favoriteCount} label="Favourites" />
    </motion.section>
  );
}

function SmartNudge({
  weakest,
  health,
  combinations,
  gainIfAdded,
  onNavigate,
}: {
  weakest: CategoryCount;
  health: number;
  combinations: number;
  gainIfAdded: (cat: Category) => number;
  onNavigate: (path: string) => void;
}) {
  const gain = gainIfAdded(weakest.cat);
  const nudge =
    weakest.count === 0
      ? {
          text: `You have no ${weakest.cat} tracked. Add ${weakest.cat} to start generating outfits.`,
          label: `Add ${weakest.cat} →`,
          path: "/wardrobe",
        }
      : gain > 0
        ? {
            text: `Add 1 more ${weakest.cat} → unlock ${gain} new real outfits.`,
            label: "Shop the gap →",
            path: "/shopping",
          }
        : health < 70
          ? {
              text: `Your wardrobe health is ${health}/100. Balance your categories to improve it.`,
              label: "See insights →",
              path: "/insights",
            }
          : {
              text: `Your wardrobe is well balanced. ${combinations} looks ready to wear.`,
              label: "Generate today's look →",
              path: "/generate",
            };

  return (
    <motion.section
      {...sectionMotion(3)}
      className="flex flex-col gap-4 rounded-2xl border border-[color:var(--color-border-soft)] bg-[color:var(--color-surface)] p-4 md:p-5 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm leading-relaxed text-[color:var(--color-ink)]">{nudge.text}</p>
      <button
        type="button"
        onClick={() => onNavigate(nudge.path)}
        className="h-10 w-full shrink-0 rounded-full border border-[color:var(--color-gold)]/40 px-4 text-sm text-[color:var(--color-gold)] hover:bg-[color:var(--color-gold)]/10 sm:w-auto"
      >
        {nudge.label}
      </button>
    </motion.section>
  );
}

function QuickActions({
  itemCount,
  combinations,
  onNavigate,
}: {
  itemCount: number;
  combinations: number;
  onNavigate: (path: string) => void;
}) {
  return (
    <motion.section {...sectionMotion(4)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <QuickActionCard
          icon={Wand2}
          title="Generate Look"
          badge={`${combinations} real outfits`}
          disabled={combinations === 0}
          disabledReason="Generate Look is available after you add tops and bottoms."
          onClick={() => onNavigate("/generate")}
        />
        <QuickActionCard
          icon={Plus}
          title="Add Clothing"
          badge={`${itemCount} pieces`}
          onClick={() => onNavigate("/wardrobe")}
        />
        <QuickActionCard
          icon={MessageCircle}
          title="AI Stylist"
          badge="Always on"
          onClick={() => onNavigate("/stylist")}
        />
        <QuickActionCard
          icon={ShoppingBag}
          title="Smart Buy"
          badge="Fill gaps"
          onClick={() => onNavigate("/shopping")}
        />
      </div>
    </motion.section>
  );
}

function RecentAdditions({
  items,
  onNavigate,
}: {
  items: ClothingItem[];
  onNavigate: (path: string) => void;
}) {
  return (
    <motion.section {...sectionMotion(5)}>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="font-serif text-2xl text-[color:var(--color-ink)] md:text-3xl">Recently added</h2>
        <button
          type="button"
          onClick={() => onNavigate("/wardrobe")}
          className="inline-flex items-center gap-1 text-sm text-[color:var(--color-gold)] hover:opacity-80"
        >
          View all <ArrowRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex min-w-0 items-center gap-3 rounded-2xl border border-[color:var(--color-border-soft)] bg-[color:var(--color-surface)] p-3"
          >
            <FallbackImage
              src={item.imageUrl}
              alt={item.name}
              category={item.category}
              fallbackLabel={item.name}
              className="h-12 w-12 shrink-0 rounded-lg object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[color:var(--color-ink)]">
                {item.name}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[color:var(--color-border)] px-2 py-0.5 text-[10px] uppercase tracking-widest text-[color:var(--color-ink-muted)]">
                  {item.category}
                </span>
                <span className="text-xs text-[color:var(--color-ink-dim)]">
                  Added {daysAgo(item.createdAt)} days ago
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.section>
  );
}

function HealthRing({ health, tip }: { health: number; tip: string }) {
  const [offset, setOffset] = useState(1);
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const ringOffset = circumference * offset;
  const label =
    health === 0 ? "Add clothes to see your score" :
    health >= 70 ? "Well curated wardrobe" : health >= 50 ? "Room to grow" : "Needs attention";
  const color =
    health >= 70
      ? "var(--color-gold)"
      : health >= 50
        ? "var(--color-gold-deep)"
        : "var(--color-ink-dim)";

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setOffset(1 - health / 100));
    return () => window.cancelAnimationFrame(frame);
  }, [health]);

  return (
    <div className="text-center">
      <div className="relative h-36 w-36">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth="10"
          />
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={ringOffset}
            className="transition-[stroke-dashoffset] duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-serif text-4xl text-[color:var(--color-ink)]">{health}</span>
        </div>
      </div>
      <p className="mt-2 text-xs text-[color:var(--color-ink-muted)]">{label}</p>
      <p className="mt-2 max-w-[180px] text-xs leading-snug text-[color:var(--color-gold)]">
        {tip}
      </p>
    </div>
  );
}

function StatCard({
  value,
  label,
  title,
}: {
  value: number | string;
  label: string;
  title?: string;
}) {
  return (
    <div
      title={title}
      className="rounded-2xl border border-[color:var(--color-border-soft)] bg-[color:var(--color-surface)] p-4 transition-transform duration-200 hover:-translate-y-0.5 md:p-5"
    >
      <p className="font-serif text-3xl text-[color:var(--color-ink)] md:text-4xl">{value}</p>
      <p className="mt-2 text-[10px] uppercase tracking-widest text-[color:var(--color-ink-muted)]">
        {label}
      </p>
    </div>
  );
}

function QuickActionCard({
  icon: Icon,
  title,
  badge,
  disabled = false,
  disabledReason,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  badge: string;
  disabled?: boolean;
  disabledReason?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      title={disabled ? disabledReason : undefined}
      className={`flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--color-border-soft)] bg-[color:var(--color-surface)] p-4 text-left transition-all duration-200 md:gap-4 md:p-5 ${
        disabled
          ? "cursor-not-allowed opacity-55"
          : "hover:-translate-y-0.5 hover:border-[color:var(--color-gold)]/40"
      }`}
    >
      <span className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--color-bg-elev)]">
          <Icon className="h-5 w-5 text-[color:var(--color-gold)]" />
        </span>
        <span className="text-sm font-medium text-[color:var(--color-ink)]">{title}</span>
      </span>
      <span
        className={`rounded-full border px-3 py-1 text-xs ${
          disabled
            ? "border-[color:var(--color-border)] text-[color:var(--color-ink-dim)]"
            : "border-[color:var(--color-border)] text-[color:var(--color-ink-muted)]"
        }`}
      >
        {badge}
      </span>
    </button>
  );
}

function HangerIllustration() {
  return (
    <svg
      width="96"
      height="96"
      viewBox="0 0 96 96"
      fill="none"
      aria-hidden="true"
      className="text-[color:var(--color-gold)]"
    >
      <path
        d="M48 24c0-7 10-7 10 0 0 4-3 6-7 8-2 1-3 3-3 5v5"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M20 72 48 43l28 29H20Z"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DashboardLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border border-[color:var(--color-border)] border-t-[color:var(--color-gold)]" />
    </div>
  );
}

function deriveDashboardData(items: ClothingItem[], outfits: Outfit[]): DashboardData {
  const tops = items.filter((item) => item.category === "tops");
  const bottoms = items.filter((item) => item.category === "bottoms");
  const shoes = items.filter((item) => item.category === "shoes");
  const accessories = items.filter((item) => item.category === "accessories");
  const combinations = countRealOutfits(tops, bottoms, shoes);
  const recentItems = [...items]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 4);
  const favoriteOutfits = outfits.filter((outfit) => outfit.isFavorite);
  const latestOutfit = [...outfits].sort((a, b) => b.createdAt - a.createdAt)[0];
  const { health, tip: healthTip } = calculateWardrobeHealth(items, combinations);

  const categoryCounts = categories.map((cat) => ({
    cat,
    count: items.filter((item) => item.category === cat).length,
  }));
  const weakest = [...categoryCounts].sort((a, b) => a.count - b.count)[0];

  return {
    tops,
    bottoms,
    shoes,
    accessories,
    combinations,
    recentItems,
    favoriteOutfits,
    latestOutfit,
    health,
    healthTip,
    weakest,
  };
}

function calculateWardrobeHealth(items: ClothingItem[], combinations: number) {
  if (items.length === 0) {
    return { health: 0, tip: "Add clothes to see your score" };
  }

  const categoryPoints = (["tops", "bottoms", "shoes", "accessories", "outerwear"] as string[])
    .reduce((pts, cat) => {
      const count = items.filter((item) => item.category === cat).length;
      return pts + (count >= 2 ? 5 : count === 1 ? 2 : 0);
    }, 0);

  const neutrals = ["black", "white", "navy", "grey", "beige", "cream", "charcoal", "tan", "brown"];
  const wardrobeColors = items.map((item) => item.color.toLowerCase());
  const neutralsPresent = neutrals.filter((neutral) =>
    wardrobeColors.some((color) => color.includes(neutral))
  ).length;
  const colorPoints = Math.min(20, neutralsPresent * 4);

  const versatilityPoints =
    combinations >= 200 ? 25 :
    combinations >= 101 ? 20 :
    combinations >= 51 ? 15 :
    combinations >= 21 ? 10 :
    combinations >= 6 ? 5 : 0;

  const counts = categories.map((cat) => items.filter((item) => item.category === cat).length);
  const maxCount = Math.max(...counts);
  const minCount = Math.min(...counts);
  const balancePoints =
    maxCount <= minCount * 2 ? 15 :
    maxCount <= minCount * 3 ? 8 : 0;

  const favPoints = Math.min(15, items.filter((item) => item.isFavorite).length * 3);
  const health = categoryPoints + colorPoints + versatilityPoints + balancePoints + favPoints;

  const tips = [
    {
      points: categoryPoints,
      threshold: 15,
      text: `Add more variety across categories +${25 - categoryPoints} pts available`,
    },
    {
      points: colorPoints,
      threshold: 12,
      text: `Add neutral basics (black/white/navy) +${20 - colorPoints} pts available`,
    },
    {
      points: versatilityPoints,
      threshold: 20,
      text: `More combinations unlock higher score +${25 - versatilityPoints} pts available`,
    },
    {
      points: balancePoints,
      threshold: 15,
      text: `Balance your categories +${15 - balancePoints} pts available`,
    },
    {
      points: favPoints,
      threshold: 9,
      text: `Mark favourites to boost your score +${15 - favPoints} pts available`,
    },
  ];
  const tip = tips
    .filter((candidate) => candidate.points < candidate.threshold)
    .sort((a, b) => a.points - b.points)[0]?.text ?? "Your wardrobe score is fully optimized.";

  return { health, tip };
}


function gainIfAdded(cat: Category, data: DashboardData) {
  if (cat === "tops") {
    return countRealOutfits([...data.tops, neutralCandidate("tops")], data.bottoms, data.shoes) - data.combinations;
  }
  if (cat === "bottoms") {
    return countRealOutfits(data.tops, [...data.bottoms, neutralCandidate("bottoms")], data.shoes) - data.combinations;
  }
  if (cat === "shoes") {
    return countRealOutfits(data.tops, data.bottoms, [...data.shoes, neutralCandidate("shoes")]) - data.combinations;
  }
  return 0;
}

function neutralCandidate(category: Category): ClothingItem {
  return {
    id: `candidate-${category}`,
    userId: "",
    name: "Neutral basic",
    category,
    color: "black",
    tags: [],
    imageUrl: "",
    usageCount: 0,
    createdAt: Date.now(),
  };
}

function countRealOutfits(
  tops: ClothingItem[],
  bottoms: ClothingItem[],
  shoes: ClothingItem[]
) {
  let smartCombinations = 0;

  tops.forEach((top) => {
    bottoms.forEach((bottom) => {
      if (!colorsWork(top.color, bottom.color)) return;
      if (shoes.length === 0) {
        smartCombinations++;
      } else {
        shoes.forEach((shoe) => {
          if (!colorsWork(top.color, shoe.color)) return;
          if (!colorsWork(bottom.color, shoe.color)) return;
          smartCombinations++;
        });
      }
    });
  });

  return Math.round(smartCombinations * 0.65);
}

const isNeutral = (color: string) =>
  NEUTRALS.some((neutral) => color.toLowerCase().includes(neutral));

const colorsWork = (c1: string, c2: string): boolean => {
  if (isNeutral(c1) || isNeutral(c2)) return true;
  const a = c1.toLowerCase();
  const b = c2.toLowerCase();
  if (a.includes(b) || b.includes(a)) return true;
  return false;
};

function getHeroState(itemCount: number, combinations: number) {
  if (itemCount === 0) {
    return {
      subtitle: "Your wardrobe is empty. Let's build it.",
      actions: [{ label: "Add your first item →", path: "/wardrobe", primary: true }],
    };
  }
  if (itemCount < 5) {
    return {
      subtitle: `You have ${itemCount} pieces. Add more to unlock outfit generation.`,
      actions: [{ label: "Add clothing →", path: "/wardrobe", primary: true }],
    };
  }
  if (combinations === 0) {
    return {
      subtitle: "You need both tops and bottoms to generate outfits.",
      actions: [{ label: "Complete your wardrobe →", path: "/wardrobe", primary: true }],
    };
  }
  return {
    subtitle: `Your ${itemCount} pieces can make ${combinations} real outfits.`,
    actions: [
      { label: "Generate a look", path: "/generate", primary: true },
      { label: "Ask stylist", path: "/stylist", primary: false },
    ],
  };
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function daysAgo(timestamp: number) {
  const diff = Date.now() - timestamp;
  return Math.max(0, Math.floor(diff / 86_400_000));
}
