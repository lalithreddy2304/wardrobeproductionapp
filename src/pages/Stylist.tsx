import { useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, Bookmark, Mic, Trash2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useWardrobe } from "../context/WardrobeContext";
import { api } from "../services/api";
import type { ChatMessage, ClothingItem, Outfit, OutfitItemRef, UserProfile } from "../types";
import { uid } from "../lib/utils";

type StylistMessage = ChatMessage & {
  streaming?: boolean;
};

type WardrobeStats = {
  tops: ClothingItem[];
  bottoms: ClothingItem[];
  shoes: ClothingItem[];
  accessories: ClothingItem[];
  recentItem: ClothingItem | undefined;
  favoriteItems: ClothingItem[];
  topColors: string[];
};

async function streamStylistResponse(
  userMessage: string,
  items: ClothingItem[],
  outfits: Outfit[],
  profile: UserProfile | undefined,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (fallbackText: string) => void
) {
  try {
    const { reply } = await api.sendChat(userMessage, items, outfits, profile);
    onChunk(reply.content);
    onDone();
  } catch (err) {
    console.error("Stylist request error:", err);
    onError("I'm having trouble right now. Try again in a moment.");
  }
}

export function Stylist() {
  const { user } = useAuth();
  const { items, outfits, addOutfit } = useWardrobe();
  const firstName = user?.displayName?.split(" ")[0] ?? "there";
  const stats = useMemo(() => getWardrobeStats(items), [items]);
  const [messages, setMessages] = useState<StylistMessage[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [hasSentMessage, setHasSentMessage] = useState(false);
  const [userNearBottom, setUserNearBottom] = useState(true);
  const [savedMessageIds, setSavedMessageIds] = useState<Set<string>>(new Set());
  const messagesRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const openingMessage = () => createOpeningMessage(firstName, items, stats.recentItem, stats.topColors);

  useEffect(() => {
    setMessages([openingMessage()]);
    setHasSentMessage(false);
  }, [user?.id]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    setVoiceSupported(
      typeof window !== "undefined" &&
        ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
    );
  }, []);

  useEffect(() => {
    if (!userNearBottom) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, thinking, userNearBottom]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 112)}px`;
  }, [input]);

  const quickPrompts = useMemo(
    () =>
      [
        stats.recentItem ? `What goes with my ${stats.recentItem.name}?` : "What should I wear today?",
        "Build me a work outfit",
        stats.favoriteItems.length > 0 ? `Style my ${stats.favoriteItems[0].name}` : "Suggest a casual look",
        "What am I missing for a formal event?",
        "Surprise me with something new",
      ].filter(Boolean).slice(0, 4),
    [stats.recentItem, stats.favoriteItems]
  );

  const onScroll = () => {
    const el = messagesRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setUserNearBottom(distanceFromBottom < 120);
  };

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || thinking) return;

    const userMessage: ChatMessage = {
      id: uid("m_"),
      role: "user",
      content,
      timestamp: Date.now(),
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setThinking(true);
    setHasSentMessage(true);
    setUserNearBottom(true);

    try {
      const assistantMsgId = uid("m_");
      const assistantMessage: StylistMessage = {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        timestamp: Date.now(),
        streaming: true,
      };
      setMessages((current) => [...current, assistantMessage]);
      await streamStylistResponse(
        content,
        items,
        outfits,
        user?.profile,
        (text) => {
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantMsgId
                ? { ...message, content: message.content + text }
                : message
            )
          );
        },
        () => {
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantMsgId
                ? {
                    ...message,
                    content: message.content.trim() || "I'm having trouble connecting right now. Try again in a moment.",
                    streaming: false,
                  }
                : message
            )
          );
        },
        (fallbackText) => {
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantMsgId
                ? {
                    ...message,
                    content: fallbackText,
                    streaming: false,
                  }
                : message
            )
          );
        }
      );
    } catch {
      const fallbackMessage: ChatMessage = {
        id: uid("m_"),
        role: "assistant",
        content: "I'm having trouble connecting right now. Try again in a moment.",
        timestamp: Date.now(),
      };
      setMessages((current) => [...current, fallbackMessage]);
    } finally {
      setThinking(false);
      window.setTimeout(() => textareaRef.current?.focus(), 0);
    }
  };

  const clear = () => {
    setMessages([openingMessage()]);
    setHasSentMessage(false);
    setInput("");
    setThinking(false);
    setUserNearBottom(true);
    setSavedMessageIds(new Set());
    window.setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleSaveOutfit = async (
    outfitItems: ClothingItem[],
    notes: string,
    messageId: string
  ) => {
    if (!user || savedMessageIds.has(messageId)) return;

    const itemRefs: OutfitItemRef[] = outfitItems.map((item) => ({
      itemId: item.id,
      role: item.category === "tops"
        ? "top"
        : item.category === "bottoms"
          ? "bottom"
          : item.category === "shoes"
            ? "shoes"
            : "accessory",
    }));
    const outfitName = `Stylist Pick · ${new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    })}`;

    await addOutfit({
      id: uid("o_"),
      userId: user.id,
      name: outfitName,
      items: itemRefs,
      occasion: "casual",
      notes: notes.slice(0, 150),
      rating: 0,
      isFavorite: false,
      createdAt: Date.now(),
    });
    setSavedMessageIds((current) => new Set(current).add(messageId));
  };

  const startVoice = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setListening(true);
    recognition.start();

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setListening(false);
    };

    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
  };

  return (
    <div className="mx-auto grid max-w-[1300px] gap-6 lg:grid-cols-[1fr_280px]">
      <style>
        {`
          @keyframes stylist-mic-pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(201,168,76,0.22); }
            50% { box-shadow: 0 0 0 7px rgba(201,168,76,0); }
          }
          .stylist-mic-pulse { animation: stylist-mic-pulse 1.1s infinite; }
          @keyframes stylist-cursor-blink {
            0%, 100% { opacity: 0; }
            50% { opacity: 1; }
          }
          .stylist-stream-cursor { animation: stylist-cursor-blink 0.7s infinite; }
        `}
      </style>
      <section
        className="flex min-h-[calc(100vh-190px)] flex-col overflow-hidden rounded-3xl border border-[color:var(--color-border-soft)] bg-[color:var(--color-surface)]"
      >
        <header className="flex items-center justify-between border-b border-[color:var(--color-border-soft)] px-5 py-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-gold)]">
              Personal stylist
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-serif text-2xl text-[color:var(--color-ink)]">
                Style conversation
              </h1>
              <span className="rounded-full border border-[color:var(--color-gold)]/20 bg-[color:var(--color-gold)]/10 px-2.5 py-0.5 text-[10px] text-[color:var(--color-gold)]">
                AI · Always learning
              </span>
            </div>
          </div>
          <button
            onClick={clear}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[color:var(--color-ink-muted)] hover:bg-[color:var(--color-bg-elev)] hover:text-[color:var(--color-gold)]"
            aria-label="Clear chat"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </header>

        <div
          ref={messagesRef}
          onScroll={onScroll}
          className="flex-1 overflow-y-auto px-5 py-6"
        >
          <div className="mx-auto flex max-w-3xl flex-col gap-5">
            <AnimatePresence initial={false}>
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  items={items}
                  saved={savedMessageIds.has(message.id)}
                  onSaveOutfit={handleSaveOutfit}
                />
              ))}
            </AnimatePresence>
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="border-t border-[color:var(--color-border-soft)] px-5 py-4">
          {!hasSentMessage && (
            <>
              <SuggestionCards onSend={send} disabled={thinking} />
              <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => send(prompt)}
                    disabled={thinking}
                    className="shrink-0 rounded-full border border-[color:var(--color-gold)]/20 px-3 py-1.5 text-xs text-[color:var(--color-ink-muted)] transition-colors hover:text-[color:var(--color-gold)] disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="mx-auto max-w-3xl">
            <p className="mb-2 text-[10px] uppercase tracking-widest text-[color:var(--color-ink-dim)]">
              Your wardrobe · {items.length} pieces
            </p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                send();
              }}
              className="rounded-2xl border border-[color:var(--color-border-soft)] bg-[color:var(--color-bg-elev)] p-4 transition-shadow focus-within:border-[color:var(--color-gold)]/40 focus-within:shadow-[0_0_0_3px_rgba(201,168,76,0.1)]"
            >
              <div className="flex items-end gap-3">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      send();
                    }
                  }}
                  disabled={thinking}
                  rows={1}
                  placeholder="Ask your stylist anything..."
                  className="max-h-28 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-[color:var(--color-ink)] outline-none placeholder:text-[color:var(--color-ink-dim)] disabled:opacity-60"
                />
                {voiceSupported && (
                  <button
                    type="button"
                    onClick={startVoice}
                    disabled={thinking}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
                      listening
                        ? "text-[color:var(--color-gold)] stylist-mic-pulse"
                        : "text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-gold)]"
                    } disabled:opacity-50`}
                    aria-label="Use voice input"
                  >
                    <Mic className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!input.trim() || thinking}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-gold)] text-[color:var(--color-bg)] transition-colors duration-200 disabled:bg-[color:var(--color-border)] disabled:text-[color:var(--color-ink-dim)]"
                  aria-label="Send message"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
              </div>
            </form>
            <div className="mt-2 flex min-h-5 items-center justify-between px-1 text-xs text-[color:var(--color-ink-dim)]">
              <span>{thinking ? "Stylist is thinking..." : ""}</span>
              <span>{input.length > 200 ? `${input.length} characters` : ""}</span>
            </div>
          </div>
        </div>
      </section>

      <aside className="hidden space-y-4 lg:block">
        <StyleProfileCard items={items} outfitsCount={outfits.length} stats={stats} />
        <WardrobeSnapshot stats={stats} />
        <TipCard stats={stats} />
      </aside>
    </div>
  );
}

