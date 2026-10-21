import type { Me } from "./api";

export const PROFILE_KEY = "wire.profile";
export const ADMIN_KEY = "wire.hasAdmin";

export type ProfileDraft = {
  name: string;
  bio: string;
  avatar: string;
  x: string;
  site: string;
  youtube: string;
};

export function defaultProfile(): ProfileDraft {
  return { name: "", bio: "", avatar: "", x: "", site: "", youtube: "" };
}

export function readProfile(): ProfileDraft {
  const fallback = defaultProfile();
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<ProfileDraft> & { bioZh?: string };
    return {
      name: parsed.name?.trim() || fallback.name,
      bio: parsed.bio?.trim() || parsed.bioZh?.trim() || fallback.bio,
      avatar: parsed.avatar ?? "",
      x: parsed.x ?? "",
      site: parsed.site ?? "",
      youtube: parsed.youtube ?? "",
    };
  } catch {
    return fallback;
  }
}

export function writeProfile(draft: ProfileDraft) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(draft));
  } catch {
    /* ignore */
  }
}

export function markAdmin() {
  try {
    localStorage.setItem(ADMIN_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function hasAdmin() {
  try {
    return localStorage.getItem(ADMIN_KEY) === "1";
  } catch {
    return false;
  }
}

export function applyProfile(draft?: ProfileDraft) {
  if (draft) writeProfile(draft);
  const profile = draft ?? readProfile();
  if (!draft && !profile.name && !profile.bio) return;
  const letter = [...profile.name][0] ?? "";
  document.documentElement.setAttribute("data-me-ready", "");

  for (const el of document.querySelectorAll<HTMLElement>("[data-me-name]")) {
    el.textContent = profile.name;
  }
  for (const el of document.querySelectorAll<HTMLElement>("[data-me-bio]")) {
    el.textContent = profile.bio;
  }
  for (const el of document.querySelectorAll<HTMLElement>("[data-me-avatar]")) {
    if (profile.avatar) {
      let img = el.querySelector("img");
      if (!img) {
        el.textContent = "";
        img = document.createElement("img");
        img.alt = "";
        el.append(img);
      }
      img.src = profile.avatar;
    } else {
      el.replaceChildren();
      el.textContent = letter;
    }
  }
  const socials: Record<string, string> = { x: profile.x, web: profile.site, yt: profile.youtube };
  for (const el of document.querySelectorAll<HTMLAnchorElement>("[data-social]")) {
    const href = socials[el.dataset.social ?? ""] ?? "";
    el.hidden = !href;
    if (href) el.href = href;
  }
}

export function applyUser(user: Me) {
  applyProfile({
    name: user.name,
    bio: user.bio,
    avatar: user.avatar ?? "",
    x: user.x ?? "",
    site: user.site ?? "",
    youtube: user.youtube ?? "",
  });
  markAdmin();
  document.documentElement.setAttribute("data-auth", "in");
}
