import { useState, useRef, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Upload, X, Image as ImageIcon, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { fileToDataUrl, titleCase, uid } from "../lib/utils";
import { api } from "../services/api";
import type { Category, ClothingItem } from "../types";

const CATEGORIES: Category[] = ["tops", "bottoms", "shoes", "accessories"];
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

const COMMON_COLORS = [
  "Black",
  "White",
  "Ivory",
  "Cream",
  "Beige",
  "Camel",
  "Tan",
  "Navy",
  "Indigo",
  "Charcoal",
  "Chocolate",
  "Gold",
  "Nude",
  "Red",
  "Green",
  "Pink",
];

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (item: Omit<ClothingItem, "id" | "userId" | "createdAt" | "usageCount">) => void | Promise<void>;
};

type DetectedItem = {
  name?: string;
  category?: Category;
  categoryConfidence?: number | "high" | "medium" | "low";
  confidence?: number;
  color?: string;
  occasion?: string[];
  style?: string | string[];
  styles?: string[];
  genderMismatch?: boolean;
};

const ANALYSIS_CONTEXT_ITEM: ClothingItem = {
  id: "__upload_analysis_context__",
  userId: "__upload__",
  name: "Reference wardrobe item",
  category: "accessories",
  color: "black",
  tags: [],
  imageUrl: "",
  usageCount: 0,
  createdAt: 0,
};

