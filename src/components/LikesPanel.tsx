import { useState, useEffect } from "react";
import { Heart, X, MessageSquare } from "lucide-react";
import { useApi } from "../lib/api";
import type { Like, PromptAnswer } from "../types";

interface Props {
  currentUserId: string;
}

export default function LikesPanel({ currentUserId }: Props) {
  const api = useApi();
  const [likes, setLikes] = useState<Like[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);

  useEffect(() => {
    api.received()
      .then(({ likes }) => setLikes(likes))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function resolve(likeId: string, action: "accept" | "reject") {
    setResolving(likeId);
    try {
      const result = await api.resolve(likeId, action);
      setLikes((prev) => prev.filter((l) => l.id !== likeId));
      if (result.matched) {
        // Brief match toast
        setTimeout(() => {}, 0);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setResolving(null);
    }
  }

  const likedPrompt = (like: Like) => {
    if (like.item_type !== "prompt" || !like.item_id) return null;
    const prompts = like.prompts as PromptAnswer[];
    return prompts?.find((p) => p.id === like.item_id) ?? null;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 shrink-0 border-b border-zinc-100">
        <h2 className="font-semibold text-lg text-zinc-900">People who liked you</h2>
        {!loading && !error && (
          <p className="text-xs text-zinc-400 mt-0.5">
            {likes.length === 0 ? "No likes yet" : `${likes.length} like${likes.length !== 1 ? "s" : ""}`}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center p-6 text-center">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        ) : likes.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 p-8 text-center">
            <div className="w-16 h-16 bg-pink-50 rounded-full flex items-center justify-center text-2xl">💌</div>
            <h3 className="font-semibold text-zinc-900">No likes yet</h3>
            <p className="text-sm text-zinc-500 max-w-xs">
              When someone likes your profile, they'll show up here. Keep your profile looking great!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-50">
            {likes.map((like) => {
              const prompt = likedPrompt(like);
              const isOpen = expanded === like.id;

              return (
                <div key={like.id} className="px-4 py-4">
                  {/* Card top */}
                  <div
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => setExpanded(isOpen ? null : like.id)}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      {like.photos?.[0] ? (
                        <img
                          src={like.photos[0]}
                          className="w-14 h-14 rounded-2xl object-cover"
                          alt={like.name}
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center text-2xl">
                          👤
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-pink-500 rounded-full flex items-center justify-center">
                        <Heart className="w-2.5 h-2.5 fill-white text-white" />
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-zinc-900 text-sm">{like.name}</p>
                      <p className="text-xs text-zinc-500">
                        Age {like.age}
                        {prompt ? ` · liked your prompt` : ` · liked your photo`}
                      </p>
                    </div>

                    <span className="text-xs text-zinc-400 shrink-0">
                      {new Date(like.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                    </span>
                  </div>

                  {/* Expanded details */}
                  {isOpen && (
                    <div className="mt-3 space-y-3">
                      {/* What they liked */}
                      {prompt && (
                        <div className="bg-purple-50 rounded-2xl p-3 border border-purple-100">
                          <p className="text-xs text-purple-500 font-medium mb-1">They liked your prompt</p>
                          <p className="text-xs text-purple-400">{prompt.question}</p>
                          <p className="text-sm text-purple-900 mt-1">"{prompt.answer}"</p>
                        </div>
                      )}

                      {/* Their comment */}
                      {like.message && (
                        <div className="flex items-start gap-2 bg-zinc-50 rounded-2xl p-3 border border-zinc-100">
                          <MessageSquare className="w-3.5 h-3.5 text-zinc-400 mt-0.5 shrink-0" />
                          <p className="text-sm text-zinc-700 italic">"{like.message}"</p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => resolve(like.id, "reject")}
                          disabled={resolving === like.id}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-zinc-100 text-zinc-600 rounded-xl text-sm font-semibold hover:bg-zinc-200 transition-colors disabled:opacity-50"
                        >
                          <X className="w-4 h-4" /> Pass
                        </button>
                        <button
                          onClick={() => resolve(like.id, "accept")}
                          disabled={resolving === like.id}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50"
                        >
                          {resolving === like.id ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <><Heart className="w-4 h-4 fill-white" /> Connect</>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
