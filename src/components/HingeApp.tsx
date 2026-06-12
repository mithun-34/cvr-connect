import { useState } from "react";
import { Compass, Heart, MessageCircle, User } from "lucide-react";
import type { Profile } from "../types";
import DiscoverFeed from "./DiscoverFeed";
import LikesPanel from "./LikesPanel";
import ChatView from "./ChatView";
import ProfileView from "./ProfileView";

interface Props {
  profile: Profile;
  onProfileUpdate: (p: Profile) => void;
  onAdminClick?: () => void;
}

type Tab = "discover" | "likes" | "chats" | "me";

export default function HingeApp({ profile, onProfileUpdate, onAdminClick }: Props) {
  const [tab, setTab] = useState<Tab>("discover");

  return (
    <div className="min-h-screen bg-[#F9F8F6] flex flex-col items-center">
      {/* Mobile card container */}
      <div className="w-full max-w-md bg-white flex flex-col h-screen md:h-[calc(100vh-2rem)] md:my-4 md:rounded-[32px] md:border md:border-zinc-200 md:shadow-xl overflow-hidden">

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {tab === "discover" && (
            <DiscoverFeed profile={profile} />
          )}
          {tab === "likes" && (
            <LikesPanel currentUserId={profile.user_id} />
          )}
          {tab === "chats" && (
            <ChatView currentUserId={profile.user_id} />
          )}
          {tab === "me" && (
            <ProfileView
              profile={profile}
              onProfileUpdate={onProfileUpdate}
              onAdminClick={onAdminClick}
            />
          )}
        </div>

        {/* Bottom nav */}
        <nav className="shrink-0 border-t border-zinc-100 bg-white px-4 py-2 safe-area-bottom">
          <div className="flex items-center justify-around">
            {([
              { id: "discover", icon: Compass,       label: "Discover" },
              { id: "likes",    icon: Heart,          label: "Likes"    },
              { id: "chats",    icon: MessageCircle,  label: "Chats"    },
              { id: "me",       icon: User,           label: "Profile"  },
            ] as const).map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex flex-col items-center gap-0.5 py-2 px-4 rounded-2xl transition-colors ${
                  tab === id
                    ? "text-purple-600"
                    : "text-zinc-400 hover:text-zinc-600"
                }`}
              >
                <Icon className={`w-5 h-5 ${tab === id ? "fill-purple-100" : ""}`} />
                <span className="text-[10px] font-semibold">{label}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