export function UploadModal({ open, onClose, onSubmit }: Props) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("tops");
  const [color, setColor] = useState("");
  const [tags, setTags] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [dragging, setDragging] = useState(false);
  const [fileError, setFileError] = useState("");
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisFailed, setAnalysisFailed] = useState(false);
  const [categoryHighConfidence, setCategoryHighConfidence] = useState(false);
  const [genderMismatch, setGenderMismatch] = useState(false);
  const [saveError, setSaveError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setName("");
    setCategory("tops");
    setColor("");
    setTags("");
    setImageUrl("");
    setFileError("");
    setAnalysisLoading(false);
    setAnalysisFailed(false);
    setCategoryHighConfidence(false);
    setGenderMismatch(false);
    setSaveError("");
  };

  const analyzeImage = async (file: File, dataUrl: string) => {
    setAnalysisLoading(true);
    setAnalysisFailed(false);
    setCategoryHighConfidence(false);
    setGenderMismatch(false);
    try {
      const data = await api.analyzeDiscoveryItem<{ detectedItem?: DetectedItem }>({
        imageBase64: dataUrl.split(",")[1],
        mimeType: file.type,
        items: [ANALYSIS_CONTEXT_ITEM],
        profile: { gender: user?.profile?.gender },
      });
      const detected = data.detectedItem;
      if (!detected) throw new Error("Analysis failed");

      const detectedCategory = CATEGORIES.includes(detected.category as Category)
        ? detected.category
        : undefined;
      const styleTags = Array.isArray(detected.style)
        ? detected.style
        : detected.style
          ? [detected.style]
          : detected.styles ?? [];
      const detectedTags = [...(detected.occasion ?? []), ...styleTags]
        .map((tag) => tag.trim())
        .filter(Boolean);

      setName(detected.name || file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "));
      if (detectedCategory) setCategory(detectedCategory);
      setColor(detected.color || "");
      setTags(Array.from(new Set(detectedTags)).join(", "));
      setCategoryHighConfidence(isHighConfidence(detected, detectedCategory));
      setGenderMismatch(detected.genderMismatch === true);
    } catch {
      setAnalysisFailed(true);
      if (!name) {
        setName(file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "));
      }
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleFile = async (file: File) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setFileError("Please upload a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setFileError("Please upload an image under 10MB.");
      return;
    }
    setFileError("");
    const url = await fileToDataUrl(file);
    setImageUrl(url);
    if (!name) {
      setName(file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "));
    }
    await analyzeImage(file, url);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    console.info("[wardrobe:save] Save button clicked", {
      hasImageUrl: Boolean(imageUrl),
      name,
      category,
      color,
      tags,
    });
    if (!imageUrl || !name || !color) {
      console.warn("[wardrobe:save] Save blocked by frontend validation", {
        hasImageUrl: Boolean(imageUrl),
        hasName: Boolean(name),
        hasColor: Boolean(color),
      });
      return;
    }
    const payload = {
      name,
      category,
      color,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      imageUrl,
      isFavorite: false,
    };
    console.info("[wardrobe:save] Payload being sent", {
      ...payload,
      imageUrl: summarizeImageUrl(payload.imageUrl),
    });
    setSaveError("");
    try {
      await onSubmit(payload);
      reset();
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save this item";
      console.error("[wardrobe:save] Save failed before modal close", error);
      setSaveError(message);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-3 max-h-[90vh] overflow-y-auto rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] shadow-2xl no-scrollbar z-50 md:inset-auto md:left-1/2 md:top-1/2 md:w-[720px] md:-translate-x-1/2 md:-translate-y-1/2"
          >
            <form onSubmit={submit}>
              <div className="flex items-start justify-between border-b border-[color:var(--color-border-soft)] p-4 md:p-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="h-4 w-4 text-[color:var(--color-gold)]" />
                    <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-gold)]">
                      Add to wardrobe
                    </p>
                  </div>
                  <h2 className="font-serif text-xl text-[color:var(--color-ink)] md:text-2xl">
                    A new piece
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="h-9 w-9 rounded-full hover:bg-[color:var(--color-surface)] flex items-center justify-center"
                >
                  <X className="h-4 w-4 text-[color:var(--color-ink-muted)]" />
                </button>
              </div>

              <div className="grid gap-5 p-4 md:grid-cols-2 md:gap-6 md:p-6">
                {/* Upload */}
                <div>
                  <label className="text-xs uppercase tracking-widest text-[color:var(--color-ink-dim)]">
                    Image
                  </label>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={onDrop}
                    onClick={() => fileRef.current?.click()}
                    className={`mt-2 aspect-[4/5] rounded-xl border-2 border-dashed cursor-pointer overflow-hidden relative transition-colors ${
                      dragging
                        ? "border-[color:var(--color-gold)] bg-[color:var(--color-surface)]"
                        : "border-[color:var(--color-border)] hover:border-[color:var(--color-gold)]/50"
                    }`}
                  >
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt="Preview"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-[color:var(--color-ink-muted)]">
                        <div className="h-12 w-12 rounded-full bg-[color:var(--color-surface)] flex items-center justify-center">
                          {dragging ? (
                            <Upload className="h-5 w-5 text-[color:var(--color-gold)]" />
                          ) : (
                            <ImageIcon className="h-5 w-5" />
                          )}
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-[color:var(--color-ink)]">
                            Drop an image or click to browse
                          </p>
                          <p className="text-xs text-[color:var(--color-ink-dim)] mt-1">
                            PNG, JPG, WebP up to 10MB
                          </p>
                        </div>
                      </div>
                    )}
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={onFileChange}
                    />
                  </div>
                  {fileError && (
                    <p className="mt-2 rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                      {fileError}
                    </p>
                  )}
                  {saveError && (
                    <p className="mt-2 rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                      {saveError}
                    </p>
                  )}
                  {analysisLoading && (
                    <p className="mt-2 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-2 text-xs text-[color:var(--color-ink-muted)]">
                      Analyzing image...
                    </p>
                  )}
                  {analysisFailed && (
                    <p className="mt-2 rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                      AI analysis failed. Please enter the details manually.
                    </p>
                  )}
                </div>

                {/* Fields */}
                <div className="space-y-5">
                  {imageUrl && !analysisLoading && !analysisFailed && (
                    <>
                      <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-2">
                        {categoryHighConfidence ? (
                          <p className="flex items-center gap-2 text-xs text-[#4ade80]">
                            <CheckCircle2 className="h-4 w-4" />
                            Category detected with high confidence
                          </p>
                        ) : (
                          <p className="text-xs text-amber-200">Please verify</p>
                        )}
                      </div>
                      {genderMismatch && (
                        <p className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                          This item looks like it may not match your style profile — you can still save it or try a different photo.
                        </p>
                      )}
                    </>
                  )}

                  <Field label="Name" required>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Silk slip dress"
                      required
                      className="field-input"
                    />
                  </Field>

                  <Field label="Category" required>
                    <div className="grid grid-cols-2 gap-2">
                      {CATEGORIES.map((c) => (
                        <button
                          type="button"
                          key={c}
                          onClick={() => setCategory(c)}
                          className={`px-3 py-2.5 rounded-lg text-sm transition-all border ${
                            category === c
                              ? "border-[color:var(--color-gold)]/60 bg-[color:var(--color-gold)]/10 text-[color:var(--color-gold-bright)]"
                              : "border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-ink-muted)] hover:border-[color:var(--color-border)] hover:text-[color:var(--color-ink)]"
                          }`}
                        >
                          {titleCase(c)}
                        </button>
                      ))}
                    </div>
                  </Field>

                  <Field label="Color" required>
                    <input
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      placeholder="Ivory"
                      list="color-suggestions"
                      required
                      className="field-input"
                    />
                    <datalist id="color-suggestions">
                      {COMMON_COLORS.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </Field>

                  <Field label="Tags (comma separated)">
                    <input
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="silk, formal, summer"
                      className="field-input"
                    />
                  </Field>
                </div>
              </div>

              <div className="flex flex-col items-stretch justify-end gap-3 border-t border-[color:var(--color-border-soft)] p-4 sm:flex-row sm:items-center md:p-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-10 rounded-full px-5 text-sm text-[color:var(--color-ink-muted)] transition-colors hover:text-[color:var(--color-ink)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!imageUrl || !name || !color}
                  className="h-10 w-full rounded-full bg-gradient-to-b from-[color:var(--color-gold-bright)] to-[color:var(--color-gold)] px-6 text-sm font-medium text-[color:var(--color-bg)] transition-shadow hover:shadow-lg hover:shadow-[color:var(--color-gold-shadow)]/30 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                >
                  Save to wardrobe
                </button>
              </div>
            </form>
          </motion.div>

          <style>{`
            .field-input {
              width: 100%;
              height: 40px;
              padding: 0 14px;
              background: #16161a;
              border: 1px solid #26262c;
              border-radius: 10px;
              color: #f6f4ef;
              font-size: 14px;
              outline: none;
              transition: border-color 0.2s;
            }
            .field-input:focus {
              border-color: rgba(212,180,131,0.5);
            }
            .field-input::placeholder {
              color: #6f6d68;
            }
          `}</style>
        </>
      )}
    </AnimatePresence>
  );
}

function summarizeImageUrl(imageUrl: string) {
  if (!imageUrl) return { present: false };
  return {
    present: true,
    kind: imageUrl.startsWith("data:") ? "data-url" : "remote-url",
    length: imageUrl.length,
    prefix: imageUrl.slice(0, 32),
  };
}

function isHighConfidence(detected: DetectedItem, category?: Category): boolean {
  if (!category) return false;
  const confidence = detected.categoryConfidence ?? detected.confidence;
  if (typeof confidence === "number") return confidence >= 0.75;
  if (typeof confidence === "string") return confidence.toLowerCase() === "high";
  return true;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  void uid;
  return (
    <div>
      <label className="text-xs uppercase tracking-widest text-[color:var(--color-ink-dim)]">
        {label}
        {required && <span className="text-[color:var(--color-gold)] ml-1">*</span>}
      </label>
      <div className="mt-2">{children}</div>
    </div>
  );
}
