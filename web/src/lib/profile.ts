import type { CurrentUser } from "./api";

export const PROFILE_KEY = "wire.profile";

export type ProfileDraft = {
  name: string;
  bioZh: string;
  bioEn: string;
  avatar: string;
};

export function defaultProfile(): ProfileDraft {
  return {
    name: "阿木",
    bioZh: "美股与港股混合账户。",
    bioEn: "Mixed US and HK account.",
    avatar: "",
  };
}

export function readProfile(): ProfileDraft {
  const fallback = defaultProfile();
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<ProfileDraft>;
    return {
      name: parsed.name?.trim() || fallback.name,
      bioZh: parsed.bioZh?.trim() || fallback.bioZh,
      bioEn: parsed.bioEn?.trim() || fallback.bioEn,
      avatar: parsed.avatar ?? "",
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

export function applyProfile() {
  if (document.documentElement.getAttribute("data-auth") !== "in") return;
  const profile = readProfile();
  const locale = document.documentElement.getAttribute("data-locale") === "en" ? "en" : "zh";
  const bio = locale === "en" ? profile.bioEn : profile.bioZh;
  const letter = [...profile.name][0] ?? "阿";

  for (const el of document.querySelectorAll<HTMLElement>("[data-me-name]")) {
    el.textContent = profile.name;
  }
  for (const el of document.querySelectorAll<HTMLElement>("[data-me-bio]")) {
    el.dataset.zh = profile.bioZh;
    el.dataset.en = profile.bioEn;
    el.textContent = bio;
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
  for (const el of document.querySelectorAll<HTMLElement>("[data-me-row]")) {
    el.dataset.name = `${profile.name} demo ${profile.bioZh} ${profile.bioEn}`;
  }
}

export function applyUser(user: CurrentUser) {
  const current = readProfile();
  writeProfile({
    name: user.name,
    bioZh: user.bioZh,
    bioEn: user.bioEn,
    avatar: current.avatar,
  });
  document.documentElement.setAttribute("data-auth", "in");
  document.documentElement.setAttribute("data-publish", user.publishStatus);
  for (const el of document.querySelectorAll<HTMLElement>("[data-me-handle]")) {
    el.textContent = `@${user.handle}`;
  }
  applyProfile();
}
