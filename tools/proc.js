// Ride Log refresh: runs inside a ridewithgps.com page (signed in).
// Usage in the page: await window.__arsRefresh("2026-11-07T00:00:00")
// Returns a JSON string: {user, n, trips:[{...summary fields, res:{...}}]} for every trip departed on/after `since`.
window.__arsRefresh = async function (since) {
  const me = await (await fetch('/users/current.json', { credentials: 'include' })).json();
  if (!me.user) throw new Error('NOT_SIGNED_IN');
  const uid = me.user.id;
  const list = await (await fetch(`/users/${uid}/trips.json?offset=0&limit=200`, { credentials: 'include' })).json();
  const m = new Map(); list.forEach(t => m.set(t.id, t));
  const trips = [...m.values()].filter(t => t.departed_at >= since);
  function enc(coords) { let out = '', pl = 0, pg = 0; const e = v => { v = v < 0 ? ~(v << 1) : (v << 1); let s = ''; while (v >= 0x20) { s += String.fromCharCode((0x20 | (v & 0x1f)) + 63); v >>= 5; } return s + String.fromCharCode(v + 63); };
    for (const [la, ln] of coords) { const a = Math.round(la * 1e5), b = Math.round(ln * 1e5); out += e(a - pl) + e(b - pg); pl = a; pg = b; } return out; }
  function pick(arr, n) { if (arr.length <= n) return arr; const o = []; for (let i = 0; i < n; i++) o.push(arr[Math.round(i * (arr.length - 1) / (n - 1))]); return o; }
  // Douglas-Peucker in meters (1.5 m tolerance): keeps every real bend in the road, drops redundant points
  function dp(P, eps) { const n = P.length; if (n < 3) return P; const k = new Uint8Array(n); k[0] = k[n - 1] = 1; const st = [[0, n - 1]]; while (st.length) { const [a, b] = st.pop(); const [x1, y1] = P[a], [x2, y2] = P[b]; const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1e-9; let best = -1, bi = -1; for (let i = a + 1; i < b; i++) { const d = Math.abs(dy * (P[i][0] - x1) - dx * (P[i][1] - y1)) / L; if (d > best) { best = d; bi = i; } } if (best > eps) { k[bi] = 1; st.push([a, bi], [bi, b]); } } return P.filter((_, i) => k[i]); }
  function proc(j) {
    const tp = (j.track_points || []).filter(p => p.t != null).sort((a, b) => a.t - b.t);
    const geo = tp.filter(p => p.x != null && p.y != null); const r = {};
    if (geo.length > 1) { const lat0 = geo[0].y * Math.PI / 180, kx = 111320 * Math.cos(lat0), ky = 110540; r.dpoly = enc(dp(geo.map(p => [p.x * kx, p.y * ky, p]), 1.5).map(q => [q[2].y, q[2].x])); }
    if (tp.some(p => p.p != null)) { const ps = []; for (let i = 0; i < tp.length; i++) { const p = tp[i].p || 0; const dt = i < tp.length - 1 ? Math.min(Math.max(tp[i + 1].t - tp[i].t, 1), 10) : 1; for (let k = 0; k < dt; k++) ps.push(p); }
      let s = 0, s4 = 0, c = 0; const w = 30; for (let i = 0; i < ps.length; i++) { s += ps[i]; if (i >= w) s -= ps[i - w]; if (i >= w - 1) { s4 += Math.pow(s / w, 4); c++; } }
      r.np = c ? Math.round(Math.pow(s4 / c, 0.25)) : null; r.kj = Math.round(ps.reduce((a, b) => a + b, 0) / 1000);
      const pref = [0]; for (const v of ps) pref.push(pref[pref.length - 1] + v);
      r.pc = {}; for (const d of [5, 15, 30, 60, 300, 1200, 3600]) { if (ps.length < d) continue; let b = 0; for (let i = d; i < pref.length; i++) { const a = (pref[i] - pref[i - d]) / d; if (a > b) b = a; } r.pc[d] = Math.round(b); } }
    const N = Math.min(300, tp.length); if (N > 2) { const D = { t: [], d: [], e: [], s: [], p: [], h: [], c: [], T: [] }; const B = tp.length / N;
      for (let b = 0; b < N; b++) { const seg = tp.slice(Math.floor(b * B), Math.max(Math.floor((b + 1) * B), Math.floor(b * B) + 1)); const av = k => { const v = seg.map(p => p[k]).filter(v => v != null); return v.length ? v.reduce((a, c) => a + c, 0) / v.length : null; };
        const f = seg[0], l = seg[seg.length - 1]; D.t.push(f.t - tp[0].t); D.d.push(l.d != null ? Math.round(l.d) : null); const e = av('e'); D.e.push(e != null ? Math.round(e * 10) / 10 : null);
        const sp = av('s'); D.s.push(sp != null ? Math.round(sp * 100) / 100 : null); for (const k of ['p', 'h', 'c', 'T']) { const v = av(k); D[k].push(v != null ? Math.round(v) : null); } }
      for (const k of Object.keys(D)) if (D[k].every(v => v == null)) delete D[k]; r.det = D; }
    return r; }
  const keep = ['id','name','departed_at','duration','moving_time','distance','elevation_gain','elevation_loss','avg_speed','max_speed','avg_hr','max_hr','avg_cad','avg_watts','max_watts','calories','locality','is_stationary','source_type','activity_category_id','fit_sport','fit_sub_sport','gear_id'];
  const out = [];
  for (const t of trips) { const o = {}; keep.forEach(k => { if (t[k] != null && t[k] !== '') o[k] = t[k]; });
    try { const j = await (await fetch(`/trips/${t.id}.json`, { credentials: 'include' })).json(); o.res = proc(j); } catch (e) { o.res = {}; o.err = String(e); }
    out.push(o); }
  return JSON.stringify({ user: uid, n: out.length, trips: out });
};
'ready';
