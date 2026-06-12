import { useState, useRef } from "react";
import { useClerk } from "@clerk/clerk-react";
import { Camera, Check, LogOut, Trash2, Shield, ChevronRight, X } from "lucide-react";
import { useApi } from "../lib/api";
import type { Profile, PromptAnswer } from "../types";
import { DEPARTMENTS, PROMPT_QUESTIONS, INTERESTS } from "../types";

interface Props {
  profile: Profile;
  onProfileUpdate: (p: Profile) => void;
  onAdminClick?: () => void;
}

export default function ProfileView({ profile, onProfileUpdate, onAdminClick }: Props) {
  const { signOut } = useClerk();
  const api = useApi();
  const fileRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [form, setForm] = useState({
    name: profile.name,
    age: String(profile.age),
    gender: profile.gender,
    department: profile.department,
    year: String(profile.year),
    bio: profile.bio,
    interests: [...profile.interests],
    photos: [...profile.photos],
    prompts: [...(profile.prompts as PromptAnswer[])],
  });

  function set<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: val }));
    setError("");
  }

  function toggleInterest(tag: string) {
    set(
      "interests",
      form.interests.includes(tag)
        ? form.interests.filter((i) => i !== tag)
        : [...form.interests, tag]
    );
  }

  async function addPhoto(file: File) {
    if (!file.type.startsWith("image/")) return setError("Images only.");
    if (file.size > 5 * 1024 * 1024) return setError("Max 5 MB per image.");
    const b64 = await new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
    set("photos", [...form.photos, b64]);
  }

  function updatePrompt(idx: number, key: keyof PromptAnswer, val: string) {
    const updated = form.prompts.map((p, i) =>
      i === idx ? { ...p, [key]: val } : p
    );
    set("prompts", updated);
  }

  function addPrompt() {
    if (form.prompts.length >= 3) return;
    set("prompts", [
      ...form.prompts,
      { id: `p${Date.now()}`, question: PROMPT_QUESTIONS[0], answer: "" },
    ]);
  }

  function removePrompt(idx: number) {
    set("prompts", form.prompts.filter((_, i) => i !== idx));
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      await api.updateMe({
        name: form.name.trim(),
        age: Number(form.age),
        gender: form.gender,
        department: form.department,
        year: Number(form.year),
        bio: form.bio.trim(),
        interests: form.interests,
        photos: form.photos,
        prompts: form.prompts.filter((p) => p.answer.trim()),
      });
      onProfileUpdate({ ...profile, ...form, age: Number(form.age), year: Number(form.year) });
      setEditing(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteAccount() {
    try {
      await api.deleteMe();
      await signOut();
    } catch (e: any) {
      setError(e.message);
    }
  }

  // ─── View mode ─────────────────────────────────────────────────────────────
  if (!editing) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-5 py-4 shrink-0 border-b border-zinc-100">
          <h2 className="font-semibold text-lg text-zinc-900">Your profile</h2>
          <button
            onClick={() => setEditing(true)}
            className="px-4 py-1.5 bg-zinc-100 text-zinc-700 rounded-full text-xs font-semibold hover:bg-zinc-200 transition-colors"
          >
            Edit
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Status badge */}
          {profile.status !== "approved" && (
            <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-medium border ${
              profile.status === "pending"
                ? "bg-amber-50 border-amber-200 text-amber-700"
                : "bg-red-50 border-red-200 text-red-700"
            }`}>
              <span>{profile.status === "pending" ? "⏳" : "🚫"}</span>
              <span className="capitalize">Account {profile.status}</span>
            </div>
          )}

          {/* Photos */}
          <div className="grid grid-cols-2 gap-2">
            {profile.photos.map((src, i) => (
              <img
                key={i}
                src={src}
                className={`rounded-2xl object-cover w-full ${i === 0 ? "col-span-2 aspect-video" : "aspect-square"}`}
                alt=""
              />
            ))}
            {profile.photos.length === 0 && (
              <div className="col-span-2 aspect-video bg-zinc-100 rounded-2xl flex items-center justify-center text-4xl">
                👤
              </div>
            )}
          </div>

          {/* Name + details */}
          <div>
            <h3 className="text-xl font-bold text-zinc-900">{profile.name}, {profile.age}</h3>
            <p className="text-sm text-zinc-500 mt-0.5">{profile.department} · Year {profile.year}</p>
          </div>

          {profile.bio && (
            <p className="text-sm text-zinc-700 leading-relaxed bg-zinc-50 rounded-2xl px-4 py-3 border border-zinc-100">
              {profile.bio}
            </p>
          )}

          {profile.interests.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {profile.interests.map((tag) => (
                <span key={tag} className="px-3 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded-full border border-purple-100">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {(profile.prompts as PromptAnswer[]).map((p) => (
            <div key={p.id} className="bg-white rounded-2xl border border-zinc-100 p-4">
              <p className="text-xs text-zinc-400 font-medium mb-1">{p.question}</p>
              <p className="text-sm text-zinc-800">{p.answer}</p>
            </div>
          ))}

          {/* Settings */}
          <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
            {onAdminClick && (
              <button
                onClick={onAdminClick}
                className="flex items-center gap-3 w-full px-4 py-3.5 hover:bg-zinc-50 transition-colors border-b border-zinc-50"
              >
                <Shield className="w-4 h-4 text-zinc-500" />
                <span className="flex-1 text-sm text-zinc-700 text-left font-medium">Admin panel</span>
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              </button>
            )}
            <button
              onClick={() => signOut()}
              className="flex items-center gap-3 w-full px-4 py-3.5 hover:bg-zinc-50 transition-colors border-b border-zinc-50"
            >
              <LogOut className="w-4 h-4 text-zinc-500" />
              <span className="flex-1 text-sm text-zinc-700 text-left font-medium">Sign out</span>
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-3 w-full px-4 py-3.5 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4 text-red-400" />
              <span className="flex-1 text-sm text-red-600 text-left font-medium">Delete account</span>
            </button>
          </div>
        </div>

        {/* Delete confirm modal */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-50 p-6">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-4">
              <h3 className="font-semibold text-zinc-900">Delete your account?</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">
                This will permanently delete your profile, all matches, and messages. This cannot be undone.
              </p>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2.5 bg-zinc-100 text-zinc-700 rounded-xl text-sm font-semibold hover:bg-zinc-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteAccount}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Edit mode ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 shrink-0 border-b border-zinc-100">
        <button
          onClick={() => setEditing(false)}
          className="text-sm text-zinc-500 hover:text-zinc-700 font-medium"
        >
          Cancel
        </button>
        <h2 className="font-semibold text-zinc-900">Edit profile</h2>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-purple-600 text-white rounded-full text-xs font-semibold hover:bg-purple-700 disabled:bg-purple-300 transition-colors"
        >
          {saving ? (
            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <><Check className="w-3 h-3" /> Save</>
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {error && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-2">{error}</p>
        )}

        {/* Photos */}
        <section>
          <label className={sectionLabel}>Photos</label>
          <div className="grid grid-cols-3 gap-2">
            {form.photos.map((src, i) => (
              <div key={i} className="relative aspect-square">
                <img src={src} className="w-full h-full object-cover rounded-2xl" />
                <button
                  onClick={() => set("photos", form.photos.filter((_, j) => j !== i))}
                  className="absolute top-1 right-1 w-6 h-6 bg-black/50 text-white rounded-full flex items-center justify-center text-xs hover:bg-black/70"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {form.photos.length < 6 && (
              <button
                onClick={() => fileRef.current?.click()}
                className="aspect-square rounded-2xl border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center gap-1 hover:border-purple-400 hover:bg-purple-50 transition-colors text-zinc-400 hover:text-purple-600"
              >
                <Camera className="w-5 h-5" />
                <span className="text-[10px] font-medium">Add</span>
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && addPhoto(e.target.files[0])}
          />
        </section>

        {/* Basics */}
        <section className="space-y-3">
          <label className={sectionLabel}>Basics</label>
          <input className={inp} placeholder="Name" value={form.name} onChange={(e) => set("name", e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <input className={inp} type="number" placeholder="Age" min={18} max={28} value={form.age} onChange={(e) => set("age", e.target.value)} />
            <select className={inp} value={form.year} onChange={(e) => set("year", e.target.value)}>
              {[1, 2, 3, 4].map((y) => <option key={y} value={y}>Year {y}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(["Male", "Female", "Other"] as const).map((g) => (
              <button
                key={g}
                onClick={() => set("gender", g)}
                className={`py-2 rounded-xl text-xs font-medium border transition-colors ${
                  form.gender === g ? "bg-purple-600 text-white border-purple-600" : "bg-white text-zinc-600 border-zinc-200 hover:border-purple-300"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
          <select className={inp} value={form.department} onChange={(e) => set("department", e.target.value)}>
            {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
          </select>
        </section>

        {/* Bio */}
        <section>
          <label className={sectionLabel}>Bio</label>
          <textarea
            className={inp + " resize-none"}
            rows={3}
            maxLength={160}
            placeholder="Tell people about yourself…"
            value={form.bio}
            onChange={(e) => set("bio", e.target.value)}
          />
        </section>

        {/* Interests */}
        <section>
          <label className={sectionLabel}>Interests</label>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleInterest(tag)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  form.interests.includes(tag)
                    ? "bg-purple-600 text-white border-purple-600"
                    : "bg-white text-zinc-600 border-zinc-200 hover:border-purple-300"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </section>

        {/* Prompts */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <label className={sectionLabel}>Prompts</label>
            {form.prompts.length < 3 && (
              <button onClick={addPrompt} className="text-xs text-purple-600 font-semibold hover:text-purple-700">
                + Add
              </button>
            )}
          </div>
          {form.prompts.map((p, i) => (
            <div key={p.id} className="bg-zinc-50 rounded-2xl p-3 border border-zinc-100 space-y-2">
              <div className="flex items-start gap-2">
                <select
                  className={inp + " flex-1 text-xs"}
                  value={p.question}
                  onChange={(e) => updatePrompt(i, "question", e.target.value)}
                >
                  {PROMPT_QUESTIONS.map((q) => <option key={q}>{q}</option>)}
                </select>
                <button onClick={() => removePrompt(i)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-zinc-200 transition-colors shrink-0 mt-1">
                  <X className="w-3.5 h-3.5 text-zinc-500" />
                </button>
              </div>
              <textarea
                className={inp + " resize-none text-xs"}
                rows={2}
                maxLength={200}
                placeholder="Your answer…"
                value={p.answer}
                onChange={(e) => updatePrompt(i, "answer", e.target.value)}
              />
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

const sectionLabel = "block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2";
const inp = "w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-shadow";
