function toHex(bytes: Uint8Array) {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string) {
  if (hex.length % 2 !== 0) return null;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    const value = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(value)) return null;
    out[i] = value;
  }
  return out;
}

async function aesKey(secret: string) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", hash, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function encryptSecret(plain: string, secret: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await aesKey(secret);
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain));
  return `v1$${toHex(iv)}$${toHex(new Uint8Array(cipher))}`;
}

async function decryptSecret(stored: string, secret: string) {
  const [version, ivHex, dataHex] = stored.split("$");
  if (version !== "v1" || !ivHex || !dataHex) throw new Error("bad_secret");
  const iv = fromHex(ivHex);
  const data = fromHex(dataHex);
  if (!iv || !data) throw new Error("bad_secret");
  const key = await aesKey(secret);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, data as BufferSource);
  return new TextDecoder().decode(plain);
}

export { decryptSecret, encryptSecret };
