# mementomori-charaPage
メメントモリ MementoMori 卡池在线监测

- `index.html` 为纯前端页面：打开后由浏览器直接**在线读取** Google Sheets 卡池表（CSV），渲染两张表：
  - MMT 卡池 · 最新总览
  - MMT 卡池 · 属性限定记录
- 角色图标使用 `https://mentemori.icu/assets/CHR_XXXXXX_00_s.png`（与表格里的 `=IMAGE` 一致），不生成图片。
- 读取失败会自动重试 4 次；页面每小时自动刷新。
- 注意：页面需通过 http(s) 访问（GitHub Pages 或本地服务器，如 `python -m http.server`）；直接双击 `file://` 打开会因浏览器跨域限制无法读取。
- `.github/workflows/deploy.yml` 仅负责把页面部署到 GitHub Pages，不再生成内容。
