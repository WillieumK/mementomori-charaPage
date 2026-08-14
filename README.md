# mementomori-charaPage
メメントモリ MementoMori 巅峰使用率统计 & 当期卡池表（在线监测）

- 页面纯前端实现，打开后由浏览器直接**在线读取** Google Sheets（卡池表 + 使用率表）并实时计算。
- 第一个表格：**巅峰使用率 · 使用率分组**（18%+ / 13%+ / 3%+，各档互不包含：18%+≥18%、13%+=13%~18%、3%+=3%~13% 且最多显示 3 行共 30 个；每行 10 个图标、可展开百分率、可选日期），数据来自「使用率表 → 动态率」分页。
- 第二、三张表：**MMT 卡池 · 最新总览** 与 **MMT 卡池 · 属性限定记录**，全部按公式直接从 `卡-0` 原始数据计算（不依赖汇总表计算值）。
- 角色图标使用 `https://mentemori.icu/assets/CHR_XXXXXX_00_s.png`（与表格里的 `=IMAGE` 一致），不生成图片。
- 数据缓存存在 **GitHub** 上：GitHub Actions 每天 4 / 10 / 16 / 22 点抓取 Google Sheets 数据到 `data/card0.json`、`data/usage.json` 并提交部署，页面优先读取（所有访客共享，不再各自请求 Google）；浏览器本地再存一份秒开缓存；“刷新数据”按钮可强制重读。
- 注意：页面需通过 http(s) 访问（GitHub Pages 或本地服务器，如 `python -m http.server`）；直接双击 `file://` 打开会因浏览器跨域限制无法读取。
- `.github/workflows/deploy.yml` 仅负责把页面部署到 GitHub Pages，不再生成内容。

- 预览图：GitHub 仓库只保留一张 `preview_screenshot.png`（随版本更新，不留档）；每个版本另存本地 `previews/260810_HHMM.png` 存档（`.gitignore` 忽略，不上传）。

## 分页
- 左侧悬浮标题列导航（桌面常驻，移动端默认收起、点 ☰ 展开）：
  - `index.html` — charaPage（巅峰使用率统计 & 当期卡池表）
  - `monsters.html` — 推图推关 · 怪物数值查询（主线 Quest 12 章 + 塔 Tower 5 座：无穷/蓝/红/黄/绿）
  - `openpvp.html` — 竞技场与巅峰开盒（Battle League 各世界 / Legend League 世界组排名：队伍出场统计、玩家名过滤、点角色头像开盒看数值·技能·装备·圣装·魔装·符石；默认实时在线加载，可选「预载资源」把图标与主数据文本缓存到浏览器本地）
  - `skill.html` — 角色技能页（点选角色查看：普攻/主动/被动技能、秘仪加成、专属武器、初始数值面板；数据来自官方主数据压缩 `data/skill_*.json`）
- quest/tower 数据由 GitHub Actions 同一定时抓取并压缩到 `data/quest.json`、`data/tower.json`（只保留查询需要的列）；角色/技能/装备/符石开盒映射存于 `data/pvp_*.json`；角色技能页数据存于 `data/skill_*.json`（由 `skill_gen.py` 读取本地主数据生成）。
