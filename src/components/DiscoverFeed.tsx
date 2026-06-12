import { useState, useEffect, useCallback } from "react";
import { Heart, SlidersHorizontal, X, MessageSquare, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useApi } from "../lib/api";
import type { Profile, PromptAnswer } from "../types";
import { DEPARTMENTS } from "../types";

interface Props {
  profile: Profile;
}

interface LikeTarget {
  profile: Profile;
  itemId: string;
  itemType: "photo" | "prompt";
  label: string;
}

export default function DiscoverFeed({ profile }: Props) {
  const api = useApi();
  const [cards, setCards] = useState<Profile[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [photoIdx, setPhotoIdx] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [likeTarget, setLikeTarget] = useState<LikeTarget | null>(null);
  const [likeComment, setLikeComment] = useState("");
  const [sending, setSending] = useState(false);
  const [matchBanner, setMatchBanner] = useState<Profile | null>(null);

  const [filters, setFilters] = useState({
    year: "",
    dept: "All",
    minAge: "",
    maxAge: "",
  });

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params: Record<string, string> = {};
      if (filters.year)   params.year   = filters.year;
      if (filters.dept && filters.dept !== "All") params.dept = filters.dept;
      if (filters.minAge) params.minAge = filters.minAge;
      if (filters.maxAge) params.maxAge = filters.maxAge;

      const { profiles } = await api.feed(params);
      setCards(profiles);
      setIndex(0);
      setPhotoIdx(0);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadFeed(); }, [loadFeed]);

  const current = cards[index];

  async function sendLike() {
    if (!likeTarget) return;
    setSending(true);
    try {
      const result = await api.like({
        receiverId: likeTarget.profile.user_id,
        itemId: likeTarget.itemId,
        itemType: likeTarget.itemType,
        message: likeComment.trim() || undefined,
      });
      setLikeTarget(null);
      setLikeComment("");
      if (result.isMatch) {
        setMatchBanner(likeTarget.profile);
        setTimeout(() => setMatchBanner(null), 4000);
      }
      advance();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  }

  function advance() {
    setIndex((i) => i + 1);
    setPhotoIdx(0);
  }

  if (profile.status !== "approved") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center text-2xl">⏳</div>
        <h3 className="font-semibold text-zinc-900">Pending approval</h3>
        <p className="text-sm text-zinc-500 leading-relaxed max-w-xs">
          An admin will review your profile and college ID. You'll be able to discover people once approved.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 shrink-0">
        <h1 className="font-serif text-xl font-bold text-zinc-900">
          <span className="italic text-purple-600">cvr</span>.connect
        </h1>
        <button
          onClick={() => setShowFilters(true)}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 transition-colors"
        >
          <SlidersHorizontal className="w-4 h-4 text-zinc-600" />
        </button>
      </div>

      {/* Card area */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm text-red-500">{error}</p>
            <button onClick={loadFeed} className={btnSecondary}>Retry</button>
          </div>
        ) : !current ? (
          <div className="h-full flex flex-col items-center justify-center gap-4 text-center p-6">
            <div className="text-4xl">💫</div>
            <h3 className="font-semibold text-zinc-900">You've seen everyone!</h3>
            <p className="text-sm text-zinc-500">Check back later for new people, or update your filters.</p>
            <button onClick={loadFeed} className={btnPrimary}>Refresh feed</button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Photo carousel */}
            <div className="relative rounded-3xl overflow-hidden bg-zinc-100 aspect-[3/4]">
              {current.photos.length > 0 ? (
                <img
                  src={current.photos[photoIdx]}
                  className="w-full h-full object-cover"
                  alt={current.name}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-300 text-6xl">👤</div>
              )}

              {/* Photo nav */}
              {current.photos.length > 1 && (
                <>
                  <div className="absolute top-3 left-3 right-3 flex gap-1">
                    {current.photos.map((_, i) => (
                      <div key={i} className={`flex-1 h-0.5 rounded-full ${i <= photoIdx ? "bg-white" : "bg-white/40"}`} />
                    ))}
                  </div>
                  {photoIdx > 0 && (
                    <button onClick={() => setPhotoIdx((p) => p - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/25 rounded-full flex items-center justify-center">
                      <ChevronLeft className="w-4 h-4 text-white" />
                    </button>
                  )}
                  {photoIdx < current.photos.length - 1 && (
                    <button onClick={() => setPhotoIdx((p) => p + 1)} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/25 rounded-full flex items-center justify-center">
                      <ChevronRight className="w-4 h-4 text-white" />
                    </button>
                  )}
                </>
              )}

              {/* Name overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-white font-bold text-xl">{current.name}, {current.age}</p>
                    <p className="text-white/80 text-sm">{current.department} · Year {current.year}</p>
                  </div>
                  <button
                    onClick={() => setLikeTarget({
                      profile: current,
                      itemId: current.photos[photoIdx] || "photo",
                      itemType: "photo",
                      label: "their photo",
                    })}
                    className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
                  >
                    <Heart className="w-5 h-5 text-pink-500" />
                  </button>
                </div>
              </div>
            </div>

            {/* Bio */}
            {current.bio && (
              <div className="bg-zinc-50 rounded-2xl px-4 py-3 text-sm text-zinc-700 leading-relaxed border border-zinc-100">
                {current.bio}
              </div>
            )}

            {/* Interests */}
            {current.interests.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {current.interests.map((tag) => (
                  <span key={tag} className="px-3 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded-full border border-purple-100">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Prompts */}
            {(current.prompts as PromptAnswer[]).map((p) => (
              <div key={p.id} className="bg-white rounded-2xl border border-zinc-100 p-4 relative group">
                <p className="text-xs text-zinc-400 font-medium mb-1">{p.question}</p>
                <p className="text-zinc-800 text-sm leading-relaxed">{p.answer}</p>
                <button
                  onClick={() => setLikeTarget({
                    profile: current,
                    itemId: p.id,
                    itemType: "prompt",
                    label: `"${p.question}"`,
                  })}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-pink-50"
                >
                  <Heart className="w-4 h-4 text-pink-400" />
                </button>
              </div>
            ))}

            {/* Skip */}
            <button onClick={advance} className={btnSecondary + " w-full"}>
              Skip
            </button>
          </div>
        )}
      </div>

      {/* Like modal */}
      {likeTarget && (
        <div className="absolute inset-0 bg-black/40 flex items-end z-50" onClick={() => setLikeTarget(null)}>
          <div
            className="bg-white w-full rounded-t-3xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              {likeTarget.profile.photos[0] && (
                <img src={likeTarget.profile.photos[0]} className="w-12 h-12 rounded-2xl object-cover" />
              )}
              <div>
                <p className="font-semibold text-zinc-900">Liking {likeTarget.profile.name}</p>
                <p className="text-xs text-zinc-500">on {likeTarget.label}</p>
              </div>
            </div>
            <div className="relative">
              <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-zinc-400" />
              <textarea
                value={likeComment}
                onChange={(e) => setLikeComment(e.target.value)}
                placeholder="Add a comment (optional)…"
                rows={3}
                maxLength={200}
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
            <button
              onClick={sendLike}
              disabled={sending}
              className={btnPrimary + " w-full"}
            >
              {sending
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><Heart className="w-4 h-4 fill-white" /> Send like</>
              }
            </button>
          </div>
        </div>
      )}

      {/* Match banner */}
      {matchBanner && (
        <div className="absolute inset-0 bg-purple-600/95 flex flex-col items-center justify-center z-50 p-8 text-white text-center">
          <Sparkles className="w-12 h-12 mb-4 animate-pulse" />
          <h2 className="text-2xl font-bold font-serif">It's a match!</h2>
          <p className="mt-2 text-purple-200">You and {matchBanner.name} liked each other</p>
          <button
            onClick={() => setMatchBanner(null)}
            className="mt-8 px-6 py-3 bg-white text-purple-600 rounded-2xl font-semibold text-sm"
          >
            Keep discovering
          </button>
        </div>
      )}

      {/* Filter panel */}
      {showFilters && (
        <div className="absolute inset-0 bg-black/40 flex items-end z-50" onClick={() => setShowFilters(false)}>
          <div className="bg-white w-full rounded-t-3xl p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-zinc-900">Filters</h3>
              <button onClick={() => setShowFilters(false)}><X className="w-5 h-5 text-zinc-400" /></button>
            </div>

            <div>
              <label className={filterLabel}>Year</label>
              <select className={select} value={filters.year} onChange={(e) => setFilters({ ...filters, year: e.target.value })}>
                <option value="">Any year</option>
                {[1, 2, 3, 4].map((y) => <option key={y} value={y}>Year {y}</option>)}
              </select>
            </div>

            <div>
              <label className={filterLabel}>Department</label>
              <select className={select} value={filters.dept} onChange={(e) => setFilters({ ...filters, dept: e.target.value })}>
                <option value="All">All departments</option>
                {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={filterLabel}>Min age</label>
                <input className={select} type="number" min={18} max={28} placeholder="18" value={filters.minAge} onChange={(e) => setFilters({ ...filters, minAge: e.target.value })} />
              </div>
              <div>
                <label className={filterLabel}>Max age</label>
                <input className={select} type="number" min={18} max={28} placeholder="26" value={filters.maxAge} onChange={(e) => setFilters({ ...filters, maxAge: e.target.value })} />
              </div>
            </div>

            <button
              onClick={() => { setShowFilters(false); loadFeed(); }}
              className={btnPrimary + " w-full"}
            >
              Apply filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const btnPrimary = "flex items-center justify-center gap-2 py-3 px-5 bg-purple-600 text-white rounded-2xl text-sm font-semibold hover:bg-purple-700 transition-colors disabled:bg-purple-300";
const btnSecondary = "flex items-center justify-center py-3 px-5 bg-zinc-100 text-zinc-700 rounded-2xl text-sm font-semibold hover:bg-zinc-200 transition-colors";
const filterLabel = "block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5";
const select = "w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400";
