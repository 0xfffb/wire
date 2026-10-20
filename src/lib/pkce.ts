function randomBase64Url(bytes: number) {
  const raw = crypto.getRandomValues(new Uint8Array(bytes));
  let bin = "";
  for (const byte of raw) bin += String.fromCharCode(byte);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256Base64Url(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  const raw = new Uint8Array(digest);
  let bin = "";
  for (const byte of raw) bin += String.fromCharCode(byte);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export { randomBase64Url, sha256Base64Url };
