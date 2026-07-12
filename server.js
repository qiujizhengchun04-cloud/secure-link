const express = require('express');
const app = express();
const logs = [];

function generateId() {
  return Math.random().toString(36).substring(2, 10) +
         Math.random().toString(36).substring(2, 6);
}

// ===== HTML（コマンド画面＋ログ表示機能つき） =====
const HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<title>Command + Link Generator</title>
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
.cmd-log { color:#88ddff; }
#menu-window { left:60px; top:62vh; width:80vw; max-width:480px; height:auto; min-height:180px; padding:20px 20px 18px 20px; }
#menu-window .menu-title { color:#fff; font-size:15px; margin-bottom:14px; font-weight:bold; }
#menu-window .btn-row { display:flex; gap:10px; flex-wrap:wrap; }
#menu-window .btn-link { background:transparent; border:1px solid #88ddff; color:#88ddff; padding:8px 24px; font-family:inherit; font-size:14px; cursor:pointer; transition:background 0.2s; touch-action:auto; pointer-events:auto; }
#menu-window .btn-link:hover { background:#1a2a3a; }
#menu-window .btn-copy { background:transparent; border:1px solid #888; color:#888; padding:8px 18px; font-family:inherit; font-size:13px; cursor:pointer; transition:background 0.2s; touch-action:auto; pointer-events:auto; }
#menu-window .btn-copy:hover { background:#1a1a1a; }
#menu-window .btn-copy.copy-success { color:#66ff88 !important; border-color:#66ff88; }
#menu-window .btn-logs { background:transparent; border:1px solid #88ddff; color:#88ddff; padding:8px 18px; font-family:inherit; font-size:13px; cursor:pointer; transition:background 0.2s; touch-action:auto; pointer-events:auto; }
#menu-window .btn-logs:hover { background:#1a2a3a; }
#menu-window .result-area { margin-top:14px; padding-top:12px; border-top:1px solid #333; min-height:40px; color:#fff; font-size:13px; word-break:break-all; }
#menu-window .result-area .link-display { display:block; color:#88ddff; text-decoration:underline; cursor:pointer; margin-bottom:4px; padding:4px 0; touch-action:auto; pointer-events:auto; }
#menu-window .result-area .link-display:hover { color:#aaefff; }
#menu-window .result-area .status-msg { color:#aaa; font-size:12px; }
#menu-window .result-area .warning { color:#ff8844; font-size:12px; }
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
    <button class="btn-logs" id="logs-btn">📋 ログ表示</button>
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
  cmdInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      const cmd = cmdInput.value.trim();
      cmdInput.value = '';
      if (cmd === '') return;
      addCmdOutput('> ' + cmd, 'cmd-echo');
      addCmdOutput('Error', 'cmd-error');
    }
  });
  const generateBtn = document.getElementById('generate-btn');
  const copyBtn = document.getElementById('copy-btn');
  const logsBtn = document.getElementById('logs-btn');
  const resultArea = document.getElementById('result-area');
  let currentLink = '';

  // ===== リンク生成 =====
  async function generateLink() {
    try {
      const res = await fetch('/generate');
      const data = await res.json();
      currentLink = data.link;
      resultArea.innerHTML = '<a href="#" class="link-display" id="generated-link">🔗 ' + currentLink + '</a><span class="status-msg">✅ 生成完了！ コピーして相手に送信</span><span class="warning">⚠ 自分で開くとテスト</span>';
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

  // ===== コピー =====
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

  // ===== ★ ログ表示（コマンド画面にIPを表示） =====
  async function showLogs() {
    try {
      const res = await fetch('/logs');
      const text = await res.text();
      // HTMLからテキストだけを抽出
      const temp = document.createElement('div');
      temp.innerHTML = text;
      const rows = temp.querySelectorAll('table tr');
      if (rows.length <= 1) {
        addCmdOutput('[📋 ログ] まだアクセスなし', 'cmd-log');
        return;
      }
      addCmdOutput('[📋 アクセスログ]', 'cmd-log');
      for (let i = 1; i < rows.length; i++) {
        const cols = rows[i].querySelectorAll('td');
        if (cols.length >= 2) {
          addCmdOutput('  ' + cols[0].textContent + '  →  ' + cols[1].textContent, 'cmd-ip');
        }
      }
    } catch(err) {
      addCmdOutput('[📋 ログ] 取得失敗: ' + err.message, 'cmd-error');
    }
  }
  logsBtn.addEventListener('click', showLogs);

  // ===== ドラッグ＆リサイズ =====
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
      if (nw < 300) nw = 300;
      if (nh < 200) nh = 200;
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

// ===== サーバーサイド =====
app.get('/', (req, res) => {
  res.send(HTML);
});

app.get('/generate', (req, res) => {
  const id = generateId();
  const link = `https://${req.get('host')}/t/${id}`;
  res.json({ link });
});

app.get('/t/:id', (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'IP不明';
  const time = new Date().toLocaleString('ja-JP');
  logs.push({ id: req.params.id, ip: ip, time: time });
  console.log('[アクセス] ID: ' + req.params.id + ', IP: ' + ip);
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><title>特定されました</title></head>
    <body style="background:#000;height:100vh;display:flex;justify-content:center;align-items:center;margin:0;font-family:'Impact',sans-serif;flex-direction:column;">
      <div style="color:#ff2222;font-size:clamp(40px,10vw,100px);text-align:center;text-shadow:0 0 40px rgba(255,0,0,0.6);animation:pulse 1.5s infinite;">
        ⚠ 特定されました
      </div>
      <div style="color:#888;font-size:clamp(14px,2vw,24px);font-family:'Consolas',monospace;margin-top:20px;">
        あなたのアクセスは記録されました
      </div>
      <style>
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.7;transform:scale(1.05)} }
      </style>
    </body>
    </html>
  `);
});

app.get('/logs', (req, res) => {
  if (logs.length === 0) {
    return res.send('<h2>まだアクセスなし</h2><a href="/">戻る</a>');
  }
  let html = '<h2>アクセスログ</h2><table border="1"><tr><th>時間</th><th>IP</th><th>リンクID</th></tr>';
  logs.reverse().forEach(function(log) {
    html += '<tr><td>' + log.time + '</td><td>' + log.ip + '</td><td>' + log.id + '</td></tr>';
  });
  html += '</table><a href="/">戻る</a>';
  res.send(html);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, function() {
  console.log('Server running on port ' + PORT);
});
