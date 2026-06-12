export type AccountStatus = "pending" | "approved" | "rejected" | "banned";
export type Gender = "Male" | "Female" | "Other";

export interface PromptAnswer {
  id: string;
  question: string;
  answer: string;
}

export interface Profile {
  user_id: string;
  name: string;
  email?: string;
  status?: AccountStatus;
  is_admin?: boolean;
  age: number;
  gender: Gender;
  department: string;
  year: number;
  photos: string[];
  prompts: PromptAnswer[];
  bio: string;
  interests: string[];
  last_active: string;
}

export interface Like {
  id: string;
  sender_id?: string;
  receiver_id?: string;
  item_id?: string;
  item_type?: "photo" | "prompt";
  message?: string;
  created_at: string;
  // joined fields
  user_id: string;
  name: string;
  age: number;
  photos: string[];
  prompts: PromptAnswer[];
}

export interface Match {
  match_id: string;
  matched_at: string;
  partner_id: string;
  name: string;
  age: number;
  gender: Gender;
  department: string;
  photos: string[];
  last_message?: string;
  last_message_at?: string;
}

export interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  text: string;
  image_url?: string;
  is_read: boolean;
  created_at: string;
}

export const DEPARTMENTS = [
  "Computer Science (CSE)",
  "Electronics & Comm (ECE)",
  "Information Tech (IT)",
  "Electrical & Electronics (EEE)",
  "Mechanical Eng (ME)",
  "Civil Eng (CIVIL)",
  "AI & Data Science (AI&DS)",
  "Cyber Security (CS)",
] as const;

export const PROMPT_QUESTIONS = [
  "My most controversial opinion is…",
  "The most spontaneous thing I've done…",
  "My love language is…",
  "You'll know I like you if…",
  "I get way too excited about…",
  "My simple pleasures are…",
  "I'm looking for…",
  "A green flag I always notice…",
] as const;

export const INTERESTS = [
  "Coding", "Music", "Gaming", "Sports", "Reading",
  "Photography", "Cooking", "Travel", "Fitness", "Art",
  "Movies", "Anime", "Chess", "Dance", "Hiking",
];
