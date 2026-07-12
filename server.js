const express = require('express');
const app = express();

const logs = [];

function generateId() {
  return Math.random().toString(36).substring(2, 10) +
         Math.random().toString(36).substring(2, 6);
}

// ================================================================
// 君がくれたHTML（デザインそのまま）
// ================================================================
const HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<title>Command + Link Generator</title>
<style>
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    user-select: none;
    -webkit-touch-callout: none;
    -webkit-tap-highlight-color: transparent;
  }
  body {
    background: #1a1a2e;
    height: 100vh;
    overflow: hidden;
    font-family: 'Consolas', 'Lucida Console', 'Courier New', monospace;
    touch-action: none;
  }

  .window {
    position: absolute;
    background: #000;
    border: 2px solid #555;
    border-radius: 0;
    box-shadow: 0 10px 40px rgba(0,0,0,0.9);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    will-change: left, top, width, height;
  }
  .window .drag-area {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 20px;
    z-index: 10;
    cursor: grab;
    touch-action: none;
    background: transparent;
  }
  .window .drag-area:active {
    cursor: grabbing;
  }
  .window .resize-handle {
    position: absolute;
    right: 0;
    bottom: 0;
    width: 32px;
    height: 32px;
    cursor: nwse-resize;
    z-index: 20;
    touch-action: none;
    background: transparent;
  }
  .window .resize-handle::after {
    content: '';
    position: absolute;
    right: 4px;
    bottom: 4px;
    width: 0;
    height: 0;
    border-right: 14px solid #555;
    border-bottom: 14px solid #555;
    border-left: 14px solid transparent;
    border-top: 14px solid transparent;
    opacity: 0.8;
    pointer-events: none;
  }

  /* ===== コマンドウィンドウ ===== */
  #cmd-window {
    left: 40px;
    top: 40px;
    width: 90vw;
    max-width: 780px;
    height: 50vh;
    min-width: 400px;
    min-height: 250px;
  }
  #cmd-terminal {
    flex: 1;
    background: #000;
    padding: 20px 14px 8px 14px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-height: 0;
  }
  #cmd-output {
    flex: 1;
    overflow-y: auto;
    white-space: pre-wrap;
    word-break: break-all;
    font-size: 14px;
    line-height: 1.6;
    color: #fff;
    margin-bottom: 4px;
    -webkit-overflow-scrolling: touch;
  }
  #cmd-output::-webkit-scrollbar { width: 6px; background: #1a1a1a; }
  #cmd-output::-webkit-scrollbar-thumb { background: #555; }

  #cmd-input-line {
    display: flex;
    align-items: center;
    border-top: 1px solid #333;
    padding-top: 6px;
    flex-shrink: 0;
  }
  #cmd-prompt {
    color: #fff;
    font-weight: normal;
    margin-right: 8px;
    font-size: 14px;
    white-space: pre;
  }
  #cmd-input {
    background: transparent;
    border: none;
    outline: none;
    color: #fff;
    font-family: inherit;
    font-size: 14px;
    flex: 1;
    caret-color: #fff;
    user-select: text;
    -webkit-user-select: text;
    touch-action: auto;
    pointer-events: auto;
  }

  .cmd-echo { color: #fff; }
  .cmd-error { color: #ff4444; }
  .cmd-ip { color: #88ddff; }
  .cmd-notify { color: #ffaa44; }

  /* ===== メニューウィンドウ ===== */
  #menu-window {
    left: 60px;
    top: 55vh;
    width: 80vw;
    max-width: 480px;
    height: 280px;
    min-width: 300px;
    min-height: 200px;
    padding: 24px 20px 20px 20px;
  }
  #menu-window .menu-title {
    color: #fff;
    font-size: 16px;
    margin-bottom: 20px;
    font-weight: bold;
  }
  #menu-window .btn-link {
    background: transparent;
    border: 1px solid #88ddff;
    color: #88ddff;
    padding: 10px 30px;
    font-family: inherit;
    font-size: 15px;
    cursor: pointer;
    transition: background 0.2s;
    touch-action: auto;
    pointer-events: auto;
    display: inline-block;
  }
  #menu-window .btn-link:hover {
    background: #1a2a3a;
  }
  #menu-window .btn-copy {
    background: transparent;
    border: 1px solid #888;
    color: #888;
    padding: 8px 18px;
    font-family: inherit;
    font-size: 13px;
    cursor: pointer;
    transition: background 0.2s;
    touch-action: auto;
    pointer-events: auto;
    margin-left: 10px;
  }
  #menu-window .btn-copy:hover {
    background: #1a1a1a;
  }
  #menu-window .btn-copy.copy-success {
    color: #66ff88 !important;
    border-color: #66ff88;
  }
  #menu-window .result-area {
    margin-top: 18px;
    padding-top: 14px;
    border-top: 1px solid #333;
    min-height: 50px;
    color: #fff;
    font-size: 13px;
    word-break: break-all;
  }
  #menu-window .result-area .link-display {
    display: block;
    color: #88ddff;
    text-decoration: underline;
    cursor: pointer;
    margin-bottom: 6px;
    padding: 4px 0;
    touch-action: auto;
    pointer-events: auto;
  }
  #menu-window .result-area .link-display:hover {
    color: #aaefff;
  }
  #menu-window .result-area .status-msg {
    color: #aaa;
    font-size: 12px;
  }
  #menu-window .result-area .warning {
    color: #ff8844;
    font-size: 12px;
  }
