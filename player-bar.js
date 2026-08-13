/* ============================================================================
 * MementoMori 音乐室 · 共享播放器 player-bar.js
 * ----------------------------------------------------------------------------
 * 作用：让音乐在整站各页面之间“接力”播放。
 *   - 在 art.html（含 #player-root 的完整播放器）→ 驱动完整播放器；
 *   - 在其它页面 → 若存在播放会话，在左上角渲染迷你顶栏并自动续播；
 *   - 播放状态（曲库/当前曲/进度/音量/模式）实时写入 localStorage，跳页时带走；
 *   - 顶栏“✕”或播放器“⏹”= 立即停止并清除会话。
 * 引入方式：各页面 </body> 前加 <script src="player-bar.js"></script>
 * ==========================================================================*/
(function () {
"use strict";

/* ---------------- 默认曲库（可被 data/music.json 覆盖） ---------------- */
var KEY = "mmt_player_state_v1";
var DEFAULT_TRACKS = [
  { id: "demo1", title: "SoundHelix Song 1", sub: "示例音频 · 可替换为 MementoMori BGM", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", cover: "🎵", duration: null },
  { id: "demo2", title: "SoundHelix Song 2", sub: "示例音频 · 可替换为 MementoMori BGM", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", cover: "🎶", duration: null },
  { id: "demo3", title: "SoundHelix Song 3", sub: "示例音频 · 可替换为 MementoMori BGM", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", cover: "🎻", duration: null },
  { id: "demo4", title: "SoundHelix Song 4", sub: "示例音频 · 可替换为 MementoMori BGM", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3", cover: "🎷", duration: null },
  { id: "demo5", title: "SoundHelix Song 5", sub: "示例音频 · 可替换为 MementoMori BGM", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3", cover: "🥁", duration: null }
];

/* ---------------- 运行状态 ---------------- */
var tracks = DEFAULT_TRACKS.slice();
var idx = 0;
var mode = "loop";          /* loop | one | random */
var vol = 0.8;
var hasSession = false;     /* 是否存在跨页播放会话 */
var pendingResume = false;  /* autoplay 被浏览器拦截 → 等下一次用户手势恢复 */
var initSeek = 0;           /* 跨页恢复用的起始进度（秒），消费后归零 */
var barEl = null;           /* 迷你顶栏 DOM */
var isArt = !!document.getElementById("player-root");

/* ---------------- 工具 ---------------- */
function esc(v){ return String(v == null ? "" : v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function fmt(s){
  if (!isFinite(s) || s < 0) return "0:00";
  s = Math.floor(s);
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}
function isImgUrl(c){
  c = String(c || "");
  return /^(https?:)?\/\//.test(c) || /\.(png|jpe?g|webp|gif|avif)(\?|#|$)/i.test(c);
}
function coverInner(t){
  var c = t && t.cover;
  if (isImgUrl(c)) return '<img src="' + esc(c) + '" alt="" loading="lazy">';
  return esc(c || "🎵");
}

/* ---------------- 音频元素（每页一个） ---------------- */
var audio = document.getElementById("audio");
if (!audio){
  audio = document.createElement("audio");
  audio.preload = "metadata";
  document.body.appendChild(audio);
}

/* ---------------- 会话存取 ---------------- */
function saveState(){
  if (!hasSession) return; /* 未建立播放会话时不写，避免顶栏凭空出现 */
  try{
    localStorage.setItem(KEY, JSON.stringify({
      v: 1,
      tracks: tracks,
      idx: idx,
      mode: mode,
      vol: vol,
      t: (audio.currentTime && isFinite(audio.currentTime)) ? audio.currentTime : 0,
      playing: !audio.paused && !!audio.src,
      active: true
    }));
  }catch(e){}
}
function loadState(){
  try{
    var raw = localStorage.getItem(KEY);
    if (!raw) return null;
    var st = JSON.parse(raw);
    if (!st || st.v !== 1 || st.active === false) return null;
    return st;
  }catch(e){ return null; }
}
function clearState(){
  try{ localStorage.removeItem(KEY); }catch(e){}
}
/* 页面离开 / 切后台时强制保存最新进度 */
window.addEventListener("pagehide", saveState);
document.addEventListener("visibilitychange", function(){ if (document.visibilityState === "hidden") saveState(); });
/* 点击同源链接前（capture 阶段）保存，保证目标页拿到最新状态 */
document.addEventListener("click", function(e){
  var a = e.target && e.target.closest ? e.target.closest("a") : null;
  if (!a) return;
  var href = a.getAttribute("href") || "";
  if (!href || href.charAt(0) === "#") return;
  if (/^https?:/i.test(href) && a.hostname !== location.hostname) return;
  saveState();
}, true);

/* ---------------- 播放控制 ---------------- */
function setPlaying(on){
  pendingResume = false;
  if (isArt){
    var b = document.getElementById("btn-play");
    if (b) b.textContent = on ? "⏸" : "▶";
    var cv = document.getElementById("cover");
    if (cv) cv.classList.toggle("playing", on);
    var act = document.querySelector(".playlist .track.active");
    if (act) act.classList.toggle("paused", !on);
  }
  if (barEl){
    var pb = barEl.querySelector('[data-a="play"]');
    if (pb) pb.textContent = on ? "⏸" : "▶";
    barEl.classList.toggle("playing", on);
  }
  saveState();
}
function tryPlay(){
  var p = audio.play();
  if (p && typeof p.then === "function"){
    p.then(function(){ setPlaying(true); })
     .catch(function(){ setPlaying(false); pendingResume = true; });
  } else {
    setPlaying(true);
  }
}
function togglePlay(){
  if (!audio.src){ loadTrack(idx, true); return; }
  if (audio.paused){
    audio.play().then(function(){ setPlaying(true); }).catch(function(){});
  } else {
    audio.pause();
    setPlaying(false);
  }
}
function loadTrack(i, autoplay){
  if (!tracks.length) return;
  hasSession = true; /* 任何实际播放（含自动加载）都算建立会话 */
  idx = ((i % tracks.length) + tracks.length) % tracks.length;
  var t = tracks[idx];
  if (isArt){
    document.getElementById("track-title").textContent = t.title || "—";
    document.getElementById("track-sub").textContent = t.sub || "";
    var ti = document.getElementById("track-index");
    if (ti) ti.textContent = (idx + 1) + " / " + tracks.length;
    var cv = document.getElementById("cover");
    cv.innerHTML = coverInner(t);
    cv.classList.remove("playing");
    document.getElementById("seek").value = 0;
    document.getElementById("cur-time").textContent = "0:00";
    document.getElementById("dur-time").textContent = t.duration ? fmt(t.duration) : "0:00";
  }
  audio.src = t.src;
  audio.volume = vol;
  audio.load();
  renderList();
  if (barEl) refreshBar();
  if (isArt && t.id){
    try{ if (location.hash !== "#" + t.id) history.replaceState(null, "", "#" + t.id); }catch(e){}
  }
  if (autoplay !== false) tryPlay();
  saveState();
}
function stopAndClear(){
  pendingResume = false;
  try{ audio.pause(); }catch(e){}
  try{ audio.removeAttribute("src"); audio.load(); }catch(e){}
  clearState();
  hasSession = false;
  if (barEl){ barEl.remove(); barEl = null; }
  if (isArt){
    setPlaying(false);
    document.getElementById("seek").value = 0;
    document.getElementById("cur-time").textContent = "0:00";
    document.getElementById("dur-time").textContent = "0:00";
  }
}

/* ---------------- art 完整播放器 ---------------- */
function bindArt(){
  document.getElementById("btn-play").addEventListener("click", togglePlay);
  document.getElementById("btn-prev").addEventListener("click", function(){ loadTrack(idx - 1, true); });
  document.getElementById("btn-next").addEventListener("click", function(){ loadTrack(idx + 1, true); });
  document.getElementById("btn-mode").addEventListener("click", function(){
    mode = mode === "loop" ? "one" : mode === "one" ? "random" : "loop";
    document.getElementById("btn-mode").textContent = mode === "loop" ? "🔁" : mode === "one" ? "🔂" : "🔀";
    saveState();
  });
  var stopBtn = document.getElementById("btn-stop");
  if (stopBtn) stopBtn.addEventListener("click", stopAndClear);
  document.getElementById("seek").addEventListener("input", function(){
    if (audio.duration && isFinite(audio.duration)) audio.currentTime = this.value / 1000 * audio.duration;
  });
  document.getElementById("volume").addEventListener("input", function(){
    vol = this.value / 100;
    audio.volume = vol;
    saveState();
  });
}
function renderList(){
  if (!isArt) return;
  var el = document.getElementById("playlist");
  if (!el) return;
  el.innerHTML = tracks.map(function(t, i){
    var dur = t.duration ? fmt(t.duration) : "";
    return '<div class="track' + (i === idx ? " active" : "") + (i === idx && audio.paused ? " paused" : "") + '" onclick="MMPlayer.loadTrack(' + i + ')" title="点击播放">'
      + '<span class="trk-idx">' + String(i + 1).padStart(2, "0") + "</span>"
      + '<span class="trk-cover">' + coverInner(t) + "</span>"
      + '<span class="trk-info"><span class="trk-name">' + esc(t.title || "—") + '</span><span class="trk-sub">' + esc(t.sub || "") + "</span></span>"
      + (dur ? '<span class="trk-dur">' + dur + "</span>" : "")
      + '<span class="trk-eq"><i></i><i></i><i></i></span>'
      + "</div>";
  }).join("");
}

/* ---------------- 迷你顶栏（非 art 页） ---------------- */
function injectBarCss(){
  if (document.getElementById("mmbar-style")) return;
  var st = document.createElement("style");
  st.id = "mmbar-style";
  st.textContent = [
    "#mmbar{position:fixed;left:360px;top:10px;z-index:150;display:flex;align-items:center;gap:9px;",
    "background:rgba(18,15,30,.93);border:1px solid rgba(217,178,106,.38);border-radius:999px;",
    "padding:6px 10px 6px 7px;box-shadow:0 8px 28px rgba(0,0,0,.55);backdrop-filter:blur(10px);",
    "max-width:min(500px,calc(100vw - 26px));animation:mmbar-in .28s ease;",
    "font-family:'Segoe UI','Microsoft YaHei','PingFang SC',Arial,sans-serif;color:#e8e6f0}",
    "@keyframes mmbar-in{from{transform:translateY(-14px);opacity:0}to{transform:none;opacity:1}}",
    "#mmbar .mmbar-cover{width:38px;height:38px;border-radius:50%;flex:0 0 auto;display:flex;align-items:center;justify-content:center;",
    "font-size:17px;overflow:hidden;background:linear-gradient(135deg,#7c6cf0,#5b4fd6);",
    "box-shadow:0 0 10px rgba(124,108,240,.45);cursor:pointer}",
    "#mmbar .mmbar-cover img{width:100%;height:100%;object-fit:cover;display:block}",
    "#mmbar.playing .mmbar-cover{animation:mmbar-glow 1.6s ease-in-out infinite}",
    "@keyframes mmbar-glow{0%,100%{box-shadow:0 0 8px rgba(124,108,240,.4)}50%{box-shadow:0 0 20px rgba(124,108,240,.85)}}",
    "#mmbar .mmbar-info{flex:1;min-width:0;cursor:pointer;line-height:1.25;overflow:hidden}",
    "#mmbar .mmbar-title{font-size:13px;font-weight:600;color:#f1eef8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    "#mmbar .mmbar-sub{font-size:11px;color:#9a94ad;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    "#mmbar button{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);color:#fff;border-radius:50%;",
    "width:30px;height:30px;font-size:12px;cursor:pointer;line-height:1;flex:0 0 auto;transition:filter .2s;padding:0}",
    "#mmbar button:hover{filter:brightness(1.3)}",
    "#mmbar .mmbar-play{background:linear-gradient(90deg,#7c6cf0,#5b4fd6);border:none;width:34px;height:34px;font-size:13px}",
    "#mmbar .mmbar-prog{width:64px;height:4px;border-radius:2px;background:rgba(255,255,255,.15);overflow:hidden;flex:0 0 auto;cursor:pointer}",
    "#mmbar .mmbar-fill{height:100%;width:0%;background:linear-gradient(90deg,#d9b26a,#f5e6c4);border-radius:2px;pointer-events:none}",
    "#mmbar .mmbar-close{width:26px;height:26px;font-size:13px;color:#ffb4a8;border-color:rgba(255,180,168,.35)}",
    "body.side-collapsed #mmbar{left:16px}",
    "@media (max-width:768px){#mmbar{left:58px;top:8px;max-width:calc(100vw - 74px)}",
    "#mmbar .mmbar-prog{width:40px}",
    "body:not(.side-collapsed) #mmbar{display:none}}"
  ].join("\n");
  document.head.appendChild(st);
}
function buildBar(){
  injectBarCss();
  barEl = document.createElement("div");
  barEl.id = "mmbar";
  barEl.innerHTML =
    '<span class="mmbar-cover" id="mmb-cover" title="回到音乐室"></span>' +
    '<span class="mmbar-info" id="mmb-info" title="回到音乐室"><span class="mmbar-title"></span><span class="mmbar-sub">音乐室</span></span>' +
    '<button data-a="prev" title="上一首">⏮</button>' +
    '<button class="mmbar-play" data-a="play" title="播放 / 暂停">▶</button>' +
    '<button data-a="next" title="下一首">⏭</button>' +
    '<span class="mmbar-prog" id="mmb-prog" title="点击跳转进度"><span class="mmbar-fill" id="mmb-fill"></span></span>' +
    '<button class="mmbar-close" id="mmb-close" title="关闭播放">✕</button>';
  document.body.appendChild(barEl);
  barEl.querySelector('[data-a="prev"]').addEventListener("click", function(e){ e.stopPropagation(); loadTrack(idx - 1, true); });
  barEl.querySelector('[data-a="play"]').addEventListener("click", function(e){ e.stopPropagation(); togglePlay(); });
  barEl.querySelector('[data-a="next"]').addEventListener("click", function(e){ e.stopPropagation(); loadTrack(idx + 1, true); });
  barEl.querySelector("#mmb-close").addEventListener("click", function(e){ e.stopPropagation(); stopAndClear(); });
  barEl.querySelector("#mmb-cover").addEventListener("click", function(e){ e.stopPropagation(); goArt(); });
  barEl.querySelector("#mmb-info").addEventListener("click", function(e){ e.stopPropagation(); goArt(); });
  barEl.querySelector("#mmb-prog").addEventListener("click", function(e){
    if (!audio.duration || !isFinite(audio.duration)) return;
    var r = this.getBoundingClientRect();
    var ratio = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    audio.currentTime = ratio * audio.duration;
  });
  refreshBar();
}
function goArt(){
  var t = tracks[idx] || {};
  location.href = "art.html" + (t.id ? "#" + t.id : "");
}
function refreshBar(){
  if (!barEl) return;
  var t = tracks[idx] || {};
  barEl.querySelector("#mmb-title").textContent = t.title || "—";
  barEl.querySelector("#mmb-sub").textContent = t.sub || "音乐室";
  barEl.querySelector("#mmb-cover").innerHTML = coverInner(t);
  barEl.querySelector('[data-a="play"]').textContent = audio.paused ? "▶" : "⏸";
  barEl.classList.toggle("playing", !audio.paused);
  updateBarProgress();
}
function updateBarProgress(){
  if (!barEl) return;
  var ratio = (audio.duration && isFinite(audio.duration)) ? audio.currentTime / audio.duration : 0;
  barEl.querySelector("#mmb-fill").style.width = (Math.min(1, Math.max(0, ratio)) * 100) + "%";
}

/* ---------------- autoplay 被拦时的手势兜底 ---------------- */
function installGestureResume(){
  var resume = function(e){
    if (!pendingResume) return;
    var t = e.target;
    if (t && t.closest && (t.closest("#mmbar") || t.closest(".controls"))) return; /* 控件自己处理 */
    pendingResume = false;
    audio.play().then(function(){ setPlaying(true); }).catch(function(){});
  };
  document.addEventListener("pointerdown", resume, true);
  document.addEventListener("touchstart", resume, true);
  document.addEventListener("keydown", resume, true);
}

/* ---------------- 音频事件 ---------------- */
audio.addEventListener("ended", function(){
  if (mode === "random"){ loadTrack(Math.floor(Math.random() * tracks.length), true); return; }
  if (mode === "one"){ audio.currentTime = 0; audio.play().catch(function(){}); setPlaying(true); return; }
  loadTrack(idx + 1, true);
});
audio.addEventListener("error", function(){
  setPlaying(false);
  if (isArt) document.getElementById("track-sub").textContent = "播放失败，请检查音频源";
});
var lastSaveTs = 0;
audio.addEventListener("timeupdate", function(){
  if (isArt && audio.duration && isFinite(audio.duration)){
    document.getElementById("seek").value = Math.round(audio.currentTime / audio.duration * 1000);
    document.getElementById("cur-time").textContent = fmt(audio.currentTime);
    document.getElementById("dur-time").textContent = fmt(audio.duration);
  }
  updateBarProgress();
  if (Date.now() - lastSaveTs > 1000){ lastSaveTs = Date.now(); saveState(); }
});
audio.addEventListener("loadedmetadata", function(){
  var t = tracks[idx];
  if (t && audio.duration && isFinite(audio.duration)){
    var changed = !t.duration;
    t.duration = audio.duration;
    if (isArt) document.getElementById("dur-time").textContent = fmt(audio.duration);
    if (changed) renderList(); /* 时长回填到播放列表 */
  }
  if (initSeek > 0){
    if (initSeek < audio.duration){
      try{ audio.currentTime = initSeek; }catch(e){}
    }
    initSeek = 0;
  }
});

/* ---------------- data/music.json 曲库（Promise 缓存，全站预取） ---------------- */
var fetchedTracks = null;   /* null=未完成；[]=无/失败；[...]=成功 */
var musicP = null;
function fetchMusicJson(){
  if (!musicP){
    musicP = fetch("data/music.json").then(function(r){ return r.ok ? r.json() : null; }).then(function(d){
      var list = Array.isArray(d) ? d : (d && d.tracks);
      var mapped = [];
      if (list && list.length){
        mapped = list.map(function(t){
          return {
            id: t.id || t.title || "",
            title: t.title || t.name || "—",
            sub: t.sub || t.subtitle || "",
            src: t.src || t.url || "",
            cover: t.cover || t.icon || "🎵",
            duration: (typeof t.duration === "number" && isFinite(t.duration)) ? t.duration : null
          };
        }).filter(function(t){ return t.src; });
      }
      fetchedTracks = mapped;
      return mapped;
    }).catch(function(){ fetchedTracks = []; return []; });
  }
  return musicP;
}

/* ---------------- hash 联动（art 页内切歌） ---------------- */
window.addEventListener("hashchange", function(){
  if (!isArt) return;
  var h = (location.hash || "").replace(/^#/, "");
  var i = -1;
  for (var k = 0; k < tracks.length; k++){ if (tracks[k].id === h){ i = k; break; } }
  if (i >= 0 && i !== idx) loadTrack(i, true);
});

/* ---------------- 初始化 ---------------- */
function init(){
  var st = loadState();
  if (st && Array.isArray(st.tracks) && st.tracks.length){
    tracks = st.tracks;
    if (typeof st.idx === "number" && isFinite(st.idx)) idx = ((Math.floor(st.idx) % tracks.length) + tracks.length) % tracks.length;
    if (st.mode === "loop" || st.mode === "one" || st.mode === "random") mode = st.mode;
    if (typeof st.vol === "number" && isFinite(st.vol)) vol = Math.min(1, Math.max(0, st.vol));
    hasSession = true;
    if (typeof st.t === "number" && isFinite(st.t) && st.t > 0) initSeek = st.t;
  }
  audio.volume = vol;
  injectSideCss();
  installGestureResume();
  if (isArt){
    bindArt();
    renderList();
    document.getElementById("btn-mode").textContent = mode === "loop" ? "🔁" : mode === "one" ? "🔂" : "🔀";
    document.getElementById("volume").value = Math.round(vol * 100);
  }
  if (hasSession){
    if (!isArt) buildBar();
    loadTrack(idx, false);
    if (st.playing) tryPlay();
  }
  /* 全站预取曲库；无会话时应用；art 页无会话且用户尚未点播时完成首次加载 */
  fetchMusicJson().then(function(){
    if (!hasSession && fetchedTracks && fetchedTracks.length) tracks = fetchedTracks;
    if (isArt && !hasSession && !audio.src){
      renderList();
      var h = (location.hash || "").replace(/^#/, "");
      var i = -1;
      for (var k = 0; k < tracks.length; k++){ if (tracks[k].id === h){ i = k; break; } }
      if (i >= 0) idx = i;
      loadTrack(idx, false);
      tryPlay(); /* 首次进入尝试自动播放；被浏览器拦截则等用户手势 */
    }
  });
}

/* ---------------- 侧栏“快速播放”：当前页立即打开迷你顶栏并播放第一首 ---------------- */
function startFirst(){
  /* 移动端点“快速播放”后自动收起侧栏，让左上角顶栏立即可见 */
  var side = document.getElementById("side");
  if (side && window.matchMedia("(max-width: 768px)").matches && side.classList.contains("open")){
    side.classList.remove("open");
    document.body.classList.add("side-collapsed");
    var mask = document.getElementById("side-mask");
    if (mask) mask.classList.remove("show");
  }
  if (!isArt && !barEl) buildBar();
  if (fetchedTracks !== null){
    applyQuickStart(); /* 曲库已就绪 → 同步路径，保持在用户手势内调用 play() */
  } else {
    fetchMusicJson().then(applyQuickStart);
  }
}
function applyQuickStart(){
  if (!hasSession && fetchedTracks && fetchedTracks.length) tracks = fetchedTracks;
  if (!tracks.length) tracks = DEFAULT_TRACKS.slice();
  hasSession = true;
  loadTrack(0, true);
}

/* ---------------- 侧栏“音乐室”拆分为左右两项的样式（全站注入） ---------------- */
function injectSideCss(){
  if (document.getElementById("mmbar-side-style")) return;
  var st = document.createElement("style");
  st.id = "mmbar-side-style";
  st.textContent = [
    ".side-split{display:flex;gap:8px;margin-bottom:8px;align-items:stretch}",
    ".side-split .side-link{flex:1;margin-bottom:0;padding:12px 10px;font-size:14px;min-width:0}",
    ".side-split .side-link .sub{font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    "button.side-link{background:transparent;border:1px solid transparent;font-family:inherit;text-align:left;cursor:pointer;color:inherit}",
    ".side-split .side-quick{border:1px dashed rgba(217,178,106,.45);background:rgba(217,178,106,.06)}",
    ".side-split .side-quick:hover{background:rgba(217,178,106,.14)}",
    ".side-split .side-quick:active{transform:scale(.97)}"
  ].join("\n");
  document.head.appendChild(st);
}

/* 供侧栏按钮与播放列表行内 onclick 调用 */
window.MMPlayer = {
  loadTrack: function(i){ loadTrack(i, true); },
  startFirst: startFirst
};

init();
})();
