/* Gestione consenso cookie — Filo & Pizzo
 * Conforme alle Linee guida cookie del Garante Privacy (10/06/2021):
 *  - nessun cookie non tecnico prima del consenso
 *  - "Rifiuta tutti" ben visibile quanto "Accetta tutti"
 *  - scelta conservata per 6 mesi, modificabile da "Gestisci cookie" nel footer
 *
 * Per attivare in futuro strumenti di analisi/marketing, inserire il loro caricamento
 * dentro onConsent() solo quando la categoria corrispondente è true.
 */
(function () {
  var KEY = 'fp_consent', MONTHS = 6;

  function read() {
    try {
      var c = JSON.parse(localStorage.getItem(KEY));
      if (!c || !c.ts || Date.now() - c.ts > MONTHS * 30 * 864e5) return null;
      return c;
    } catch (e) { return null; }
  }
  function save(stat, mkt) {
    var c = { v: 1, ts: Date.now(), necessary: true, statistics: !!stat, marketing: !!mkt };
    try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) {}
    onConsent(c);
    return c;
  }
  function onConsent(c) {
    window.dispatchEvent(new CustomEvent('fp:consent', { detail: c }));
    // if (c.statistics) { /* carica qui Google Analytics / Plausible ecc. */ }
    // if (c.marketing)  { /* carica qui Meta Pixel ecc. */ }
  }

  var css = '\
#fpc,#fpc *{box-sizing:border-box}\
#fpc{position:fixed;left:16px;right:16px;bottom:16px;z-index:1000;max-width:760px;margin:0 auto;background:#faf6f0;color:#3a2f2d;border:1px solid #e3d7c8;box-shadow:0 20px 60px rgba(58,47,45,.25);padding:24px 26px;font:300 .95rem/1.6 Jost,system-ui,sans-serif}\
#fpc h2{font:500 1.5rem/1.2 "Cormorant Garamond",Georgia,serif;margin-bottom:8px}\
#fpc p{color:#6d5f5b;margin-bottom:18px}\
#fpc a{text-decoration:underline;text-underline-offset:3px;color:#a96a66}\
#fpc .b{display:flex;gap:10px;flex-wrap:wrap}\
#fpc button{font:400 .76rem Jost,system-ui,sans-serif;letter-spacing:.16em;text-transform:uppercase;padding:13px 20px;border:1px solid #3a2f2d;background:transparent;color:#3a2f2d;cursor:pointer;flex:1 1 140px;transition:.25s}\
#fpc button:hover{background:#3a2f2d;color:#faf6f0}\
#fpc button.p{background:#3a2f2d;color:#faf6f0}\
#fpc button.p:hover{background:#a96a66;border-color:#a96a66}\
#fpc .opt{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;padding:14px 0;border-top:1px solid #e3d7c8}\
#fpc .opt label{display:block;text-transform:none;letter-spacing:0;font-size:inherit;color:inherit;cursor:pointer}\
#fpc .opt strong{font-weight:500;display:block}\
#fpc .opt label span{color:#6d5f5b;font-size:.86rem;display:block}\
#fpc .sw{position:relative;flex:none;width:46px;height:26px}\
#fpc .sw input{position:absolute;inset:0;opacity:0;margin:0;cursor:pointer;z-index:1}\
#fpc .sw i{position:absolute;inset:0;background:#d9cdbf;border-radius:26px;transition:.25s}\
#fpc .sw i::after{content:"";position:absolute;top:3px;left:3px;width:20px;height:20px;background:#fff;border-radius:50%;transition:.25s}\
#fpc .sw input:checked+i{background:#a96a66}\
#fpc .sw input:checked+i::after{transform:translateX(20px)}\
#fpc .sw input:disabled{cursor:not-allowed}\
#fpc .sw input:disabled+i{opacity:.55}\
#fpc .sw input:focus-visible+i{outline:2px solid #3a2f2d;outline-offset:2px}\
#fpc .list{margin:14px 0 20px;max-height:46vh;overflow:auto}\
@media(max-width:520px){#fpc{padding:20px 18px;left:10px;right:10px;bottom:10px}}';

  var root;
  function ensureStyle() {
    if (document.getElementById('fpc-css')) return;
    var s = document.createElement('style'); s.id = 'fpc-css'; s.textContent = css; document.head.appendChild(s);
  }
  function close() { if (root) { root.remove(); root = null; } }
  function mount(html) {
    ensureStyle(); close();
    root = document.createElement('div'); root.id = 'fpc';
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'false'); root.setAttribute('aria-labelledby', 'fpc-t');
    root.innerHTML = html; document.body.appendChild(root); return root;
  }

  function banner() {
    var r = mount(
      '<h2 id="fpc-t">Un po\' di rispetto per la tua privacy</h2>' +
      '<p>Questo sito usa cookie tecnici, necessari al suo funzionamento. Con il tuo consenso possiamo usare anche cookie statistici e di marketing. ' +
      'Puoi accettare, rifiutare o scegliere. Maggiori dettagli nella <a href="cookie.html">Cookie Policy</a> e nella <a href="privacy.html">Privacy Policy</a>.</p>' +
      '<div class="b"><button data-a="no">Rifiuta tutti</button><button data-a="cfg">Personalizza</button><button class="p" data-a="yes">Accetta tutti</button></div>');
    r.addEventListener('click', function (e) {
      var a = e.target.getAttribute && e.target.getAttribute('data-a');
      if (a === 'no') { save(false, false); close(); }
      else if (a === 'yes') { save(true, true); close(); }
      else if (a === 'cfg') prefs();
    });
    r.querySelector('button').focus({ preventScroll: true });
  }

  function opt(id, title, desc, on, locked) {
    return '<div class="opt"><label for="' + id + '"><strong>' + title + '</strong><span>' + desc + '</span></label>' +
      '<span class="sw"><input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + (locked ? ' disabled' : '') + '><i></i></span></div>';
  }
  function prefs() {
    var cur = read() || {};
    var r = mount(
      '<h2 id="fpc-t">Preferenze cookie</h2>' +
      '<div class="list">' +
      opt('fpc-n', 'Necessari', 'Indispensabili per il funzionamento del sito e per ricordare la tua scelta sui cookie. Non si possono disattivare.', true, true) +
      opt('fpc-s', 'Statistici', 'Ci aiutano a capire in forma aggregata come viene usato il sito. Al momento non ne usiamo.', cur.statistics) +
      opt('fpc-m', 'Marketing', 'Servono a mostrarti contenuti e annunci pertinenti. Al momento non ne usiamo.', cur.marketing) +
      '</div>' +
      '<div class="b"><button data-a="no">Rifiuta tutti</button><button data-a="sv" class="p">Salva le preferenze</button><button data-a="yes">Accetta tutti</button></div>');
    r.addEventListener('click', function (e) {
      var a = e.target.getAttribute && e.target.getAttribute('data-a');
      if (a === 'no') { save(false, false); close(); }
      else if (a === 'yes') { save(true, true); close(); }
      else if (a === 'sv') { save(r.querySelector('#fpc-s').checked, r.querySelector('#fpc-m').checked); close(); }
    });
    r.querySelector('input:not([disabled])').focus({ preventScroll: true });
  }

  window.FPConsent = { get: read, open: prefs };

  function init() {
    var c = read();
    if (c) onConsent(c); else banner();
    document.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('[data-cookie-settings]')) { e.preventDefault(); prefs(); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && root && read()) close();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
