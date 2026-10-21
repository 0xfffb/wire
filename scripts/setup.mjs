import { copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const example = join(root, ".dev.vars.example");
const dest = join(root, ".dev.vars");

if (!existsSync(dest)) {
  copyFileSync(example, dest);
  console.log("已写入 .dev.vars。本地开发用里面的 TOKEN_ENC_KEY；上线请换成随机串。");
} else {
  console.log(".dev.vars 已存在，未覆盖。");
}
