const { jsPDF } = window.jspdf;

const STORAGE_KEY = "FMD_INSCRITOS_V3";
const AUTH_KEY = "FMD_COORD_AUTH_V3";
const COORD_USER = "coordenacao";
const COORD_PASS = "FMD2026";
const LOGO_PATH = "logo-fmd.png";

/* ---------------------------
   MODAL
--------------------------- */
function openModal(){
  document.getElementById("modal").classList.add("open");
  document.body.style.overflow = "hidden";
  hideToast();
  setTimeout(()=>document.querySelector("input[name='companhia']")?.focus(), 80);
}
function closeModal(){
  document.getElementById("modal").classList.remove("open");
  document.body.style.overflow = "";
  hideToast();
}
document.addEventListener("keydown", (e)=>{
  if(e.key === "Escape") closeModal();
});

/* ---------------------------
   TOAST
--------------------------- */
function showToast(msg){
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.style.display = "block";
}
function hideToast(){
  const t = document.getElementById("toast");
  t.style.display = "none";
}

/* ---------------------------
   STORAGE
--------------------------- */
function readList(){
  try{ return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch{ return []; }
}
function writeList(list){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

/* ---------------------------
   PDF (logo topo direito)
--------------------------- */
function loadImage(url){
  return new Promise((resolve, reject)=>{
    const img = new Image();
    img.onload = ()=>resolve(img);
    img.onerror = ()=>reject(new Error("logo not found"));
    img.src = url;
  });
}

async function gerarPDF(d){
  const pdf = new jsPDF({ unit:"pt", format:"a4" });
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();

  // faixa roxa
  pdf.setFillColor(124, 44, 255);
  pdf.rect(0, 0, W, 92, "F");

  // titulo
  pdf.setTextColor(255,255,255);
  pdf.setFont("helvetica","bold");
  pdf.setFontSize(18);
  pdf.text("FMD • Festival Manacá Dance", 40, 44);
  pdf.setFont("helvetica","normal");
  pdf.setFontSize(12);
  pdf.text("FICHA DE INSCRIÇÃO — LIVRE (MUSICAL)", 40, 68);

  // logo topo direito (se existir)
  try{
    const img = await loadImage(LOGO_PATH);
    // tenta PNG; se sua logo for JPG, ainda funciona em muitos browsers,
    // mas o ideal é PNG.
    pdf.addImage(img, "PNG", W - 130, 18, 90, 56);
  } catch(e){
    // segue sem travar
  }

  // corpo
  pdf.setTextColor(25,25,25);
  pdf.setFont("helvetica","bold");
  pdf.setFontSize(13);
  pdf.text("DADOS DA INSCRIÇÃO", 40, 130);

  pdf.setFont("helvetica","normal");
  pdf.setFontSize(11);

  const fields = [
    ["Companhia", d.companhia],
    ["Responsável", d.responsavel],
    ["WhatsApp", d.whats],
    ["E-mail", d.email || "-"],
    ["Espetáculo / Musical", d.titulo],
    ["Fogos frios", d.fogos],
    ["IA na trilha", d.ia],
    ["Materiais cênicos", d.materiais || "-"],
  ];

  let y = 155;
  for(const [k,v] of fields){
    pdf.setFont("helvetica","bold");
    pdf.text(`${k}:`, 40, y);
    pdf.setFont("helvetica","normal");
    const wrap = pdf.splitTextToSize(String(v ?? ""), W - 220);
    pdf.text(wrap, 200, y);
    y += Math.max(18, wrap.length * 14);
  }

  // resumo box
  y += 10;
  pdf.setFont("helvetica","bold");
  pdf.text("Resumo (5–10 linhas)", 40, y);
  y += 10;

  pdf.setDrawColor(124,44,255);
  pdf.setFillColor(248,246,255);
  pdf.roundedRect(40, y, W - 80, 170, 10, 10, "FD");

  pdf.setFont("helvetica","normal");
  pdf.setTextColor(35,35,35);
  const resumo = pdf.splitTextToSize(String(d.resumo || ""), W - 104);
  pdf.text(resumo, 52, y + 22);

  // rodapé
  pdf.setTextColor(120,120,120);
  pdf.setFontSize(10);
  pdf.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 40, H - 28);

  const safe = String(d.companhia || "FMD").replace(/[^\w\d-]+/g,"_").slice(0,40);
  pdf.save(`FMD_Ficha_${safe}.pdf`);
}

/* ---------------------------
   SUBMIT INSCRIÇÃO
--------------------------- */
document.getElementById("form").addEventListener("submit", async (e)=>{
  e.preventDefault();

  const data = Object.fromEntries(new FormData(e.target).entries());

  showToast("Gerando PDF…");
  await gerarPDF(data);

  // salva para painel interno
  const list = readList();
  list.push({
    data: new Date().toLocaleString("pt-BR"),
    companhia: data.companhia,
    responsavel: data.responsavel,
    whats: data.whats,
    titulo: data.titulo
  });
  writeList(list);

  showToast("SEJA BEM-VINDO AO ESPETÁCULO");

  e.target.reset();
  setTimeout(()=>closeModal(), 2200);
});

/* ---------------------------
   COORDENAÇÃO
--------------------------- */
function isAuthed(){
  return localStorage.getItem(AUTH_KEY) === "1";
}

function ativarCoordenacao(ev){
  if(ev) ev.preventDefault();
  refreshCoordUI();
  location.hash = "#coordenacao";
}

function setCoordError(msg){
  const el = document.getElementById("coordErr");
  el.textContent = msg || "";
  el.style.display = msg ? "block" : "none";
}

function escHTML(s){
  return String(s ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}

function loadCoordTable(){
  const body = document.getElementById("coordBody");
  const status = document.getElementById("coordStatus");
  const rows = readList().slice().reverse();

  status.textContent = `Total: ${rows.length}`;
  body.innerHTML = "";

  rows.forEach(r=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escHTML(r.data)}</td>
      <td>${escHTML(r.companhia)}</td>
      <td>${escHTML(r.responsavel)}</td>
      <td>${escHTML(r.whats)}</td>
      <td>${escHTML(r.titulo)}</td>
    `;
    body.appendChild(tr);
  });
}

function refreshCoordUI(){
  const loginBox = document.getElementById("coordLoginBox");
  const panel = document.getElementById("coordPanel");

  if(isAuthed()){
    loginBox.style.display = "none";
    panel.style.display = "block";
    loadCoordTable();
  } else {
    loginBox.style.display = "block";
    panel.style.display = "none";
  }
}

function loginCoord(e){
  if(e) e.preventDefault();

  const u = (document.getElementById("coordUser").value || "").trim().toLowerCase();
  const p = (document.getElementById("coordPass").value || "").trim();

  if(u === COORD_USER && p === COORD_PASS){
    localStorage.setItem(AUTH_KEY, "1");
    setCoordError("");
    refreshCoordUI();
  } else {
    setCoordError("Login ou senha inválidos");
  }
}

function logoutCoord(){
  localStorage.removeItem(AUTH_KEY);
  refreshCoordUI();
}

function reloadCoord(){
  refreshCoordUI();
}

function clearList(){
  if(confirm("Apagar a lista de inscritos deste navegador?")){
    localStorage.removeItem(STORAGE_KEY);
    loadCoordTable();
  }
}

function downloadCSV(){
  const rows = readList();
  const cols = ["data","companhia","responsavel","whats","titulo"];
  const escCSV = v => `"${String(v ?? "").replace(/"/g,'""')}"`;
  const head = cols.join(",");
  const body = rows.map(r => cols.map(c => escCSV(r[c])).join(",")).join("\n");
  const csv = head + "\n" + body;

  const blob = new Blob([csv], { type:"text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "inscritos-fmd.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

/* Inicia painel conforme auth */
refreshCoordUI();

/* ---------------------------
   FUNDO: REDES CONECTADAS
--------------------------- */
const canvas = document.getElementById("bg");
const ctx = canvas.getContext("2d");

let W = 0, H = 0;
function resize(){
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

const points = Array.from({length: 110}, () => ({
  x: Math.random()*W,
  y: Math.random()*H,
  vx: (Math.random() - 0.5) * 0.55,
  vy: (Math.random() - 0.5) * 0.55,
}));

function draw(){
  ctx.clearRect(0,0,W,H);

  // brilho suave
  ctx.fillStyle = "rgba(0,0,0,0.08)";
  ctx.fillRect(0,0,W,H);

  for(let i=0;i<points.length;i++){
    const p = points[i];

    p.x += p.vx;
    p.y += p.vy;

    if(p.x < 0 || p.x > W) p.vx *= -1;
    if(p.y < 0 || p.y > H) p.vy *= -1;

    // pontos
    ctx.fillStyle = "rgba(124,44,255,0.9)";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2, 0, Math.PI*2);
    ctx.fill();

    // ligações
    for(let j=i+1;j<points.length;j++){
      const q = points[j];
      const d = Math.hypot(p.x - q.x, p.y - q.y);

      if(d < 140){
        const a = (1 - d/140) * 0.55;
        ctx.strokeStyle = `rgba(124,44,255,${a})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
        ctx.stroke();
      }
    }
  }

  requestAnimationFrame(draw);
}
draw();
