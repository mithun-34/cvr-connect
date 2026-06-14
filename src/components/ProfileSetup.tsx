import { useState, useRef } from "react";
import { useApi } from "../lib/api";
import { DEPARTMENTS, PROMPT_QUESTIONS, INTERESTS, type Profile } from "../types";
import { UploadCloud, ArrowRight, Check, Heart } from "lucide-react";

interface Props {
  email:      string;
  clerkName:  string;   // from Clerk signup — may be empty
  onComplete: (profile: Profile) => void;
}

const STEPS = ["basics", "photo", "prompts"] as const;
type Step = (typeof STEPS)[number];

async function compressImage(file: File, maxPx = 900, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const ratio  = Math.min(maxPx / img.width, maxPx / img.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width  = Math.round(img.width  * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export default function ProfileSetup({ email, clerkName, onComplete }: Props) {
  const api     = useApi();
  const fileRef = useRef<HTMLInputElement>(null);
  const idRef   = useRef<HTMLInputElement>(null);

  const [step,    setStep]    = useState<Step>("basics");
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    // Pre-fill with Clerk name if available, otherwise blank so user types their own
    name:           clerkName,
    age:            "20",
    gender:         "Female" as "Male" | "Female" | "Other",
    department:     DEPARTMENTS[0] as string,
    year:           "1",
    bio:            "",
    interests:      [] as string[],
    photoBase64:    "",
    idCardBase64:   "",
    promptQuestion: PROMPT_QUESTIONS[0] as string,
    promptAnswer:   "",
  });

  function set(key: keyof typeof form, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }));
    setError("");
  }

  async function handlePhoto(file: File) {
    if (!file.type.startsWith("image/")) return setError("Please upload an image file.");
    try {
      set("photoBase64", await compressImage(file));
    } catch {
      setError("Failed to process image. Try another file.");
    }
  }

  async function handleIdCard(file: File) {
    if (!file.type.startsWith("image/")) return setError("Please upload an image file.");
    try {
      set("idCardBase64", await compressImage(file, 1000, 0.65));
    } catch {
      setError("Failed to process image. Try another file.");
    }
  }

  function toggleInterest(tag: string) {
    set(
      "interests",
      form.interests.includes(tag)
        ? form.interests.filter((i) => i !== tag)
        : [...form.interests, tag]
    );
  }

  async function submit() {
    setError("");
    setLoading(true);
    try {
      const profile = await api.sync({
        email,
        name:       form.name.trim(),
        idCard:     form.idCardBase64 || null,
        age:        Number(form.age),
        gender:     form.gender,
        department: form.department,
        year:       Number(form.year),
        photos:     form.photoBase64 ? [form.photoBase64] : [],
        prompts:    form.promptAnswer.trim()
          ? [{ id: "p1", question: form.promptQuestion, answer: form.promptAnswer }]
          : [],
        bio:        form.bio.trim(),
        interests:  form.interests,
      });
      onComplete(profile);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const stepIdx = STEPS.indexOf(step);

  return (
    <div className="min-h-screen bg-[#F9F8F6] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">

        {/* Header */}
        <div className="p-6 border-b border-zinc-100">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-purple-600 rounded-xl flex items-center justify-center">
              <Heart className="w-4 h-4 fill-white text-white" />
            </div>
            <span className="font-serif text-lg font-bold">
              <span className="italic text-purple-600">cvr</span>.connect
            </span>
          </div>
          <h2 className="text-xl font-semibold text-zinc-900">Set up your profile</h2>
          <p className="text-sm text-zinc-500 mt-1">Step {stepIdx + 1} of {STEPS.length}</p>
          <div className="mt-3 h-1 bg-zinc-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-600 rounded-full transition-all duration-300"
              style={{ width: `${((stepIdx + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">

          {/* ── Step 1: Basics ─────────────────────────────────────────────── */}
          {step === "basics" && (
            <>
              <Field label="Your name">
                <input
                  className={inp}
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="What should people call you?"
                  autoFocus
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Age">
                  <input className={inp} type="number" min={18} max={28}
                    value={form.age} onChange={(e) => set("age", e.target.value)} />
                </Field>
                <Field label="Year">
                  <select className={inp} value={form.year}
                    onChange={(e) => set("year", e.target.value)}>
                    {[1,2,3,4].map((y) => <option key={y}>{y}</option>)}
                  </select>
                </Field>
              </div>

              <Field label="Gender">
                <div className="grid grid-cols-3 gap-2">
                  {(["Male","Female","Other"] as const).map((g) => (
                    <button key={g} onClick={() => set("gender", g)}
                      className={`py-2 rounded-xl text-sm font-medium border transition-colors ${
                        form.gender === g
                          ? "bg-purple-600 text-white border-purple-600"
                          : "bg-white text-zinc-600 border-zinc-200 hover:border-purple-300"
                      }`}>
                      {g}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Department">
                <select className={inp} value={form.department}
                  onChange={(e) => set("department", e.target.value)}>
                  {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
                </select>
              </Field>

              <Field label="Bio (optional)">
                <textarea className={inp + " resize-none"} rows={3} maxLength={160}
                  value={form.bio} onChange={(e) => set("bio", e.target.value)}
                  placeholder="Tell people a little about yourself…" />
              </Field>

              <Field label="Interests (pick any)">
                <div className="flex flex-wrap gap-2">
                  {INTERESTS.map((tag) => (
                    <button key={tag} onClick={() => toggleInterest(tag)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        form.interests.includes(tag)
                          ? "bg-purple-600 text-white border-purple-600"
                          : "bg-white text-zinc-600 border-zinc-200 hover:border-purple-300"
                      }`}>
                      {tag}
                    </button>
                  ))}
                </div>
              </Field>
            </>
          )}

          {/* ── Step 2: Photos ─────────────────────────────────────────────── */}
          {step === "photo" && (
            <>
              <Field label="Profile photo">
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => e.target.files?.[0] && handlePhoto(e.target.files[0])} />
                {form.photoBase64 ? (
                  <div className="relative">
                    <img src={form.photoBase64} className="w-full h-64 object-cover rounded-2xl" />
                    <button onClick={() => set("photoBase64", "")}
                      className="absolute top-2 right-2 w-7 h-7 bg-black/50 text-white rounded-full text-xs flex items-center justify-center hover:bg-black/70">
                      ✕
                    </button>
                  </div>
                ) : (
                  <button onClick={() => fileRef.current?.click()}
                    className="w-full h-40 border-2 border-dashed border-zinc-200 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-purple-400 hover:bg-purple-50 transition-colors text-zinc-400 hover:text-purple-600">
                    <UploadCloud className="w-8 h-8" />
                    <span className="text-sm font-medium">Upload a photo</span>
                    <span className="text-xs">Auto-compressed before upload</span>
                  </button>
                )}
              </Field>

              <Field label="College ID card (for verification)">
                <input ref={idRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleIdCard(e.target.files[0])} />
                {form.idCardBase64 ? (
                  <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                    <Check className="w-4 h-4 text-green-600 shrink-0" />
                    <span className="text-sm text-green-700 font-medium">ID card uploaded</span>
                    <button onClick={() => set("idCardBase64", "")}
                      className="ml-auto text-xs text-green-600 hover:underline">
                      Change
                    </button>
                  </div>
                ) : (
                  <button onClick={() => idRef.current?.click()}
                    className="w-full h-20 border-2 border-dashed border-zinc-200 rounded-2xl flex items-center justify-center gap-2 hover:border-purple-400 hover:bg-purple-50 transition-colors text-zinc-400 hover:text-purple-600 text-sm font-medium">
                    <UploadCloud className="w-5 h-5" />
                    Upload ID card
                  </button>
                )}
                <p className="text-xs text-zinc-400 mt-1">
                  Used only for admin verification. Never shown publicly.
                </p>
              </Field>
            </>
          )}

          {/* ── Step 3: Prompt ─────────────────────────────────────────────── */}
          {step === "prompts" && (
            <>
              <Field label="Pick a prompt">
                <select className={inp} value={form.promptQuestion}
                  onChange={(e) => set("promptQuestion", e.target.value)}>
                  {PROMPT_QUESTIONS.map((q) => <option key={q}>{q}</option>)}
                </select>
              </Field>
              <Field label="Your answer">
                <textarea className={inp + " resize-none"} rows={4} maxLength={200}
                  value={form.promptAnswer} onChange={(e) => set("promptAnswer", e.target.value)}
                  placeholder="Be yourself…" />
              </Field>
              <p className="text-xs text-zinc-400">
                Your profile will be reviewed by an admin before you can match with others.
              </p>
            </>
          )}

          {error && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          {stepIdx > 0 && (
            <button onClick={() => setStep(STEPS[stepIdx - 1])}
              className="flex-1 py-3 bg-zinc-100 text-zinc-700 rounded-xl text-sm font-semibold hover:bg-zinc-200 transition-colors">
              Back
            </button>
          )}
          {step !== "prompts" ? (
            <button
              onClick={() => {
                if (step === "basics" && !form.name.trim()) return setError("Please enter your name.");
                setStep(STEPS[stepIdx + 1]);
              }}
              className="flex-1 py-3 bg-purple-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-purple-700 transition-colors">
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={submit} disabled={loading}
              className="flex-1 py-3 bg-purple-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-purple-700 disabled:bg-purple-300 transition-colors">
              {loading
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><Check className="w-4 h-4" /> Create profile</>
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

const inp = "w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-shadow";
