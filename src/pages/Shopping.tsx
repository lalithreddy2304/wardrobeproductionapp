import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useWardrobe } from "../context/WardrobeContext";
import { FallbackImage } from "../components/ui/FallbackImage";
import { api, ApiError } from "../services/api";
import type { ClothingItem } from "../types";

type Phase = "upload" | "analyzing" | "result";

type AnalysisResult = {
  detectedItem: {
    name: string;
    category: "tops" | "bottoms" | "shoes" | "accessories";
    color: string;
    pattern: string;
    style: string;
    fabric: string;
    fit: string;
    occasion: string[];
    season: string[];
    dominantColors: string[];
    styleNotes: string;
    wardrobeCompatibility: string;
    genderMismatch?: boolean;
  };
  compatibility: {
    matchingItems: string[];
    reason: string;
    styleAdvice: string;
  };
};

type OutfitExample = {
  items: {
    id: string;
    name: string;
    imageUrl: string;
    category: ClothingItem["category"];
  }[];
  occasion: string;
};

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
  "stone",
  "slate",
  "denim",
  "ivory",
  "cream",
];

const EMPTY_ANALYSIS_ITEM: ClothingItem = {
  id: "__analysis_placeholder__",
  userId: "__analysis__",
  name: "Reference wardrobe item",
  category: "accessories",
  color: "black",
  tags: [],
  imageUrl: "",
  usageCount: 0,
  createdAt: 0,
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.readAsDataURL(file);
  });
}

async function analyzeItem(
  imageFile: File,
  items: ClothingItem[],
  profile: unknown
): Promise<AnalysisResult> {
  const dataUrl = await fileToDataUrl(imageFile);
  return api.analyzeDiscoveryItem<AnalysisResult>({
    imageBase64: dataUrl.split(",")[1],
    mimeType: imageFile.type,
    items: items.length > 0 ? items : [EMPTY_ANALYSIS_ITEM],
    profile,
  });
}

function getPairedItems(
  wardrobeItems: ClothingItem[],
  detectedItem: AnalysisResult["detectedItem"]
) {
  const analyzedColor = detectedItem.color.toLowerCase();
  const analyzedColorToken = analyzedColor.split(" ")[0] ?? "";
  const itemIsNeutral = NEUTRALS.some((neutral) => analyzedColor.includes(neutral));
  const pairedItems = wardrobeItems.filter((item) => {
    if (item.category === detectedItem.category) return false;
    const existingIsNeutral = NEUTRALS.some((neutral) =>
      item.color.toLowerCase().includes(neutral)
    );
    return (
      itemIsNeutral ||
      existingIsNeutral ||
      item.color.toLowerCase().includes(analyzedColorToken)
    );
  });

  return Array.from(new Map(pairedItems.map((item) => [item.id, item])).values());
}

function getNewOutfits(wardrobeItems: ClothingItem[], category: ClothingItem["category"]) {
  const tops = wardrobeItems.filter((item) => item.category === "tops");
  const bottoms = wardrobeItems.filter((item) => item.category === "bottoms");
  const shoes = wardrobeItems.filter((item) => item.category === "shoes");
  const currentCombos = tops.length * bottoms.length * Math.max(shoes.length, 1);
  const t = category === "tops" ? tops.length + 1 : tops.length;
  const b = category === "bottoms" ? bottoms.length + 1 : bottoms.length;
  const s = category === "shoes" ? shoes.length + 1 : shoes.length;
  const newCombos = t * b * Math.max(s, 1);

  return Math.max(0, newCombos - currentCombos);
}

function buildExampleOutfits(
  wardrobeItems: ClothingItem[],
  detectedItem: AnalysisResult["detectedItem"],
  uploadedImageUrl: string
): OutfitExample[] {
  const tops = wardrobeItems.filter((item) => item.category === "tops");
  const bottoms = wardrobeItems.filter((item) => item.category === "bottoms");
  const shoes = wardrobeItems.filter((item) => item.category === "shoes");
  const newItem = {
    id: "__new_item__",
    name: "New Item",
    imageUrl: uploadedImageUrl,
    category: detectedItem.category,
  };
  const neutralShoe = shoes.find((shoe) =>
    NEUTRALS.some((neutral) => shoe.color.toLowerCase().includes(neutral))
  );
  const bestShoe = neutralShoe ?? shoes[0];

  if (detectedItem.category === "tops") {
    return bottoms.slice(0, 4).map((bottom) => ({
      items: [newItem, bottom, ...(bestShoe ? [bestShoe] : [])],
      occasion: bottom.tags?.includes("formal") ? "Smart look" : "Casual look",
    }));
  }

  if (detectedItem.category === "bottoms") {
    return tops.slice(0, 4).map((top) => ({
      items: [top, newItem, ...(bestShoe ? [bestShoe] : [])],
      occasion: top.tags?.includes("formal") ? "Smart look" : "Casual look",
    }));
  }

  if (detectedItem.category === "shoes") {
    return tops.slice(0, 4).map((top, index) => {
      const bottom = bottoms[index % Math.max(bottoms.length, 1)];
      return {
        items: [top, ...(bottom ? [bottom] : []), newItem],
        occasion: top.tags?.includes("formal") || bottom?.tags?.includes("formal")
          ? "Smart look"
          : "Casual look",
      };
    });
  }

  return wardrobeItems
    .filter((item) => item.category !== "accessories")
    .slice(0, 4)
    .map((item) => ({
      items: [newItem, item],
      occasion: item.tags?.includes("formal") ? "Smart look" : "Casual look",
    }));
}

