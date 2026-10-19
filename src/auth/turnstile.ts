export class TurnstileVerifier {
  async verify(token: string, remoteIp: string) {
    const secret = process.env.TURNSTILE_SECRET_KEY ?? "";
    if (!secret || !token) return false;
    const body = new URLSearchParams({ secret, response: token });
    if (remoteIp) body.set("remoteip", remoteIp);
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const json = (await response.json()) as { success?: boolean };
    return json.success === true;
  }
}

export const turnstile = new TurnstileVerifier();
