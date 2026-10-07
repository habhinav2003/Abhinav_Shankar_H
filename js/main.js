(function () {
  // ---- copy email ----
  var btn = document.getElementById('copyBtn');
  var emailEl = document.getElementById('email');
  btn.addEventListener('click', function () {
    var text = emailEl.textContent.trim();
    function selectFallback() {
      var r = document.createRange(); r.selectNodeContents(emailEl);
      var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
      btn.textContent = 'Selected, press Ctrl+C';
    }
    try {
      navigator.clipboard.writeText(text).then(function () {
        btn.textContent = 'Copied';
        setTimeout(function () { btn.textContent = 'Copy email'; }, 1800);
      }, selectFallback);
    } catch (e) { selectFallback(); }
  });

  // ---- 16-QAM constellation ----
  var canvas = document.getElementById('iq');
  var ctx = canvas.getContext('2d');
  var evmEl = document.getElementById('evm');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var levels = [-3, -1, 1, 3];
  var ideal = [];
  levels.forEach(function (i) { levels.forEach(function (q) { ideal.push([i, q]); }); });
  var pts = [];
  var MAX = 900;
  var colors = {};

  function readColors() {
    var cs = getComputedStyle(document.documentElement);
    colors.line = cs.getPropertyValue('--line').trim();
    colors.muted = cs.getPropertyValue('--muted').trim();
    colors.accent = cs.getPropertyValue('--accent').trim();
    colors.signal = cs.getPropertyValue('--signal').trim();
    colors.surface = cs.getPropertyValue('--surface').trim();
  }
  function gauss() {
    var u = 1 - Math.random(), v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  var phase = 0;
  function sample(n) {
    for (var k = 0; k < n; k++) {
      var p = ideal[(Math.random() * 16) | 0];
      var sigma = 0.16 + 0.05 * Math.sin(phase);
      var rot = 0.04 * Math.sin(phase * 0.7);
      var i = p[0] * Math.cos(rot) - p[1] * Math.sin(rot) + gauss() * sigma;
      var q = p[0] * Math.sin(rot) + p[1] * Math.cos(rot) + gauss() * sigma;
      pts.push({ i: i, q: q, ii: p[0], iq: p[1], age: 0 });
    }
    if (pts.length > MAX) pts.splice(0, pts.length - MAX);
  }
  function computeEvm() {
    var err = 0, ref = 0;
    pts.forEach(function (p) {
      err += (p.i - p.ii) * (p.i - p.ii) + (p.q - p.iq) * (p.q - p.iq);
      ref += p.ii * p.ii + p.iq * p.iq;
    });
    return ref ? Math.sqrt(err / ref) * 100 : 0;
  }
  function draw() {
    var W = 480, H = 480, pad = 34; // logical units; fitCanvas scales to device pixels
    var scale = (W - pad * 2) / 8.6;
    var cx = W / 2, cy = H / 2;
    ctx.fillStyle = colors.surface; ctx.fillRect(0, 0, W, H);
    // grid
    ctx.strokeStyle = colors.line; ctx.lineWidth = 1;
    for (var g = -4; g <= 4; g += 2) {
      ctx.beginPath(); ctx.moveTo(cx + g * scale, pad); ctx.lineTo(cx + g * scale, H - pad); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(pad, cy + g * scale); ctx.lineTo(W - pad, cy + g * scale); ctx.stroke();
    }
    // axes
    ctx.strokeStyle = colors.muted; ctx.globalAlpha = 0.6;
    ctx.beginPath(); ctx.moveTo(cx, pad - 6); ctx.lineTo(cx, H - pad + 6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pad - 6, cy); ctx.lineTo(W - pad + 6, cy); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = colors.muted; ctx.font = '13px "IBM Plex Mono", monospace';
    ctx.fillText('I', W - pad + 2, cy - 8);
    ctx.fillText('Q', cx + 8, pad - 10 > 12 ? pad - 10 : 14);
    // samples
    ctx.fillStyle = colors.accent;
    for (var n = 0; n < pts.length; n++) {
      var p = pts[n];
      ctx.globalAlpha = Math.max(0.12, 0.85 * (n / pts.length));
      ctx.beginPath();
      ctx.arc(cx + p.i * scale, cy - p.q * scale, 2.1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // ideal points
    ctx.strokeStyle = colors.signal; ctx.lineWidth = 2;
    ideal.forEach(function (p) {
      var x = cx + p[0] * scale, y = cy - p[1] * scale, s = 6;
      ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x + s, y); ctx.moveTo(x, y - s); ctx.lineTo(x, y + s); ctx.stroke();
    });
    evmEl.textContent = 'EVM ' + computeEvm().toFixed(1) + '% rms';
  }
  function fitCanvas() {
    var r = canvas.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var size = Math.max(200, Math.round(r.width * dpr));
    canvas.width = size; canvas.height = size;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // draw in a 480-unit space
    var k = size / 480;
    ctx.scale(k, k);
    canvas._logical = 480;
  }
  readColors();
  fitCanvas();
  sample(MAX);
  draw();

  var last = 0;
  function tick(t) {
    if (t - last > 40) {
      phase += 0.03;
      sample(14);
      draw();
      last = t;
    }
    requestAnimationFrame(tick);
  }
  if (!reduce) requestAnimationFrame(tick);

  window.addEventListener('resize', function () { fitCanvas(); draw(); });
  var mq = window.matchMedia('(prefers-color-scheme: dark)');
  var onTheme = function () { readColors(); draw(); };
  if (mq.addEventListener) mq.addEventListener('change', onTheme);
  new MutationObserver(onTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
})();
