/* Bomba gialla 3D rotante: WebGL puro, nessuna libreria né servizio esterno.
 * Il countdown è scritto sulla bomba (etichetta su due lati opposti, così ce n'è sempre una visibile).
 * Lo stato arriva da window.__bombState = {d,h,m,s,closed}, aggiornato dallo script in index.html.
 * Se WebGL non è disponibile resta il disegno SVG già presente nella pagina. */
(function () {
  var box = document.getElementById('bomb');
  if (!box) return;
  var cv = document.createElement('canvas');
  var gl = cv.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: true });
  if (!gl) return;

  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var p2 = function (n) { return String(n).padStart(2, '0'); };

  /* ---------- shader ---------- */
  var VS = 'attribute vec3 aP,aN;attribute float aK;uniform mat4 uMVP;uniform mat3 uNM;' +
    'varying vec3 vN,vP;varying float vK;' +
    'void main(){vN=uNM*aN;vP=aP;vK=aK;gl_Position=uMVP*vec4(aP,1.);}';
  var FS = 'precision mediump float;varying vec3 vN,vP;varying float vK;uniform sampler2D uT;' +
    'void main(){' +
    ' vec3 N=normalize(vN);vec3 L=normalize(vec3(-.5,.7,.8));vec3 H=normalize(L+vec3(0.,0.,1.));' +
    ' float df=max(dot(N,L),0.);float sp=pow(max(dot(N,H),0.),38.)*.55;float rim=pow(1.-max(N.z,0.),3.)*.18;' +
    ' vec3 base=vec3(.96,.82,.22);float lit=.5+.6*df;' +
    ' vec3 col=base*lit;' +
    ' if(vK>.5){' +
    '  float a=atan(vP.x,vP.z);' +
    '  float u=a/6.2831853*8.;float fu=fract(u);float du=min(fu,1.-fu);' +
    '  float w=(vP.y+.95)/1.7*5.;float fv=fract(w);float dv=min(fv,1.-fv);' +
    '  float g=max(1.-smoothstep(.025,.075,du),1.-smoothstep(.03,.09,dv));' +
    '  float pil=.88+.24*sin(3.14159*fu)*sin(3.14159*fv);' +
    '  col=mix(base*lit*pil,base*.5*lit,g);' +
    '  float psi=a-(a>=0.?3.14159265:-3.14159265);float sd=abs(a)<1.5707963?a:psi;' +
    '  float tx=sd/.9*.5+.5;float ty=(.52-vP.y)/1.1;' +
    '  vec2 q=vec2((tx-.5)*1.333,ty-.5);float d=length(max(abs(q)-vec2(.545,.38),0.))-.12;' +
    '  float m=1.-smoothstep(-.02,0.,d);' +
    '  vec4 t=texture2D(uT,vec2(tx,ty));' +
    '  vec3 panel=vec3(.99,.93,.58)*(.62+.45*df);' +
    '  panel=mix(panel,panel*.8,smoothstep(-.035,-.01,d));' +
    '  col=mix(col,panel,m*.95);' +
    '  col=mix(col,vec3(.23,.18,.17),t.a*m);' +
    ' }' +
    ' col+=sp+rim*vec3(1.,.95,.6);' +
    ' gl_FragColor=vec4(col,1.);}';

  function shader(type, src) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  }
  var vs = shader(gl.VERTEX_SHADER, VS), fs = shader(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return;
  var prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  /* ---------- geometria ---------- */
  var V = [], I = [];
  function pushV(p, n, k) { V.push(p[0], p[1], p[2], n[0], n[1], n[2], k); return V.length / 7 - 1; }

  function lathe(pts, seg, kind) {
    var base = V.length / 7, n = pts.length, i, j, nr = [];
    for (i = 0; i < n; i++) {
      var a = pts[Math.max(i - 1, 0)], b = pts[Math.min(i + 1, n - 1)];
      var dr = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dr, dy) || 1;
      nr.push([-dy / l, dr / l]);
    }
    for (i = 0; i < n; i++) for (j = 0; j <= seg; j++) {
      var f = j / seg * Math.PI * 2, s = Math.sin(f), c = Math.cos(f);
      pushV([pts[i][0] * s, pts[i][1], pts[i][0] * c], [nr[i][0] * s, nr[i][1], nr[i][0] * c], kind);
    }
    for (i = 0; i < n - 1; i++) for (j = 0; j < seg; j++) {
      var q = base + i * (seg + 1) + j, r = q + seg + 1;
      I.push(q, r, q + 1, q + 1, r, r + 1);
    }
  }

  var SEG = 64, body = [], k, f;
  for (k = 0; k <= 48; k++) { f = .45 + (Math.PI - .45) * k / 48; body.push([.78 * Math.sin(f), -.075 + .925 * Math.cos(f)]); }
  lathe(body, SEG, 1);
  lathe([[.34, 1.08], [.34, .74]], SEG, 0);
  lathe([[0, 1.6], [.18, 1.59], [.34, 1.54], [.43, 1.44], [.45, 1.3], [.45, 1.16], [.42, 1.1], [.34, 1.08]], SEG, 0);

  /* leva: nastro curvo lungo il fianco destro */
  var ctrl = [[-.05, 1.50], [.15, 1.52], [.5, 1.55], [.78, 1.32], [.86, .9], [.85, .4], [.82, 0], [.8, -.12]];
  function cr(p0, p1, p2, p3, t) {
    var t2 = t * t, t3 = t2 * t;
    return [0, 1].map(function (c) { return .5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3); });
  }
  var path = [];
  for (k = 0; k < ctrl.length - 1; k++) for (var s = 0; s < 8; s++)
    path.push(cr(ctrl[Math.max(k - 1, 0)], ctrl[k], ctrl[k + 1], ctrl[Math.min(k + 2, ctrl.length - 1)], s / 8));
  path.push(ctrl[ctrl.length - 1]);
  var TH = .045, HW = .10, rows = [];
  path.forEach(function (p, i) {
    var a = path[Math.max(i - 1, 0)], b = path[Math.min(i + 1, path.length - 1)];
    var tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1, nx = -ty / l, ny = tx / l;
    rows.push({ p: p, n: [nx, ny] });
  });
  /* quattro lati del nastro: esterno, interno, +z, -z */
  [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (side, si) {
    var ids = [];
    rows.forEach(function (r) {
      var sx = r.n[0], sy = r.n[1], px = r.p[0], py = r.p[1], A, B, N;
      if (si < 2) { var sg = side[0]; N = [sx * sg, sy * sg, 0]; A = [px + sx * sg * TH, py + sy * sg * TH, HW]; B = [px + sx * sg * TH, py + sy * sg * TH, -HW]; }
      else { var z = side[1]; N = [0, 0, z]; A = [px + sx * TH, py + sy * TH, z * HW]; B = [px - sx * TH, py - sy * TH, z * HW]; }
      ids.push([pushV(A, N, 0), pushV(B, N, 0)]);
    });
    for (var i = 0; i < ids.length - 1; i++) I.push(ids[i][0], ids[i][1], ids[i + 1][0], ids[i + 1][0], ids[i][1], ids[i + 1][1]);
  });

  var vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(V), gl.STATIC_DRAW);
  var ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(I), gl.STATIC_DRAW);
  function attr(name, size, off) {
    var l = gl.getAttribLocation(prog, name);
    gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, size, gl.FLOAT, false, 28, off * 4);
  }
  attr('aP', 3, 0); attr('aN', 3, 3); attr('aK', 1, 6);

  /* ---------- etichetta con il countdown (texture 2D) ---------- */
  var tc = document.createElement('canvas'); tc.width = 512; tc.height = 384;
  var cx = tc.getContext('2d');
  var tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.uniform1i(gl.getUniformLocation(prog, 'uT'), 0);

  function label() {
    var st = window.__bombState || { d: 0, h: 0, m: 0, s: 0, closed: false };
    var serif = '"Cormorant Garamond",Georgia,serif', sans = 'Jost,system-ui,sans-serif';
    cx.clearRect(0, 0, 512, 384);
    cx.fillStyle = '#3a2f2d'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
    if (st.closed) {
      cx.font = '700 70px ' + serif; cx.fillText('La pagina', 256, 140); cx.fillText('è chiusa', 256, 220);
      cx.font = '500 27px ' + sans; cx.fillText('Grazie di cuore', 256, 315);
    } else {
      cx.font = '600 27px ' + sans;
      if ('letterSpacing' in cx) cx.letterSpacing = '3px';
      cx.fillText('LA PAGINA CHIUDE TRA', 256, 80);
      if ('letterSpacing' in cx) cx.letterSpacing = '0px';
      var v = [st.d, st.h, st.m, st.s], l = ['gg', 'ore', 'min', 'sec'];
      for (var i = 0; i < 4; i++) {
        var x = 88 + i * 112;
        cx.font = '700 88px ' + serif; cx.fillText(p2(v[i]), x, 190);
        cx.font = '500 22px ' + sans; cx.fillText(l[i].toUpperCase(), x, 246);
      }
      cx.font = '500 25px ' + sans; cx.fillText('Grazie per la visita', 256, 316);
    }
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tc);
  }
  window.bombUpdate = label;

  /* ---------- matrici ---------- */
  function ident() { return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); }
  function mul(a, b) {
    var o = new Float32Array(16);
    for (var c = 0; c < 4; c++) for (var r = 0; r < 4; r++) { var s = 0; for (var k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; }
    return o;
  }
  function trans(x, y, z) { var o = ident(); o[12] = x; o[13] = y; o[14] = z; return o; }
  function rotY(a) { var o = ident(), c = Math.cos(a), s = Math.sin(a); o[0] = c; o[2] = -s; o[8] = s; o[10] = c; return o; }
  function rotX(a) { var o = ident(), c = Math.cos(a), s = Math.sin(a); o[5] = c; o[6] = s; o[9] = -s; o[10] = c; return o; }
  function persp(fov, asp, n, fa) {
    var t = 1 / Math.tan(fov / 2), o = new Float32Array(16);
    o[0] = t / asp; o[5] = t; o[10] = (fa + n) / (n - fa); o[11] = -1; o[14] = 2 * fa * n / (n - fa); return o;
  }

  var uMVP = gl.getUniformLocation(prog, 'uMVP'), uNM = gl.getUniformLocation(prog, 'uNM');
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  function size() {
    var w = box.clientWidth, h = box.clientHeight;
    if (!w || !h) return;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    gl.viewport(0, 0, cv.width, cv.height);
  }

  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0, 0, 0, 0);

  function frame(ms) {
    /* un giro ogni 9 secondi, più lento quando l'etichetta guarda lo spettatore */
    var th = reduce ? 0 : ms / 1000 * Math.PI * 2 / 9;
    var ang = reduce ? .35 : th - .45 * Math.sin(2 * th);
    var R = mul(rotX(.2), rotY(ang));
    var asp = cv.width / cv.height || .68;
    var M = mul(mul(persp(28 * Math.PI / 180, asp, 1, 20), trans(0, 0, -6.6)), mul(R, trans(0, -.3, 0)));
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniformMatrix4fv(uMVP, false, M);
    gl.uniformMatrix3fv(uNM, false, new Float32Array([R[0], R[1], R[2], R[4], R[5], R[6], R[8], R[9], R[10]]));
    gl.drawElements(gl.TRIANGLES, I.length, gl.UNSIGNED_SHORT, 0);
    requestAnimationFrame(frame);
  }

  function start() {
    box.appendChild(cv);
    box.classList.add('gl');
    size(); label();
    window.addEventListener('resize', size);
    requestAnimationFrame(frame);
  }
  /* aspetta i caratteri del sito prima di scrivere l'etichetta */
  if (document.fonts && document.fonts.load) {
    Promise.all([document.fonts.load('700 88px "Cormorant Garamond"'), document.fonts.load('600 27px Jost')]).then(start, start);
  } else start();
})();
