async function loadJSON(path){
  const res = await fetch(path, { cache: "no-store" });
  if(!res.ok) throw new Error(`Failed to load ${path}`);
  return await res.json();
}

function setActiveNav(){
  const here = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".link").forEach(a=>{
    const target = a.getAttribute("href");
    if(target === here) a.classList.add("active");
  });
}

function chipDelta(delta){
  const span = document.createElement("span");
  span.className = "chip delta " + (delta > 0 ? "up" : delta < 0 ? "down" : "flat");
  span.textContent = delta > 0 ? `▲ ${delta}` : delta < 0 ? `▼ ${Math.abs(delta)}` : "— 0";
  return span;
}

async function renderPower(){
  const pr = await loadJSON("data/power_rankings.json");
  document.getElementById("prWeek").textContent = pr.week ? `Week ${pr.week}` : "";
  document.getElementById("prUpdated").textContent = pr.last_updated || "—";

  const wrap = document.getElementById("prList");
  wrap.innerHTML = "";

  (pr.rankings || []).forEach(r=>{
    const row = document.createElement("div");
    row.className = "rank-row";

    const top = document.createElement("div");
    top.className = "rank-top";

    const name = document.createElement("div");
    name.className = "rank-name";
    name.textContent = `#${r.rank} — ${r.team}`;

    const right = document.createElement("div");
    right.style.display = "flex";
    right.style.gap = "8px";
    right.style.flexWrap = "wrap";
    right.appendChild(chipDelta(r.delta ?? 0));

    const rec = document.createElement("span");
    rec.className = "chip";
    rec.textContent = r.record ? `Record: ${r.record}` : "Record: —";
    right.appendChild(rec);

    top.appendChild(name);
    top.appendChild(right);

    const meta = document.createElement("div");
    meta.className = "rank-meta";
    meta.textContent =
      `PF: ${r.points_for ?? "—"}  •  PA: ${r.points_against ?? "—"}  •  ${r.streak ? `Streak: ${r.streak}` : "Streak: —"}`;

    const notes = document.createElement("div");
    notes.className = "rank-notes";
    notes.textContent = r.blurb || "(No notes yet.)";

    row.appendChild(top);
    row.appendChild(meta);
    row.appendChild(notes);

    wrap.appendChild(row);
  });
}

async function renderStandings(){
  const s = await loadJSON("data/standings.json");
  document.getElementById("sUpdated").textContent = s.last_updated || "—";

  const tbody = document.getElementById("standingsBody");
  const dropdowns = Array.from(document.querySelectorAll(".sort-dd"));

  // Keep original order so "none" can revert
  const original = (s.teams || []).map((t, i) => ({ ...t, __idx: i }));

  let current = original.slice(); // currently displayed order

  function recordValue(rec){
    // Convert "33-23" into win pct (or net wins). Win pct is safest.
    if(!rec) return null;
    const m = String(rec).match(/(\d+)\s*-\s*(\d+)/);
    if(!m) return null;
    const w = Number(m[1]), l = Number(m[2]);
    const games = w + l;
    if(!games) return null;
    return w / games; // win percentage
  }

  function toNum(v){
    const n = Number(String(v ?? "").replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(n) ? n : null;
  }

  function getComparable(t, key){
    if(key === "rank") return t.__idx;               // default ranking order
    if(key === "team") return (t.team || "").toLowerCase();

    if(key === "record") return recordValue(t.record);

    if(key === "points_for") return toNum(t.points_for);
    if(key === "points_against") return toNum(t.points_against);

    // EXACT key: "Championships"
    if(key === "Championships") return toNum(t.Championships ?? 0);

    // fallback if you add more later
    return t[key];
  }

  function renderRows(list){
    tbody.innerHTML = "";

    list.forEach((t, idx)=>{
      const champsRaw = t.Championships ?? 0;
      const champs = Number(champsRaw);

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td><b>${t.team}</b></td>
        <td>${t.record || "—"}</td>
        <td>${t.points_for != null ? Number(t.points_for).toFixed(1) : "—"}</td>
        <td>${t.points_against != null ? Number(t.points_against).toFixed(1) : "—"}</td>
        <td class="champ-cell">${Number.isFinite(champs) ? champs : "—"}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  function applySort(key, dir){
    if(dir === "none"){
      current = original.slice();
      renderRows(current);
      return;
    }

    const factor = dir === "asc" ? 1 : -1;

    current = original.slice().sort((a, b) => {
      const av = getComparable(a, key);
      const bv = getComparable(b, key);

      // Nulls always bottom
      const aNull = (av === null || av === undefined || av === "");
      const bNull = (bv === null || bv === undefined || bv === "");
      if(aNull && bNull) return 0;
      if(aNull) return 1;
      if(bNull) return -1;

      // String compare
      if(typeof av === "string" || typeof bv === "string"){
        return String(av).localeCompare(String(bv))

async function renderHistory(){
  const h = await loadJSON("data/history.json");
  document.getElementById("hRange").textContent = h.seasons || "—";

  const champBody = document.getElementById("champBody");
  champBody.innerHTML = "";
  (h.champions || []).forEach(c=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${c.year}</td>
      <td><b>${c.champion}</b></td>
      <td>${c.runner_up || "—"}</td>
      <td>${c.score || "—"}</td>
      <td>${c.note || ""}</td>
    `;
    champBody.appendChild(tr);
  });

  const awards = document.getElementById("awards");
  awards.innerHTML = "";
  (h.awards || []).forEach(a=>{
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap;">
        <div>
          <div class="muted" style="font-size:12px;">${a.label}</div>
          <div style="font-weight:900;font-size:16px;margin-top:4px;">${a.winner}</div>
          <div class="muted" style="font-size:12px;margin-top:4px;">${a.detail || ""}</div>
        </div>
        <div class="chip">${a.year || ""}</div>
      </div>
    `;
    awards.appendChild(card);
  });
}

async function renderTeams(){
  const t = await loadJSON("data/teams.json");
  const wrap = document.getElementById("teamsGrid");
  wrap.innerHTML = "";

  (t.teams || []).forEach(team=>{
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h2 style="margin:0 0 6px;">${team.team_name}</h2>
      <div class="muted" style="font-size:12px;">Manager: <b>${team.manager || "—"}</b></div>
      <div class="muted" style="font-size:12px;margin-top:2px;">Division: <b>${team.division || "—"}</b></div>
      <div style="margin-top:10px;white-space:pre-wrap;line-height:1.35;">${team.bio || "Bio coming soon."}</div>
    `;
    wrap.appendChild(card);
  });
}

window.addEventListener("DOMContentLoaded", async ()=>{
  setActiveNav();
  const page = document.body.getAttribute("data-page");
  try{
    if(page === "power") await renderPower();
    if(page === "standings") await renderStandings();
    if(page === "history") await renderHistory();
    if(page === "teams") await renderTeams();
  }catch(e){
    console.error(e);
    const box = document.getElementById("errorBox");
    if(box){
      box.style.display = "block";
      box.textContent = "Couldn’t load data files. Make sure you uploaded the /data and /assets folders exactly.";
    }
  }
});