function MessageBubble({
  message,
  items,
  saved,
  onSaveOutfit,
}: {
  message: StylistMessage;
  items: ClothingItem[];
  saved: boolean;
  onSaveOutfit: (outfitItems: ClothingItem[], notes: string, messageId: string) => void;
}) {
  const isUser = message.role === "user";
  const OUTFIT_TRIGGERS = [
    "wear", "outfit", "pair with", "match",
    "put together", "what goes", "suggest an outfit",
    "recommend an outfit", "give me a look",
    "formal outfit", "casual outfit", "what should i wear",
  ];
  const NON_OUTFIT_PHRASES = [
    "is my wardrobe", "wardrobe good", "wardrobe bad",
    "how is my", "what do you think", "review my",
    "analyse my", "analyze my", "wardrobe balance",
    "missing", "should i buy", "what to add",
  ];
  const lowerContent = message.content.toLowerCase();
  const isOutfitMessage =
    OUTFIT_TRIGGERS.some((trigger) => lowerContent.includes(trigger)) &&
    !NON_OUTFIT_PHRASES.some((phrase) => lowerContent.includes(phrase));
  const seenIds = new Set<string>();
  const uniqueItems = isOutfitMessage
    ? items.filter((item) => {
        if (!lowerContent.includes(item.name.toLowerCase())) return false;
        if (seenIds.has(item.id)) return false;
        seenIds.add(item.id);
        return true;
      })
    : [];
  const showPhotos = uniqueItems.length >= 2;
  const displayItems = uniqueItems.slice(0, 4);
  const showExtras = !isUser && !message.streaming;
  const canSave = showExtras && showPhotos;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`group flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
    >
      {!isUser && (
        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[color:var(--color-gold)]">
          ✦
        </div>
      )}
      <div className={`max-w-[82%] ${isUser ? "text-right" : "text-left"}`}>
        <div
          className={
            isUser
              ? "rounded-2xl rounded-br-md bg-[color:var(--color-gold)] px-4 py-3 text-sm leading-relaxed text-[color:var(--color-bg)]"
              : "text-[15px] font-normal leading-relaxed text-[color:var(--color-ink)]"
          }
        >
          {message.content}
          {message.streaming && (
            <span className="stylist-stream-cursor ml-1 inline-block h-4 w-1 translate-y-0.5 rounded-full bg-[color:var(--color-gold)]" />
          )}
        </div>
        {showExtras && showPhotos && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="no-scrollbar mt-3 flex gap-3 overflow-x-auto pb-1"
          >
            {displayItems.map((item) => (
              <div
                key={item.id}
                className="w-24 shrink-0 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] p-2 transition-transform duration-200 hover:-translate-y-0.5"
              >
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="h-20 w-20 rounded-xl object-cover"
                />
                <p className="mt-2 truncate text-xs text-[color:var(--color-ink-muted)]">
                  {item.name}
                </p>
                <span className="mt-1 inline-flex rounded-full border border-[color:var(--color-border)] px-2 py-0.5 text-[10px] text-[color:var(--color-ink-dim)]">
                  {item.category}
                </span>
              </div>
            ))}
          </motion.div>
        )}
        {canSave && (
          <button
            type="button"
            onClick={() => onSaveOutfit(uniqueItems, message.content, message.id)}
            disabled={saved}
            className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[color:var(--color-gold)]/30 px-3 py-1 text-xs text-[color:var(--color-gold)] transition-all duration-200 hover:bg-[color:var(--color-gold)] hover:text-[color:var(--color-bg)] disabled:cursor-default disabled:opacity-80 disabled:hover:bg-transparent disabled:hover:text-[color:var(--color-gold)]"
          >
            {saved ? (
              <span className="text-[color:var(--color-gold)]">✓</span>
            ) : (
              <Bookmark className="h-3.5 w-3.5" />
            )}
            {saved ? "Saved" : "Save this look"}
          </button>
        )}
        <p className="mt-1 text-[10px] text-[color:var(--color-ink-dim)] opacity-0 transition-opacity group-hover:opacity-100">
          {formatTime(message.timestamp)}
        </p>
      </div>
    </motion.div>
  );
}

function SuggestionCards({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void;
  disabled: boolean;
}) {
  const cards = [
    { icon: "👔", title: "Today's outfit", subtitle: "What should I wear right now?" },
    { icon: "💼", title: "Work look", subtitle: "Put together a professional outfit" },
    { icon: "🎉", title: "Special occasion", subtitle: "Something for an event or dinner" },
    { icon: "🛍", title: "What to buy", subtitle: "What's missing from my wardrobe?" },
  ];

  return (
    <div className="mb-3 grid gap-3 sm:grid-cols-2">
      {cards.map((card) => (
        <button
          key={card.title}
          type="button"
          onClick={() => onSend(card.subtitle)}
          disabled={disabled}
          className="rounded-2xl border border-[color:var(--color-border-soft)] p-4 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-[color:var(--color-gold)]/40 disabled:opacity-50"
        >
          <span className="block text-2xl">{card.icon}</span>
          <span className="mt-2 block text-sm font-medium text-[color:var(--color-ink)]">
            {card.title}
          </span>
          <span className="mt-1 block text-xs text-[color:var(--color-ink-muted)]">
            {card.subtitle}
          </span>
        </button>
      ))}
    </div>
  );
}

function StyleProfileCard({
  items,
  outfitsCount,
  stats,
}: {
  items: ClothingItem[];
  outfitsCount: number;
  stats: WardrobeStats;
}) {
  return (
    <SidebarCard title="Your Style Profile">
      {items.length === 0 ? (
        <p className="text-sm text-[color:var(--color-ink-muted)]">Add items to build your profile</p>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {stats.topColors.map((color) => (
              <span
                key={color}
                className="rounded-full border border-[color:var(--color-border)] px-3 py-1 text-xs text-[color:var(--color-ink-muted)]"
              >
                {color}
              </span>
            ))}
          </div>
          <p className="text-sm text-[color:var(--color-ink-muted)]">
            {items.length} pieces · {outfitsCount} saved looks
          </p>
          {stats.favoriteItems.length > 0 && (
            <p className="text-sm text-[color:var(--color-gold)]">
              ♥ {stats.favoriteItems.length} favourites
            </p>
          )}
        </div>
      )}
    </SidebarCard>
  );
}

function WardrobeSnapshot({ stats }: { stats: WardrobeStats }) {
  const rows = [
    { label: "Tops", count: stats.tops.length },
    { label: "Bottoms", count: stats.bottoms.length },
    { label: "Shoes", count: stats.shoes.length },
    { label: "Accessories", count: stats.accessories.length },
  ];

  return (
    <SidebarCard title="Wardrobe">
      <div className="divide-y divide-[color:var(--color-border-soft)]">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
            <span className={row.count === 0 ? "text-sm text-[color:var(--color-gold-deep)]" : "text-sm text-[color:var(--color-ink-muted)]"}>
              {row.label}
              {row.count === 0 && <span className="ml-1">!</span>}
            </span>
            <span className="text-sm text-[color:var(--color-ink)]">{row.count}</span>
          </div>
        ))}
      </div>
    </SidebarCard>
  );
}

function TipCard({ stats }: { stats: WardrobeStats }) {
  const hasNeutral = stats.topColors.some((color) => isNeutral(color));
  const tip =
    stats.shoes.length === 0
      ? "Add footwear to your wardrobe for complete outfit suggestions"
      : stats.bottoms.length < 2
        ? "More bottoms = more combinations. Even one neutral bottom doubles your options."
        : !hasNeutral
          ? "Your wardrobe lacks neutrals. Adding black or white unlocks everything."
          : `Mention a specific piece for the most tailored advice — try 'what matches my ${stats.recentItem?.name}?'`;

  return (
    <SidebarCard title="Tip">
      <p className="text-sm leading-relaxed text-[color:var(--color-ink-muted)]">{tip}</p>
    </SidebarCard>
  );
}

function SidebarCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[color:var(--color-border-soft)] bg-[color:var(--color-surface)] p-5">
      <p className="mb-4 text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-gold)]">
        {title}
      </p>
      {children}
    </div>
  );
}

function getWardrobeStats(items: ClothingItem[]): WardrobeStats {
  const tops = items.filter((item) => item.category === "tops");
  const bottoms = items.filter((item) => item.category === "bottoms");
  const shoes = items.filter((item) => item.category === "shoes");
  const accessories = items.filter((item) => item.category === "accessories");
  const recentItem = [...items].sort((a, b) => b.createdAt - a.createdAt)[0];
  const favoriteItems = items.filter((item) => item.isFavorite);
  const topColors = Object.entries(
    items.reduce((acc, item) => {
      acc[item.color] = (acc[item.color] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([color]) => color);

  return { tops, bottoms, shoes, accessories, recentItem, favoriteItems, topColors };
}

function createOpeningMessage(
  firstName: string,
  items: ClothingItem[],
  recentItem: ClothingItem | undefined,
  topColors: string[]
): ChatMessage {
  const hour = new Date().getHours();
  const timeGreet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const content =
    items.length === 0
      ? `${timeGreet}, ${firstName}. I'm your personal stylist. Start by adding some clothes to your wardrobe and I'll help you put together looks you'll love.`
      : items.length < 5
        ? `${timeGreet}, ${firstName}. You have ${items.length} pieces so far — a good start. Tell me what you need today and I'll work with what you have.`
        : `${timeGreet}, ${firstName}. I see you recently added a ${recentItem?.name}. Your wardrobe has ${items.length} pieces across ${topColors.join(", ")} tones. What's the occasion today?`;

  return {
    id: uid("m_"),
    role: "assistant",
    content,
    timestamp: Date.now(),
  };
}

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function isNeutral(color: string) {
  const neutrals = ["black", "white", "navy", "grey", "gray", "beige", "cream", "ivory", "tan", "camel", "brown", "charcoal"];
  return neutrals.some((neutral) => color.toLowerCase().includes(neutral));
}