</style>
</head>
<body>

<!-- コマンドウィンドウ -->
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

<!-- メニューウィンドウ -->
<div id="menu-window" class="window">
  <div class="drag-area" id="menu-drag"></div>
  <div class="menu-title">■ リンク生成</div>
  <button class="btn-link" id="generate-btn">リンク</button>
  <button class="btn-copy" id="copy-btn" style="display:none;">📋 コピー</button>
  <div class="result-area" id="result-area">
    <span class="status-msg">「リンク」を押すと相手に渡す用のリンクが生成されます</span>
  </div>
  <div class="resize-handle" id="menu-resize"></div>
</div>

<script>
// ================================================================
// コマンドウィンドウ（そのまま）
// ================================================================
const cmdOutput = document.getElementById('cmd-output');
const cmdInput = document.getElementById('cmd-input');

function addCmdOutput(text, cls = '') {
  const div = document.createElement('div');
  div.textContent = text;
  if (cls) div.className = cls;
  cmdOutput.appendChild(div);
  cmdOutput.scrollTop = cmdOutput.scrollHeight;
}

cmdInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const cmd = cmdInput.value.trim();
    cmdInput.value = '';
    if (cmd === '') return;
    addCmdOutput(`> ${cmd}`, 'cmd-echo');
    addCmdOutput('Error', 'cmd-error');
  }
});

// ================================================================
// リンク生成（サーバーと連携するように改造）
// ================================================================
const generateBtn = document.getElementById('generate-btn');
const copyBtn = document.getElementById('copy-btn');
const resultArea = document.getElementById('result-area');

let currentLink = '';

// サーバーにリンク生成をリクエスト（本物のIPロガー）
async function generateLink() {
  try {
    const res = await fetch('/generate');
    const data = await res.json();
    currentLink = data.link;

    resultArea.innerHTML = `
      <a href="#" class="link-display" id="generated-link">🔗 ${currentLink}</a>
      <span class="status-msg">✅ リンク生成完了！ コピーして相手に送信</span>
      <span class="warning">⚠ 自分で開くとテストになります（相手が開いた想定でIP表示）</span>
    `;

    copyBtn.style.display = 'inline-block';
    copyBtn.textContent = '📋 コピー';
    copyBtn.className = 'btn-copy';

    // 生成リンクをクリックしたら実際にそのリンクを開く（サーバーの /t/xxxxx にアクセス）
    document.getElementById('generated-link').addEventListener('click', function(e) {
      e.preventDefault();
      window.open(currentLink, '_blank');
    });

  } catch (err) {
    resultArea.innerHTML = `<span class="status-msg" style="color:#ff4444;">⚠️ リンク生成に失敗しました</span>`;
  }
}

generateBtn.addEventListener('click', generateLink);

// コピーボタン（そのまま）
copyBtn.addEventListener('click', () => {
  if (!currentLink) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(currentLink).then(() => {
      copyBtn.textContent = '✅ コピー完了！';
      copyBtn.className = 'btn-copy copy-success';
      setTimeout(() => {
        copyBtn.textContent = '📋 コピー';
        copyBtn.className = 'btn-copy';
      }, 2000);
    }).catch(() => fallbackCopy());
  } else {
    fallbackCopy();
  }
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
    setTimeout(() => {
      copyBtn.textContent = '📋 コピー';
      copyBtn.className = 'btn-copy';
    }, 2000);
  } catch (e) {
    alert('コピーに失敗しました。リンクを選択して手動でコピーしてください。');
  }
  document.body.removeChild(textarea);
}

