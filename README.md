# mementomori-charaPage
メメントモリ MementoMori 巅峰使用率统计 & 卡池轮转表（在线监测）

- 页面纯前端实现，打开后由浏览器直接**在线读取** Google Sheets（卡池表 + 使用率表）并实时计算。
- 第一个表格：**巅峰使用率 · 今日排行**（前 20 名，含图标、今日/昨日使用率、变化），数据来自「使用率表 → 动态率」分页。
- 第二、三张表：**MMT 卡池 · 最新总览** 与 **MMT 卡池 · 属性限定记录**，全部按公式直接从 `卡-0` 原始数据计算（不依赖汇总表计算值）。
- 角色图标使用 `https://mentemori.icu/assets/CHR_XXXXXX_00_s.png`（与表格里的 `=IMAGE` 一致），不生成图片。
- 浏览器本地缓存：同一浏览器 1 小时内再次打开直接秒开（不请求 Google），整点后才重新在线读取一次；“刷新数据”按钮可强制重新读取。
- 注意：页面需通过 http(s) 访问（GitHub Pages 或本地服务器，如 `python -m http.server`）；直接双击 `file://` 打开会因浏览器跨域限制无法读取。
- `.github/workflows/deploy.yml` 仅负责把页面部署到 GitHub Pages，不再生成内容。
