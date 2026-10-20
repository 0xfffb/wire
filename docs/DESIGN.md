# Wire UI 规范

视觉标准采用存档的 Linear 应用壳规范：

[docs/references/linear-app-DESIGN.md](./references/linear-app-DESIGN.md)

来源：[tastekit Linear Product App Design Spec](https://tastekit.dev/apps/linear/app/DESIGN.md)。第三方拆解，不是 Linear 官方 DS。

**实现以 `web/src/styles/global.css` 为准。** 色阶、字重、控件高度与那份对齐；本文只写 Wire 产品层差异。

Wire 是多发布者发现产品，不是 issue tracker、行情盘或纸色账本。

## 原则

- 平台首页是发现列表，不是单人 landing。
- 密度跟 Linear：侧栏行 28px，控件 32px，列表行 36px，顶栏 48px，4px 网格。
- 字重只用 400 / 510 / 590 / 680。标题 590，不用 500/600/700。
- 靛紫 `#5e6ad2` 只用于主按钮、品牌块、焦点。链接用 `#7170ff`。
- 绿 `#27a644` / 红 `#eb5757` 只用于收益与盈亏（对应规范里的 status hue，不当 chrome）。
- 用半透明细线分层，不用大阴影。动效 100–160ms `cubic-bezier(.25,.46,.45,.94)`。
- 数字 `tabular-nums`，价格/占比/收益右对齐。
- 收益旁保留非投资建议说明。

不要做：纸色衬线账本、黑底 K 线仪表盘、营销大字报、卡片瀑布流当主列表、弹跳动画。

## 主题

`html[data-theme="dark"|"light"]` 决定已解析外观。  
`html[data-theme-pref="system"|"light"|"dark"]` 是用户选择。

| 选择 | 行为 |
| --- | --- |
| 跟随系统 | 跟 `prefers-color-scheme`，系统变化时同步 |
| 浅色 / 深色 | 锁定，不跟系统 |

默认偏好 `system`。写入 `localStorage` 键 `wire.theme`。

侧栏用**点选分段**：跟随系统 / 浅色 / 深色。不要改成下拉。

FOUC：`web/src/layouts/Base.astro` 里 inline script 在首屏前设置 `data-theme`。

### Token

深色色阶跟存档规范：`#08090a → #0f1011 → #141516 → #1c1c1f → #232326 → #28282c`。浅色是同一结构的映射（规范未采集 light）。

| 变量 | 深色 | 用途 |
| --- | --- | --- |
| `--bg` | `#08090a` | 画布 / 侧栏 |
| `--surface` | `#1c1c1f` | 面板、输入 |
| `--elev-2` | `#141516` | 行 hover |
| `--fill` | `#232326` | 导航 hover / 选中 |
| `--text` | `#f7f8f8` | 主文字 |
| `--text-2` | `#d0d6e0` | 侧栏标签 |
| `--muted` | `#8a8f98` | 次级 |
| `--faint` | `#62666d` | 说明、placeholder |
| `--line` | `#ffffff0d` | 分割 |
| `--input-border` | `#3e3e44` | 输入、次按钮 |
| `--accent` | `#5e6ad2` | 主按钮、焦点 |
| `--link` | `#7170ff` | 面包屑 / 条款 hover |
| `--up` / `--down` | `#27a644` / `#eb5757` | 盈亏 |

焦点：边 `#5e6ad2` + ring `rgba(94,106,210,.25)`。

## 字体

`"Inter Variable", Inter, "Noto Sans SC", "SF Pro Display", -apple-system, sans-serif`

中文用 Noto Sans SC（无 510 光学字重时退到 400/500）。拉丁用 400/510/590。

| 角色 | 大小 | 字重 |
| --- | --- | --- |
| 列表 / 侧栏 / 顶栏 | 13px | 510 |
| 简介 lede | 15px / 1.6 | 400 |
| 搜索、输入 | 14px | 400 |
| 主按钮 | 13px | 510 |
| 页内标题 | 20px | 590 |
| pill | 12px | 510 |

## 间距与尺寸

| 元素 | 尺寸 |
| --- | --- |
| 侧栏宽 | 224px |
| 顶栏高 | 48px |
| 侧栏行 | 28px |
| 列表行 | 36px（窄屏 44px） |
| 按钮 / 搜索 / 输入 / 语言下拉 | 32px |
| 按钮 / 输入圆角 | 8px |
| 面板圆角 | 12px |
| 行 / ghost 圆角 | 6px |
| 发布者右侧栏 | 260px |
| 断点 | 860px |

## 布局

登录以外都是应用壳：

```
[ 侧栏 224 ] [ 顶栏 48 ]
             [ 内容     ]
```

侧栏：品牌 → 发现 / 我的订阅 / 发布 / 登录 →（底部）主题点选、语言列表、免责声明、条款。

顶栏：当前页名（13px）+ 槽位（搜索或面包屑）。不要再放一套顶导航。

发现页主列表是 **issue 行**，不是卡片网格。行内：头像、名字、简介、市场 pill、今年收益、订阅数、延迟、月费。

发布者页：主栏资料 + 属性条 + 仓位表；右侧订阅面板 + 最近变动。

登录页：居中卡，无侧栏；主题和语言仍放在卡内底部。

## 控件

| 控件 | 规则 |
| --- | --- |
| `.btn` | 靛紫底白字，高 32px，圆角 8。一屏一个主操作。 |
| `.btn.ghost` | 次按钮：`--surface` + `--input-border`。 |
| `.chip` | 工具条筛选。当前 `.is-on` 用 `--fill`。 |
| `.pill` | 只读标签，12px/510，1px 边。 |
| `.search` / `.form input` | 高 32px，圆角 8。焦点靛紫边 + `rgba(94,106,210,.25)` 环。 |
| `.theme-switch` | 三项点选。当前 `.is-on`。 |
| `.pref-select` | 仅语言。选项用各语言自称（中文 / English）。 |
| `.issue` | 整行可点。hover 用 `--elev-2`（`#141516`）。 |
| `.panel` | 右侧辅助，圆角 12，细边框，不要投影。 |
| `.holdings` | 表头 `--faint` 12px/510；数字右对齐。 |
| `.props` | `标签 + 值`，底部分割线。 |

涨跌：正数 `.up`，负数 `.down`，零或「—」用默认色。

## 文案与 i18n

- 界面默认中文。语言列表选择，不要点一下切换。
- 文案键在 `web/src/lib/i18n.ts`。chrome 用 `data-i18n`；发布者简介等双语文案用 `data-zh` / `data-en`。
- 语言写入 `localStorage` 键 `wire.locale`：`zh` | `en`。
- 加语种：往 `locales` 数组加一项，并补 `messages`。
- 专有名（handle、代码）不翻译。市场键用 `us` / `hk`，展示走 i18n。

免责：仓位来自券商同步时点，不构成投资建议。侧栏常驻；窄屏可藏说明，条款链接保留。

## 页面

| 路径 | 作用 |
| --- | --- |
| `/` | 发现。筛选市场，列表选发布者。 |
| `/publishers/:handle` | 公开主页。未订阅只见占比和方向。 |
| `/app` | 我的订阅 + 发布入口。 |
| `/login` | 登录占位。同一账号可订可发。 |
| `/legal/terms` `/legal/privacy` | 条款 / 隐私。 |

假数据在 `web/src/lib/publishers.ts`，接通 API 前不要改列表结构。

## 文件

| 路径 | 职责 |
| --- | --- |
| `web/src/styles/global.css` | token 与组件样式 |
| `web/src/layouts/Base.astro` | 壳、主题引导脚本 |
| `web/src/components/Prefs.astro` | 主题点选、语言列表 |
| `web/src/lib/i18n.ts` | 文案、主题解析、偏好读写 |
| `web/src/pages/*` | 页面 |

## 检查

新页面问这几句：

1. 还是侧栏壳，还是误做成营销站？
2. 主列表是行，还是又堆了卡片？
3. 靛紫是否只出现在主操作 / 焦点 / 品牌块？
4. 绿红是否只出现在盈亏？
5. 主题仍是三项点选，语言仍是下拉？
6. 中英切换后标签、placeholder、title 是否都走 i18n？