function twoSentenceStyleNote(text: string) {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  return sentences.slice(0, 2).join(" ");
}

function costValue(pricePerOutfit: number) {
  if (pricePerOutfit < 300) return { label: "Excellent value", className: "text-[color:var(--color-gold)]" };
  if (pricePerOutfit < 800) return { label: "Good value", className: "text-[#4ade80]" };
  if (pricePerOutfit < 2000) return { label: "Fair value", className: "text-[#f59e0b]" };
  if (pricePerOutfit < 5000) return { label: "Expensive", className: "text-[#f97316]" };
  return { label: "Very expensive", className: "text-[#ef4444]" };
}

export function Shopping() {
  const { user } = useAuth();
  const { items } = useWardrobe();
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("upload");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [price, setPrice] = useState<number>(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [visibleSteps, setVisibleSteps] = useState(0);

  const canAnalyze = !!imageFile;
  const pairedItems = result ? getPairedItems(items, result.detectedItem) : [];
  const progress = result ? Math.min(100, Math.round((pairedItems.length / Math.max(items.length, 1)) * 100)) : 0;
  const newOutfits = result ? getNewOutfits(items, result.detectedItem.category) : 0;
  const pricePerOutfit = newOutfits > 0 ? price / newOutfits : 0;
  const valueLabel = pricePerOutfit > 0 ? costValue(pricePerOutfit) : null;
  const exampleOutfits = result && uploadedImage
    ? buildExampleOutfits(items, result.detectedItem, uploadedImage).slice(0, 4)
    : [];
  const styleNote = result
    ? twoSentenceStyleNote(result.detectedItem.styleNotes || result.compatibility.styleAdvice || result.compatibility.reason)
    : "";

  const steps = useMemo(() => ["Photo analyzed", "Colors detected", "Wardrobe compared"], []);

  useEffect(() => {
    if (phase !== "analyzing") {
      setVisibleSteps(0);
      return;
    }

    const timers = steps.map((_, index) =>
      window.setTimeout(() => setVisibleSteps(index + 1), (index + 1) * 1000)
    );
    return () => timers.forEach(window.clearTimeout);
  }, [phase, steps]);

  const onSelectFile = async (file?: File) => {
    if (!file) return;
    setError(null);
    setResult(null);
    setImageFile(file);
    setUploadedImage(await fileToDataUrl(file));
  };

  const reset = () => {
    setPhase("upload");
    setUploadedImage(null);
    setImageFile(null);
    setPrice(0);
    setResult(null);
    setError(null);
  };

  const submit = async () => {
    if (!imageFile) return;
    setPhase("analyzing");
    setError(null);
    try {
      const analysis = await analyzeItem(imageFile, items, {
        ...(user?.profile ?? {}),
        gender: user?.profile?.gender,
      });
      setResult(analysis);
      setPhase("result");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return;
      setError(err instanceof Error ? err.message : "Analysis failed");
      setPhase("upload");
    }
  };

  return (
    <div className="mx-auto max-w-[1200px]">
      <AnimatePresence mode="wait">
        {phase === "upload" && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-6 md:space-y-8"
          >
            <header className="space-y-3">
              <p className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-gold)]">
                Analyse a Piece
              </p>
              <h2 className="font-serif text-[34px] leading-tight text-[color:var(--color-ink)] md:text-[58px] md:leading-none">
                Analyse a Piece
              </h2>
              <p className="max-w-xl text-sm md:text-base text-[color:var(--color-ink-muted)]">
                See how a new item fits your wardrobe before you buy it
              </p>
            </header>

            <div
              data-onboarding-target="smart-buy-recommendations"
              onClick={() => inputRef.current?.click()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                onSelectFile(event.dataTransfer.files[0]);
              }}
              className="relative min-h-[240px] cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed border-[color:var(--color-border)] bg-[color:var(--color-surface)]/55 transition-colors hover:border-[color:var(--color-gold)]/40 md:min-h-[300px] md:rounded-3xl"
            >
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => onSelectFile(event.target.files?.[0])}
              />

              {uploadedImage ? (
                <>
                  <img src={uploadedImage} alt="Uploaded item" className="absolute inset-0 h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setUploadedImage(null);
                      setImageFile(null);
                    }}
                    className="absolute right-4 top-4 h-9 w-9 rounded-full bg-black/60 backdrop-blur flex items-center justify-center text-white hover:bg-black/80"
                    aria-label="Clear image"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                  <div className="h-14 w-14 rounded-full bg-[color:var(--color-gold)]/12 flex items-center justify-center mb-4">
                    <Upload className="h-6 w-6 text-[color:var(--color-gold)]" />
                  </div>
                  <p className="font-serif text-2xl text-[color:var(--color-ink)]">Drop a photo here</p>
                  <p className="mt-1 text-sm text-[color:var(--color-ink-muted)]">or tap to browse</p>
                </div>
              )}
            </div>

            <div className="max-w-xl space-y-5">
              <PriceInput price={price} setPrice={setPrice} />

              {error && (
                <p className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={submit}
                disabled={!canAnalyze}
                className="h-12 w-full rounded-full bg-gradient-to-b from-[color:var(--color-gold-bright)] to-[color:var(--color-gold)] text-[color:var(--color-bg)] font-medium text-sm disabled:opacity-45 disabled:cursor-not-allowed"
              >
                Analyse this piece
              </button>
            </div>
          </motion.div>
        )}

        {phase === "analyzing" && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex min-h-[60vh] flex-col items-center justify-center text-center md:min-h-[70vh]"
          >
            <Sparkles className="h-10 w-10 text-[color:var(--color-gold)] animate-pulse mb-5" />
            <h2 className="font-serif text-3xl text-[color:var(--color-ink)] md:text-4xl">
              Analysing your piece...
            </h2>
            <p className="mt-2 text-sm text-[color:var(--color-ink-muted)]">
              Mapping it against your wardrobe
            </p>
            <div className="mt-8 space-y-3">
              {steps.map((step, index) => (
                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: visibleSteps > index ? 1 : 0.25, y: 0 }}
                  className="flex items-center justify-center gap-2 text-sm text-[color:var(--color-ink-muted)]"
                >
                  <Check className="h-4 w-4 text-[color:var(--color-gold)]" />
                  {step}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {phase === "result" && result && uploadedImage && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="grid gap-5 md:gap-8 lg:grid-cols-[420px_1fr]"
          >
            <aside className="lg:sticky lg:top-8 h-fit space-y-4">
              <img src={uploadedImage} alt={result.detectedItem.name} className="w-full rounded-2xl object-cover aspect-[4/5]" />
              <div className="rounded-2xl border border-[color:var(--color-border-soft)] bg-[color:var(--color-surface)] p-4 md:p-5">
                <h2 className="font-serif text-2xl text-[color:var(--color-ink)]">{result.detectedItem.name}</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {[
                    result.detectedItem.color,
                    result.detectedItem.category,
                    result.detectedItem.pattern,
                    result.detectedItem.style,
                    result.detectedItem.fabric,
                    result.detectedItem.fit,
                  ].map((chip) => (
                    <span key={chip} className="rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] px-3 py-1 text-xs text-[color:var(--color-ink-muted)]">
                      {chip}
                    </span>
                  ))}
                </div>
                {result.detectedItem.occasion.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {result.detectedItem.occasion.map((occasion) => (
                      <span key={occasion} className="rounded-full border border-[color:var(--color-gold)]/25 px-2.5 py-1 text-[10px] uppercase tracking-widest text-[color:var(--color-gold)]">
                        {occasion}
                      </span>
                    ))}
                  </div>
                )}
                {result.detectedItem.styleNotes && (
                  <p className="mt-4 text-sm italic leading-relaxed text-[color:var(--color-ink-muted)]">
                    {result.detectedItem.styleNotes}
                  </p>
                )}
                <div className="mt-5">
                  <PriceInput price={price} setPrice={setPrice} />
                </div>
              </div>
            </aside>

            <section className="space-y-5">
              {items.length === 0 ? (
                <InfoBlock
                  title="Wardrobe"
                  text="Add items to your wardrobe first to see how this piece fits in"
                />
              ) : (
                <>
                  <div className="rounded-2xl border border-[color:var(--color-border-soft)] bg-[color:var(--color-surface)] p-4 md:p-5">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm text-[color:var(--color-ink)]">
                        Pairs with {pairedItems.length} of your {items.length} pieces
                      </p>
                      <p className="text-sm text-[color:var(--color-ink-muted)]">{progress}%</p>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-[color:var(--color-bg-elev)] overflow-hidden">
                      <div className="h-full rounded-full bg-[color:var(--color-gold)]" style={{ width: `${progress}%` }} />
                    </div>
                    {pairedItems.length > 0 && (
                      <div className="mt-5 flex gap-4 overflow-x-auto pb-2">
                        {pairedItems.map((item) => (
                          <div key={item.id} className="w-20 shrink-0">
                            <FallbackImage
                              src={item.imageUrl}
                              alt={item.name}
                              category={item.category}
                              fallbackLabel={item.name}
                              className="h-16 w-16 rounded-xl object-cover"
                            />
                            <p className="mt-2 truncate text-xs text-[color:var(--color-ink)]">{item.name}</p>
                            <p className="mt-1 w-fit rounded-full border border-[color:var(--color-border)] px-2 py-0.5 text-[9px] uppercase tracking-widest text-[color:var(--color-ink-dim)]">
                              {item.category}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-[color:var(--color-border-soft)] bg-[color:var(--color-surface)] p-4 md:p-5">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-gold)]">Outfits this unlocks</p>
                    <p className="mt-2 text-xl text-[color:var(--color-ink)]">{newOutfits} new combinations</p>
                    {exampleOutfits.length > 0 && (
                      <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        {exampleOutfits.map((outfit, index) => (
                          <motion.div
                            key={`${outfit.occasion}-${index}`}
                            whileHover={{ y: -2 }}
                            className="rounded-2xl border border-[color:var(--color-border-soft)] bg-[color:var(--color-bg-elev)] p-4"
                          >
                            <div className="flex gap-2">
                              {outfit.items.map((item) => (
                                <FallbackImage
                                  key={`${item.id}-${item.category}`}
                                  src={item.imageUrl}
                                  alt={item.name}
                                  category={item.category}
                                  fallbackLabel={item.name}
                                  className="h-14 w-14 rounded-lg object-cover"
                                />
                              ))}
                            </div>
                            <p className="mt-4 text-xs uppercase tracking-[0.22em] text-[color:var(--color-gold)]">
                              {outfit.occasion}
                            </p>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>

                  {price > 0 && (
                    <div className="rounded-2xl border border-[color:var(--color-border-soft)] bg-[color:var(--color-surface)] p-4 md:p-5">
                      <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-gold)]">Cost per wear</p>
                      {newOutfits === 0 ? (
                        <p className="mt-2 text-sm leading-relaxed text-[color:var(--color-ink-muted)]">
                          This category is already well covered in your wardrobe
                        </p>
                      ) : (
                        <div className="mt-2 space-y-1 text-sm text-[color:var(--color-ink-muted)]">
                          <p>₹{price} for {newOutfits} new outfits</p>
                          <p>= ₹{Math.round(pricePerOutfit)} per outfit</p>
                          {valueLabel && (
                            <p className={`font-medium ${valueLabel.className}`}>{valueLabel.label}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              <InfoBlock title="Style notes" text={styleNote} />

              <div className="flex pt-2">
                <button
                  type="button"
                  onClick={reset}
                  className="h-11 w-full rounded-full border border-[color:var(--color-border)] px-5 text-sm text-[color:var(--color-ink)] hover:border-[color:var(--color-gold)]/50 sm:w-auto"
                >
                  Analyse another piece
                </button>
              </div>
            </section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PriceInput({
  price,
  setPrice,
}: {
  price: number;
  setPrice: (price: number) => void;
}) {
  return (
    <label className="relative block max-w-sm">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[color:var(--color-gold)]">₹</span>
      <input
        type="number"
        min={0}
        value={price || ""}
        onChange={(event) => setPrice(Number(event.target.value) || 0)}
        placeholder="Enter price (optional)"
        className="h-11 w-full rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] pl-8 pr-3 text-sm text-[color:var(--color-ink)] placeholder:text-[color:var(--color-ink-dim)] focus-gold"
      />
    </label>
  );
}

function InfoBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-[color:var(--color-border-soft)] bg-[color:var(--color-surface)] p-4 md:p-5">
      <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-gold)]">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-[color:var(--color-ink-muted)]">{text}</p>
    </div>
  );
}
