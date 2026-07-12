const express = require('express');
const app = express();

const logs = [];

function generateId() {
  return Math.random().toString(36).substring(2, 10) +
         Math.random().toString(36).substring(2, 6);
}

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><title>IP Logger</title></head>
    <body style="background:#000;color:#fff;font-family:sans-serif;padding:40px;">
      <h1>📡 IPロガー</h1>
      <p>リンクを生成して相手に送信</p>
      <form action="/generate" method="GET">
        <button type="submit" style="background:#222;color:#88ddff;border:1px solid #88ddff;padding:10px 30px;font-size:16px;">リンク生成</button>
      </form>
      <div style="margin-top:30px;color:#666;font-size:13px;">
        <p>生成したリンクを相手に送ってください</p>
        <p>相手が開くとIPが記録されます</p>
      </div>
    </body>
    </html>
  `);
});

app.get('/generate', (req, res) => {
  const id = generateId();
  const link = `https://${req.get('host')}/t/${id}`;
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><title>リンク生成完了</title></head>
    <body style="background:#000;color:#fff;font-family:sans-serif;padding:40px;">
      <h1>✅ リンク生成完了</h1>
      <p style="word-break:break-all;color:#88ddff;font-size:18px;">🔗 ${link}</p>
      <p style="color:#888;font-size:13px;">このリンクを相手に送信してください</p>
      <p style="color:#888;font-size:13px;">相手が開くとIPが記録されます</p>
      <a href="/" style="color:#88ddff;">戻る</a>
    </body>
    </html>
  `);
});

app.get('/t/:id', (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'IP不明';
  const time = new Date().toLocaleString('ja-JP');
  logs.push({ id: req.params.id, ip: ip, time: time });
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
  let html = '<h2>アクセスログ</h2><table border="1"><tr><th>時間</th><th>IP</th></tr>';
  logs.reverse().forEach(log => {
    html += `<tr><td>${log.time}</td><td>${log.ip}</td></tr>`;
  });
  html += '</table><a href="/">戻る</a>';
  res.send(html);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
