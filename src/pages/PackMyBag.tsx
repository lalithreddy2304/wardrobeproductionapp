import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Check,
  Circle,
  Copy,
  Footprints,
  Luggage,
  MapPin,
  Package,
  Shirt,
  ShoppingBag,
  Wind,
} from "lucide-react";
import { api, ApiError } from "../services/api";
import { useWardrobe } from "../context/WardrobeContext";
import type { Category, DayOutfitPlan, PackActivity, PackedWardrobeItem, PackQuantity, PackResponse, WardrobeMatch } from "../types";

const ACTIVITIES: PackActivity[] = ["business", "beach", "hiking", "casual", "formal event", "gym"];

export function PackMyBag() {
  const navigate = useNavigate();
  const { items: wardrobeItems } = useWardrobe();
  const [destinationCity, setDestinationCity] = useState("");
  const [tripStartDate, setTripStartDate] = useState("");
  const [tripEndDate, setTripEndDate] = useState("");
  const [activities, setActivities] = useState<PackActivity[]>(["casual"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<PackResponse | null>(null);
  const [activeTab, setActiveTab] = useState<"pack" | "days" | "shopping">("pack");

  const toggleActivity = (activity: PackActivity) => {
    setActivities((current) =>
      current.includes(activity)
        ? current.filter((item) => item !== activity)
        : [...current, activity]
    );
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await api.packMyBag({
        destinationCity,
        tripStartDate,
        tripEndDate,
        activities,
        wardrobeItems,
      });
      setResult(response);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return;
      setError(err instanceof ApiError ? err.message : "Could not build packing plan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <section className="rounded-3xl border border-[color:var(--color-border-soft)] bg-[color:var(--color-surface)] p-6 md:p-8">
        <div className="mb-7">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-gold)]">
            Travel planner
          </p>
          <h1 className="mt-2 font-serif text-4xl leading-tight text-[color:var(--color-ink)] md:text-5xl">
            Pack My Bag
          </h1>
        </div>

        <form onSubmit={submit} className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="block text-xs uppercase tracking-widest text-[color:var(--color-ink-dim)]">
              Destination city
              <span className="mt-2 flex h-11 items-center gap-2 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] px-3">
                <MapPin className="h-4 w-4 text-[color:var(--color-gold)]" />
                <input
                  value={destinationCity}
                  onChange={(event) => setDestinationCity(event.target.value)}
                  required
                  placeholder="Paris"
                  className="min-w-0 flex-1 bg-transparent text-sm normal-case tracking-normal text-[color:var(--color-ink)] outline-none placeholder:text-[color:var(--color-ink-dim)]"
                />
              </span>
            </label>

            <DateField label="Trip start date" value={tripStartDate} onChange={setTripStartDate} />
            <DateField label="Trip end date" value={tripEndDate} onChange={setTripEndDate} />
          </div>

          <button
            type="submit"
            disabled={loading || activities.length === 0}
            className="h-11 rounded-full bg-gradient-to-b from-[color:var(--color-gold-bright)] to-[color:var(--color-gold)] px-6 text-sm font-medium text-[color:var(--color-bg)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Packing..." : "Build packing list"}
          </button>

          <fieldset className="lg:col-span-2">
            <legend className="mb-3 text-xs uppercase tracking-widest text-[color:var(--color-ink-dim)]">
              Activities
            </legend>
            <div className="flex flex-wrap gap-2">
              {ACTIVITIES.map((activity) => {
                const selected = activities.includes(activity);
                return (
                  <button
                    key={activity}
                    type="button"
                    onClick={() => toggleActivity(activity)}
                    className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm capitalize transition-colors ${
                      selected
                        ? "border-[color:var(--color-gold)]/60 bg-[color:var(--color-gold)]/10 text-[color:var(--color-gold)]"
                        : "border-[color:var(--color-border)] text-[color:var(--color-ink-muted)] hover:border-[color:var(--color-gold)]/40"
                    }`}
                  >
                    {selected && <Check className="h-4 w-4" />}
                    {activity}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </form>

        {error && (
          <p className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        )}
      </section>

      {result && (
        <section className="space-y-5">
          <div className="flex rounded-2xl border border-[color:var(--color-border-soft)] bg-[color:var(--color-surface)] p-1">
            {[
              { id: "pack", label: "What to Pack" },
              { id: "days", label: "Day by Day" },
              { id: "shopping", label: "Shopping List" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as "pack" | "days" | "shopping")}
                className={`h-10 flex-1 rounded-xl px-3 text-sm transition-colors ${
                  activeTab === tab.id
                    ? "bg-[color:var(--color-bg-elev)] text-[color:var(--color-ink)]"
                    : "text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "pack" && (
            <div className="space-y-5">
              <Section title="Calculated quantities">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {result.calculatedQuantities.map((item) => (
                    <QuantityCard key={item.key} item={item} />
                  ))}
                </div>
              </Section>

              <Section title="Wardrobe matches">
                <div className="space-y-4">
                  {result.wardrobeMatches.map((match) => (
                    <MatchGroup key={match.requirementKey} match={match} />
                  ))}
                </div>
              </Section>
            </div>
          )}

          {activeTab === "days" && (
            <Section title="Day-by-day outfits">
              <div className="grid gap-4 lg:grid-cols-2">
                {result.dayByDayOutfitPlan.map((day) => (
                  <DayCard key={`${day.day}-${day.date}`} day={day} result={result} />
                ))}
              </div>
            </Section>
          )}

          {activeTab === "shopping" && (
            <Section title="Shopping list">
              {result.missingItems.length === 0 ? (
                <div className="rounded-2xl border border-[color:var(--color-border-soft)] bg-[color:var(--color-surface)] p-5 text-sm text-[color:var(--color-ink-muted)]">
                  Everything can be covered from your wardrobe.
                </div>
              ) : (
                <div className="space-y-3">
                  {result.missingItems.map((item) => (
                    <div
                      key={item.label}
                      className="flex flex-col gap-3 rounded-2xl border border-[color:var(--color-border-soft)] bg-[color:var(--color-surface)] p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color:var(--color-bg-elev)]">
                          <ShoppingBag className="h-5 w-5 text-[color:var(--color-gold)]" />
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-[color:var(--color-ink)]">
                            {item.quantity} {item.suggestedType || item.label}
                          </p>
                          <p className="mt-1 text-xs text-[color:var(--color-ink-muted)]">
                            {missingCopy(item.suggestedType || item.label)}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate("/shopping")}
                        className="h-10 rounded-full border border-[color:var(--color-gold)]/40 px-4 text-sm text-[color:var(--color-gold)] hover:bg-[color:var(--color-gold)]/10"
                      >
                        Find this →
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          )}
        </section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-4 font-serif text-3xl text-[color:var(--color-ink)]">{title}</h2>
      {children}
    </div>
  );
}

function QuantityCard({ item }: { item: PackQuantity }) {
  const Icon = quantityIcon(item);
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[color:var(--color-border-soft)] bg-[color:var(--color-surface)] p-5">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color:var(--color-bg-elev)]">
          <Icon className="h-5 w-5 text-[color:var(--color-gold)]" />
        </span>
        <p className="truncate text-sm font-medium text-[color:var(--color-ink)]">{item.label}</p>
      </div>
      <span className="font-serif text-4xl leading-none text-[color:var(--color-gold)]">
        {item.quantity}
      </span>
    </div>
  );
}

function quantityIcon(item: PackQuantity) {
  const key = item.key.toLowerCase();
  if (key.includes("top") || key.includes("shirt") || key.includes("blazer") || key.includes("formaloutfit")) return Shirt;
  if (key.includes("bottom")) return Package;
  if (key.includes("shoe") || key.includes("sandal")) return Footprints;
  if (key.includes("layer")) return Wind;
  if (key.includes("sock")) return Circle;
  if (key.includes("underwear")) return Package;
  return Luggage;
}

function MatchGroup({ match }: { match: WardrobeMatch }) {
  const missingCards = Array.from({ length: match.missingQuantity }, (_, index) => `${match.requirementKey}-${index}`);

  return (
    <div className="rounded-2xl border border-[color:var(--color-border-soft)] bg-[color:var(--color-surface)] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-serif text-xl text-[color:var(--color-ink)]">{match.label}</h3>
        <p className="text-xs text-[color:var(--color-ink-muted)]">{match.requiredQuantity} total</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {match.fromWardrobe.map((item) => (
          <ItemMiniCard key={item.id} item={item} />
        ))}
        {missingCards.map((key) => (
          <MissingMiniCard key={key} label={match.label} />
        ))}
      </div>
    </div>
  );
}

function ItemMiniCard({ item }: { item: PackedWardrobeItem }) {
  return (
    <div className="min-w-0 rounded-xl border border-[color:var(--color-border-soft)] bg-[color:var(--color-bg-elev)] p-2">
      <ItemImage item={item} size="small" />
      <p className="mt-2 truncate text-xs text-[color:var(--color-ink)]">{item.name}</p>
      <p className="mt-1 truncate text-[10px] capitalize text-[color:var(--color-ink-muted)]">
        {item.category}{item.color ? ` · ${item.color}` : ""}
      </p>
      <span className="mt-2 inline-flex rounded-full bg-[#22c55e]/15 px-2 py-0.5 text-[10px] font-medium text-[#4ade80]">
        In bag
      </span>
    </div>
  );
}

function MissingMiniCard({ label }: { label: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-red-400/20 bg-red-500/10 p-2">
      <div className="flex aspect-square items-center justify-center rounded-lg bg-red-500/10">
        <ShoppingBag className="h-5 w-5 text-red-200" />
      </div>
      <p className="mt-2 truncate text-xs text-red-100">{label}</p>
      <span className="mt-2 inline-flex rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-medium text-red-200">
        Buy
      </span>
    </div>
  );
}

function DayCard({ day, result }: { day: DayOutfitPlan; result: PackResponse }) {
  const itemMap = packedItemsByName(result);
  const outfitItems = day.items.map((name, index) => ({
    key: `${name}-${index}`,
    name,
    item: resolvePackedItem(itemMap, name),
  }));

  const copyDay = () => {
    const text = `Day ${day.day} · ${day.date}\n${day.outfitName}\n${day.items.join(", ")}\n${day.notes}`;
    navigator.clipboard?.writeText(text).catch(() => undefined);
  };

  return (
    <article className="rounded-2xl border border-[color:var(--color-border-soft)] bg-[color:var(--color-surface)] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-[color:var(--color-gold)]">
            Day {day.day} · {day.date}
          </p>
          <span className="mt-3 inline-flex rounded-full bg-[color:var(--color-gold)]/10 px-3 py-1 text-xs text-[color:var(--color-gold)]">
            {day.outfitName}
          </span>
        </div>
        <button
          type="button"
          onClick={copyDay}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[color:var(--color-border)] text-[color:var(--color-ink-muted)] hover:border-[color:var(--color-gold)]/40 hover:text-[color:var(--color-ink)]"
          aria-label={`Copy day ${day.day} outfit`}
        >
          <Copy className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {outfitItems.map(({ key, name, item }) => (
          <OutfitItemCard
            key={key}
            label={outfitItemLabel(item?.category)}
            item={item}
            name={name}
          />
        ))}
      </div>
      {day.notes && (
        <p className="mt-4 text-sm leading-6 text-[color:var(--color-ink-muted)]">{cleanReason(day.notes)}</p>
      )}
    </article>
  );
}

function OutfitItemCard({
  label,
  item,
  name,
}: {
  label: string;
  item?: PackedWardrobeItem;
  name: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-[color:var(--color-border-soft)] bg-[color:var(--color-bg-elev)] p-3">
      <p className="mb-2 text-[10px] uppercase tracking-widest text-[color:var(--color-gold)]">{label}</p>
      <div className="flex items-center gap-3">
        <ItemImage item={item} name={name} size="large" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[color:var(--color-ink)]">
            {item?.name ?? name}
          </p>
          {item && (
            <p className="mt-1 truncate text-xs capitalize text-[color:var(--color-ink-muted)]">
              {item.category}{item.color ? ` · ${item.color}` : ""}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ItemImage({
  item,
  name,
  size,
}: {
  item?: PackedWardrobeItem;
  name?: string;
  size: "small" | "large";
}) {
  const displayName = item?.name ?? name ?? "?";
  const className = size === "large" ? "h-16 w-16 rounded-xl" : "aspect-square w-full rounded-lg";

  if (item?.imageUrl) {
    return <img src={item.imageUrl} alt={displayName} className={`${className} object-cover`} />;
  }

  return (
    <div className={`${className} flex items-center justify-center bg-[color:var(--color-surface)] text-sm font-medium text-[color:var(--color-gold)]`}>
      {displayName.charAt(0).toUpperCase()}
    </div>
  );
}

function packedItemsByName(result: PackResponse) {
  const map = new Map<string, PackedWardrobeItem>();
  for (const item of result.wardrobeMatches.flatMap((match) => match.fromWardrobe)) {
    map.set(item.name, item);
    map.set(normalizeItemKey(item.name), item);
    map.set(item.id, item);
    map.set(item.wardrobeItemId, item);
  }
  return map;
}

function resolvePackedItem(itemMap: Map<string, PackedWardrobeItem>, name: string) {
  return itemMap.get(name) ?? itemMap.get(normalizeItemKey(name));
}

function normalizeItemKey(value: string) {
  return value.trim().toLowerCase();
}

function outfitItemLabel(category: Category | undefined) {
  if (category === "tops") return "Top";
  if (category === "bottoms") return "Bottom";
  if (category === "shoes") return "Shoes";
  if (category === "accessories") return "Accessory";
  return "Item";
}

function cleanReason(text: string) {
  return text
    .replace(/5-4-3-2-1 capsule travel rule\.?/gi, "Planned for your trip.")
    .replace(/activity modifier/gi, "trip need");
}

function missingCopy(type: string) {
  const lower = type.toLowerCase();
  if (lower.includes("beach") || lower.includes("swim") || lower.includes("sandal")) return "Recommended for beach trips";
  if (lower.includes("formal") || lower.includes("blazer")) return "Recommended for dressed-up plans";
  if (lower.includes("gym") || lower.includes("athletic")) return "Recommended for workout days";
  if (lower.includes("hiking") || lower.includes("technical")) return "Recommended for trail days";
  return "Not in your wardrobe";
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-xs uppercase tracking-widest text-[color:var(--color-ink-dim)]">
      {label}
      <span className="mt-2 flex h-11 items-center gap-2 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] px-3">
        <CalendarDays className="h-4 w-4 text-[color:var(--color-gold)]" />
        <input
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required
          className="min-w-0 flex-1 bg-transparent text-sm normal-case tracking-normal text-[color:var(--color-ink)] outline-none"
        />
      </span>
    </label>
  );
}
