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

function esc(str){
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function chipDelta(delta){
  const span = document.createElement("span");
  span.className = "chip delta " + (delta > 0 ? "up" : delta < 0 ? "down" : "flat");
  span.textContent = delta > 0 ? `▲ ${delta}` : delta < 0 ? `▼ ${Math.abs(delta)}` : "— 0";
  return span;
}

/* =========================
   POWER RANKINGS
========================= */
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

/* =========================
   STANDINGS (dropdown sort)
========================= */
async function renderStandings(){
  const s = await loadJSON("data/standings.json");
  document.getElementById("sUpdated").textContent = s.last_updated || "—";

  const tbody = document.getElementById("standingsBody");
  const dropdowns = Array.from(document.querySelectorAll(".sort-dd"));

  // Preserve original order for "none"
  const original = (s.teams || []).map((t, i) => ({ ...t, __idx: i }));
  let current = original.slice();

  function toNum(v){
    const n = Number(String(v ?? "").replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(n) ? n : null;
  }

  function recordValue(rec){
    // Convert "9-5" into win%
    if(!rec) return null;
    const m = String(rec).match(/(\d+)\s*-\s*(\d+)/);
    if(!m) return null;
    const w = Number(m[1]), l = Number(m[2]);
    const games = w + l;
    if(!games) return null;
    return w / games;
  }

  function getComparable(t, key){
    if(key === "rank") return t.__idx;
    if(key === "team") return String(t.team || "").toLowerCase();
    if(key === "record") return recordValue(t.record);
    if(key === "points_for") return toNum(t.points_for);
    if(key === "points_against") return toNum(t.points_against);
    if(key === "Championships") return toNum(t.Championships ?? 0);
    return t[key];
  }

  function renderRows(list){
    tbody.innerHTML = "";

    list.forEach((t, idx)=>{
      const champs = toNum(t.Championships ?? 0);

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td><b>${esc(t.team)}</b></td>
        <td>${t.record ? esc(t.record) : "—"}</td>
        <td>${t.points_for != null ? Number(t.points_for).toFixed(1) : "—"}</td>
        <td>${t.points_against != null ? Number(t.points_against).toFixed(1) : "—"}</td>
        <td class="champ-cell">${champs == null ? "—" : champs}</td>
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

      // null/blank always bottom
      const aNull = (av === null || av === undefined || av === "");
      const bNull = (bv === null || bv === undefined || bv === "");
      if(aNull && bNull) return 0;
      if(aNull) return 1;
      if(bNull) return -1;

      // string compare
      if(typeof av === "string" || typeof bv === "string"){
        return String(av).localeCompare(String(bv)) * factor;
      }

      // numeric compare
      return (av - bv) * factor;
    });

    // Special case: "rank" asc should be original order, desc should reverse
    if(key === "rank"){
      current = original.slice();
      if(dir === "desc") current.reverse();
    }

    renderRows(current);
  }

  // Hook dropdowns
  dropdowns.forEach(dd => {
    dd.addEventListener("change", () => {
      const key = dd.dataset.key;
      const dir = dd.value;

      // One active sorter at a time
      dropdowns.forEach(other => {
        if(other !== dd) other.value = "none";
      });

      applySort(key, dir);
    });
  });

  // Initial render
  renderRows(current);
}

/* =========================
   HISTORY
========================= */
async function renderHistory(){
  const h = await loadJSON("data/history.json");
  document.getElementById("hRange").textContent = h.seasons || "—";

  const champBody = document.getElementById("champBody");
  champBody.innerHTML = "";
  (h.champions || []).forEach(c=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${esc(c.year)}</td>
      <td><b>${esc(c.champion)}</b></td>
      <td>${c.runner_up ? esc(c.runner_up) : "—"}</td>
      <td>${c.score ? esc(c.score) : "—"}</td>
      <td>${c.note ? esc(c.note) : ""}</td>
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
          <div class="muted" style="font-size:12px;">${esc(a.label)}</div>
          <div style="font-weight:900;font-size:16px;margin-top:4px;">${esc(a.winner)}</div>
          <div class="muted" style="font-size:12px;margin-top:4px;">${a.detail ? esc(a.detail) : ""}</div>
        </div>
        <div class="chip">${a.year ? esc(a.year) : ""}</div>
      </div>
    `;
    awards.appendChild(card);
  });
}

/* =========================
   TEAMS
========================= */
async function renderTeams(){
  const t = await loadJSON("data/teams.json");
  const wrap = document.getElementById("teamsGrid");
  wrap.innerHTML = "";

  (t.teams || []).forEach(team=>{
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h2 style="margin:0 0 6px;">${esc(team.team_name)}</h2>
      <div class="muted" style="font-size:12px;">Manager: <b>${team.manager ? esc(team.manager) : "—"}</b></div>
      <div class="muted" style="font-size:12px;margin-top:2px;">Division: <b>${team.division ? esc(team.division) : "—"}</b></div>
      <div style="margin-top:10px;white-space:pre-wrap;line-height:1.35;">${team.bio ? esc(team.bio) : "Bio coming soon."}</div>
    `;
    wrap.appendChild(card);
  });
}

/* =========================
   BOOT
========================= */
window.addEventListener("DOMContentLoaded", async ()=>{
  setActiveNav();
  const page = document.body.getAttribute("data-page");

  try{
    if(page === "index") await renderHomepageChampion();
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

async function renderHomepageChampion(){
  const h = await loadJSON("data/history.json");
  if(!h.champions || !h.champions.length) return;

  // Get most recent champion (assumes chronological order)
  const c = h.champions[h.champions.length - 1];

  const wrap = document.getElementById("championSpotlight");
  if(!wrap) return;

  wrap.innerHTML = `
    <section class="champ-card">
      <div class="champ-top">
        <div>
          <div class="champ-title">Defending Champion</div>
          <div class="champ-name">${c.champion}</div>
          <div class="champ-sub">
            ${c.year} • ${c.record || "—"}${c.points ? ` • ${c.points} PF` : ""}
          </div>
          ${c.note ? `<div class="muted" style="margin-top:6px;font-size:13px;">${c.note}</div>` : ""}
        </div>
        <div class="trophy">🏆</div>
      </div>
    </section>
  `;
}
