# mementomori-charaPage
メメントモリ MementoMori 卡池在线监测

- `index.html` 为纯前端页面：打开后由浏览器直接**在线读取** Google Sheets 卡池表（CSV），渲染两张表：
  - MMT 卡池 · 最新总览
  - MMT 卡池 · 属性限定记录
- 角色图标使用 `https://mentemori.icu/assets/CHR_XXXXXX_00_s.png`（与表格里的 `=IMAGE` 一致），不生成图片。
- 浏览器本地缓存：同一浏览器 1 小时内再次打开直接秒开（不请求 Google），整点后才重新在线读取一次；“刷新数据”按钮可强制重新读取。
- 两张表除标题行/列外全部由页面按公式**直接从 `卡-0` 原始数据计算**（不依赖汇总表计算值）：新角色/新复刻/新星辰、#1/#2/#3、上个卡池（当前 弗莱可）、即将/已过期、六属性的限定数/等待天数/上个角色/-1~-6 图标。
- 读取失败会自动重试 4 次；页面每小时自动刷新。
- 注意：页面需通过 http(s) 访问（GitHub Pages 或本地服务器，如 `python -m http.server`）；直接双击 `file://` 打开会因浏览器跨域限制无法读取。
- `.github/workflows/deploy.yml` 仅负责把页面部署到 GitHub Pages，不再生成内容。