// ================================================================
// ドラッグ＆リサイズ（そのまま）
// ================================================================
function makeDraggable(windowId, dragId, resizeId) {
  const win = document.getElementById(windowId);
  const drag = document.getElementById(dragId);
  const resize = document.getElementById(resizeId);

  let dragData = null;
  let resizeData = null;

  function startDrag(clientX, clientY) {
    const rect = win.getBoundingClientRect();
    dragData = { offsetX: clientX - rect.left, offsetY: clientY - rect.top };
    win.style.zIndex = 999;
    win.style.transition = 'none';
  }
  function moveDrag(clientX, clientY) {
    if (!dragData) return;
    win.style.left = (clientX - dragData.offsetX) + 'px';
    win.style.top = (clientY - dragData.offsetY) + 'px';
  }
  function endDrag() { dragData = null; win.style.zIndex = ''; win.style.transition = ''; }

  drag.addEventListener('mousedown', (e) => { startDrag(e.clientX, e.clientY); e.preventDefault(); });
  drag.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    startDrag(t.clientX, t.clientY);
    e.preventDefault();
  }, { passive: false });

  function startResize(clientX, clientY) {
    const rect = win.getBoundingClientRect();
    resizeData = { startX: clientX, startY: clientY, startW: rect.width, startH: rect.height };
    win.style.zIndex = 999;
    win.style.transition = 'none';
  }
  function moveResize(clientX, clientY) {
    if (!resizeData) return;
    let newW = resizeData.startW + (clientX - resizeData.startX);
    let newH = resizeData.startH + (clientY - resizeData.startY);
    if (newW < 300) newW = 300;
    if (newH < 200) newH = 200;
    win.style.width = newW + 'px';
    win.style.height = newH + 'px';
  }
  function endResize() { resizeData = null; win.style.zIndex = ''; win.style.transition = ''; }

  resize.addEventListener('mousedown', (e) => {
    startResize(e.clientX, e.clientY);
    e.preventDefault();
    e.stopPropagation();
  });
  resize.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    startResize(t.clientX, t.clientY);
    e.preventDefault();
    e.stopPropagation();
  }, { passive: false });

  document.addEventListener('mousemove', (e) => {
    if (dragData) moveDrag(e.clientX, e.clientY);
    if (resizeData) moveResize(e.clientX, e.clientY);
  });
  document.addEventListener('mouseup', () => {
    if (dragData) endDrag();
    if (resizeData) endResize();
  });
  document.addEventListener('touchmove', (e) => {
    const t = e.touches[0];
    if (dragData) moveDrag(t.clientX, t.clientY);
    if (resizeData) moveResize(t.clientX, t.clientY);
    e.preventDefault();
  }, { passive: false });
  document.addEventListener('touchend', () => {
    if (dragData) endDrag();
    if (resizeData) endResize();
  });
}

makeDraggable('cmd-window', 'cmd-drag', 'cmd-resize');
makeDraggable('menu-window', 'menu-drag', 'menu-resize');

// ================================================================
// 画面端対策 & フォーカス
// ================================================================
function clampWindows() {
  document.querySelectorAll('.window').forEach(win => {
    const rect = win.getBoundingClientRect();
    const maxW = window.innerWidth - 20;
    const maxH = window.innerHeight - 20;
    if (rect.width > maxW) win.style.width = maxW + 'px';
    if (rect.height > maxH) win.style.height = maxH + 'px';
    if (rect.left < 0) win.style.left = '10px';
    if (rect.top < 0) win.style.top = '10px';
  });
}
window.addEventListener('resize', clampWindows);

document.addEventListener('click', (e) => {
  if (!e.target.closest('#menu-window input')) {
    cmdInput.focus();
  }
});
</script>
</body>
</html>`;

// ================================================================
// サーバーサイドのルーティング
// ================================================================

// トップページ（君のHTMLを表示）
app.get('/', (req, res) => {
  res.send(HTML);
});

// リンク生成（本物のリンクをJSONで返す）
app.get('/generate', (req, res) => {
  const id = generateId();
  const link = `https://${req.get('host')}/t/${id}`;
  res.json({ link });
});

// トラップリンク（IPを記録して「特定されました」を表示）
app.get('/t/:id', (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'IP不明';
  const time = new Date().toLocaleString('ja-JP');
  logs.push({ id: req.params.id, ip: ip, time: time });
  console.log(`[アクセス] ID: ${req.params.id}, IP: ${ip}`);

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

// ログ確認（自分用）
app.get('/logs', (req, res) => {
  if (logs.length === 0) {
    return res.send('<h2>まだアクセスなし</h2><a href="/">戻る</a>');
  }
  let html = '<h2>アクセスログ</h2><table border="1"><tr><th>時間</th><th>IP</th><th>リンクID</th></tr>';
  logs.reverse().forEach(log => {
    html += `<tr><td>${log.time}</td><td>${log.ip}</td><td>${log.id}</td></tr>`;
  });
  html += '</table><a href="/">戻る</a>';
  res.send(html);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
