/* ====== Colores por servicio ====== */
const SERVICE_STYLES = [
  {test:s=>s.includes('PSICOLOG'), name:'Psicología',  bg:'--svc-psico-bg', bd:'--svc-psico-bd', tx:'--svc-psico-tx'},
  {test:s=>s.includes('OBSTETR'),  name:'Obstetricia', bg:'--svc-obst-bg',  bd:'--svc-obst-bd',  tx:'--svc-obst-tx'},
  {test:s=>s.includes('ENFERMER') && !s.includes('TECNIC'), name:'Enfermería', bg:'--svc-enf-bg', bd:'--svc-enf-bd', tx:'--svc-enf-tx'},
  {test:s=>s.includes('MEDIC'),    name:'Medicina',    bg:'--svc-med-bg',   bd:'--svc-med-bd',   tx:'--svc-med-tx'},
  {test:s=>s.includes('ODONTOLOG'),name:'Odontología', bg:'--svc-odon-bg',  bd:'--svc-odon-bd',  tx:'--svc-odon-tx'},
  {test:s=>s.includes('NUTRICION'),name:'Nutrición',   bg:'--svc-nutri-bg', bd:'--svc-nutri-bd', tx:'--svc-nutri-tx'},
  {test:s=>s.includes('FARMACIA'), name:'Farmacia',    bg:'--svc-farm-bg',  bd:'--svc-farm-bd',  tx:'--svc-farm-tx'},
  {test:s=>s.includes('TECNIC'),   name:'Técnicos',    bg:'--svc-tec-bg',   bd:'--svc-tec-bd',   tx:'--svc-tec-tx'},
];
function serviceStyle(servicio){
  const s = String(servicio||'').toUpperCase();
  for(const st of SERVICE_STYLES){ if(st.test(s)) return st; }
  return {name: servicio||'(sin servicio)', bg:'--svc-otro-bg', bd:'--svc-otro-bd', tx:'--svc-otro-tx'};
}
function svcBadgeHtml(servicio){
  const st = serviceStyle(servicio);
  return `<span class="svc-badge" style="background:var(${st.bg});border-color:var(${st.bd});color:var(${st.tx})">`+
         `<span class="svc-dot" style="background:var(${st.bd})"></span>${servicio||'—'}</span>`;
}

/* ====== Utilidades ====== */
function normKey(k){ return String(k||'').toUpperCase().replace(/[^A-Z0-9]/g,''); }
function normCode(c){ return String(c||'').toUpperCase().replace(/[^A-Z0-9]/g,''); }
function todayISO(){
  const d = new Date();
  const tz = d.getTimezoneOffset()*60000;
  return new Date(d - tz).toISOString().slice(0,10);
}
function calcAge(birthISO, refISO){
  if(!birthISO || !refISO) return null;
  const b = new Date(birthISO+'T00:00:00Z');
  const r = new Date(refISO+'T00:00:00Z');
  if(isNaN(b) || isNaN(r)) return null;
  let age = r.getUTCFullYear() - b.getUTCFullYear();
  const m = r.getUTCMonth() - b.getUTCMonth();
  if(m < 0 || (m===0 && r.getUTCDate() < b.getUTCDate())) age--;
  return age >= 0 ? age : null;
}
function toDateInputValue(v){
  if(!v) return '';
  if(v instanceof Date && !isNaN(v)){
    return v.toISOString().slice(0,10);
  }
  const s = String(v).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(m) return m[0];
  return '';
}

/* ====== Estado ====== */
const FIELD_MAP = {
  EESS:'EESS', TIPODOC:'TIPODOC', NUMDOC:'NUMDOC', PACIENTE:'PACIENTE', FECHANAC:'FECHANAC',
  SEGURO:'SEGURO', CODIGO:'CODIGO', ITEM:'ITEM', SERVICIO:'SERVICIO',
  RHTIPODOC:'RHTIPODOC', RHNUMDOC:'RHNUMDOC', PERSONAL:'PERSONAL', PROFESION:'PROFESION'
};
const HEADER_ANCHOR = 'NUMDOC';

let patientLookup = {};
let personalIndex = [];
let codeLookup = {};
let dayRecords = [];
let codeRowSeq = 0;

/* ====== Autoguardado local (localStorage) ====== */
const LS_DAY_KEY = 'ratt_dayRecords_v1';
const LS_HIST_KEY = 'ratt_historial_v1';

function lsAvailable(){
  try{ const k='__ratt_test__'; localStorage.setItem(k,'1'); localStorage.removeItem(k); return true; }
  catch(e){ return false; }
}
const LS_OK = lsAvailable();

function saveDayRecords(){
  if(!LS_OK) return;
  try{ localStorage.setItem(LS_DAY_KEY, JSON.stringify(dayRecords)); }
  catch(e){ console.warn('No se pudo autoguardar la lista del día', e); }
}

function saveHistorial(fileName){
  if(!LS_OK) return;
  try{
    localStorage.setItem(LS_HIST_KEY, JSON.stringify({
      patientLookup, personalIndex, codeLookup, fileName, eess: eessInput.value, savedAt: new Date().toISOString()
    }));
  }catch(e){
    console.warn('El historial es muy grande para guardarlo en el dispositivo; deberás volver a subirlo la próxima vez.', e);
  }
}

function clearPersistedHistorial(){
  if(!LS_OK) return;
  try{ localStorage.removeItem(LS_HIST_KEY); }catch(e){}
}

function restorePersistedState(){
  if(!LS_OK) return;
  try{
    const rawDay = localStorage.getItem(LS_DAY_KEY);
    if(rawDay){
      const parsed = JSON.parse(rawDay);
      if(Array.isArray(parsed)) dayRecords = parsed;
    }
  }catch(e){ console.warn('No se pudo restaurar la lista del día guardada', e); }

  try{
    const rawHist = localStorage.getItem(LS_HIST_KEY);
    if(rawHist){
      const h = JSON.parse(rawHist);
      patientLookup = h.patientLookup || {};
      personalIndex = h.personalIndex || [];
      codeLookup = h.codeLookup || {};
      if(h.eess && !eessInput.value) eessInput.value = h.eess;
      rebuildPersonalList();
      rebuildCodeList();
      if(Object.keys(patientLookup).length){
        fileSummary.textContent = (h.fileName || 'Historial guardado') + ' — ' + Object.keys(patientLookup).length.toLocaleString('es-PE') + ' pacientes, ' + personalIndex.length + ' personal, ' + Object.keys(codeLookup).length.toLocaleString('es-PE') + ' códigos distintos (guardado en este dispositivo)';
        fileStatus.classList.add('show');
      }
    }
  }catch(e){ console.warn('No se pudo restaurar el historial guardado', e); }

  renderDayList();
}

/* ====== Carga y parseo del historial ====== */
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const fileStatus = document.getElementById('fileStatus');
const fileSummary = document.getElementById('fileSummary');
const clearFileBtn = document.getElementById('clearFileBtn');

dropzone.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('keydown', e => { if(e.key==='Enter'||e.key===' ') fileInput.click(); });
['dragover','dragenter'].forEach(ev => dropzone.addEventListener(ev, e=>{e.preventDefault();dropzone.classList.add('drag');}));
['dragleave','drop'].forEach(ev => dropzone.addEventListener(ev, e=>{e.preventDefault();dropzone.classList.remove('drag');}));
dropzone.addEventListener('drop', e=>{ if(e.dataTransfer.files[0]) handleHistFile(e.dataTransfer.files[0]); });
fileInput.addEventListener('change', e=>{ if(e.target.files[0]) handleHistFile(e.target.files[0]); });

clearFileBtn.addEventListener('click', () => {
  patientLookup = {}; personalIndex = []; codeLookup = {};
  fileInput.value = '';
  fileStatus.classList.remove('show');
  rebuildPersonalList();
  rebuildCodeList();
  clearPersistedHistorial();
});

function handleHistFile(file){
  fileSummary.textContent = 'Leyendo ' + file.name + '…';
  fileStatus.classList.add('show');
  const reader = new FileReader();
  reader.onload = (e) => {
    setTimeout(() => {
      try{
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, {type:'array', cellDates:true});
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const aoa = XLSX.utils.sheet_to_json(sheet, {header:1, defval:'', cellDates:true});
        if(!aoa.length) throw new Error('vacío');

        let headerRowIdx = aoa.findIndex(r => r.some(c => normKey(c) === HEADER_ANCHOR));
        if(headerRowIdx === -1) headerRowIdx = 0;
        const headerRow = aoa[headerRowIdx];
        const colIndex = {};
        headerRow.forEach((h, idx) => { colIndex[normKey(h)] = idx; });
        if(colIndex['NUMDOC'] === undefined) throw new Error('no se encontró NUMDOC');

        patientLookup = {};
        const personalMap = {};
        const codeMap = {};
        let eessCounts = {};

        aoa.slice(headerRowIdx+1).forEach(r => {
          if(!r.some(c => c!=='' && c!==undefined && c!==null)) return;
          const row = {};
          Object.entries(FIELD_MAP).forEach(([nk,label]) => {
            const idx = colIndex[nk];
            row[label] = (idx!==undefined && r[idx]!==undefined) ? r[idx] : '';
          });

          if(row.NUMDOC){
            const key = normKey(row.NUMDOC);
            patientLookup[key] = {
              PACIENTE: row.PACIENTE || (patientLookup[key] && patientLookup[key].PACIENTE) || '',
              FECHANAC: row.FECHANAC || (patientLookup[key] && patientLookup[key].FECHANAC) || '',
              TIPODOC: row.TIPODOC || (patientLookup[key] && patientLookup[key].TIPODOC) || 'DNI',
              SEGURO: row.SEGURO || (patientLookup[key] && patientLookup[key].SEGURO) || ''
            };
          }

          if(row.PERSONAL){
            const pkey = normKey(row.PERSONAL);
            if(!personalMap[pkey]) personalMap[pkey] = {PERSONAL:String(row.PERSONAL).trim(), PROFESION:row.PROFESION||'', RHNUMDOC:row.RHNUMDOC||'', RHTIPODOC:row.RHTIPODOC||'', servicioCounts:{}};
            const svc = String(row.SERVICIO||'').trim();
            if(svc) personalMap[pkey].servicioCounts[svc] = (personalMap[pkey].servicioCounts[svc]||0)+1;
            if(row.RHNUMDOC) personalMap[pkey].RHNUMDOC = row.RHNUMDOC;
            if(row.PROFESION) personalMap[pkey].PROFESION = row.PROFESION;
          }

          if(row.CODIGO){
            const ckey = normCode(row.CODIGO);
            if(!codeMap[ckey]) codeMap[ckey] = {label:String(row.CODIGO).trim(), itemCounts:{}};
            const it = String(row.ITEM||'').trim();
            if(it) codeMap[ckey].itemCounts[it] = (codeMap[ckey].itemCounts[it]||0)+1;
          }

          if(row.EESS){
            const e = String(row.EESS).trim();
            eessCounts[e] = (eessCounts[e]||0)+1;
          }
        });

        personalIndex = Object.values(personalMap).map(p => {
          let bestSvc = '', bestCount = 0;
          Object.entries(p.servicioCounts).forEach(([svc,c]) => { if(c>bestCount){bestCount=c;bestSvc=svc;} });
          return {PERSONAL:p.PERSONAL, PROFESION:p.PROFESION, RHNUMDOC:p.RHNUMDOC, RHTIPODOC:p.RHTIPODOC, servicio:bestSvc};
        }).sort((a,b)=>a.PERSONAL.localeCompare(b.PERSONAL));

        codeLookup = {};
        Object.entries(codeMap).forEach(([ckey,v]) => {
          let bestItem = '', bestCount = 0;
          Object.entries(v.itemCounts).forEach(([it,c]) => { if(c>bestCount){bestCount=c;bestItem=it;} });
          codeLookup[ckey] = {label:v.label, item:bestItem};
        });

        const topEess = Object.entries(eessCounts).sort((a,b)=>b[1]-a[1])[0];
        if(topEess && !eessInput.value) eessInput.value = topEess[0];

        fileSummary.textContent = file.name + ' — ' + Object.keys(patientLookup).length.toLocaleString('es-PE') + ' pacientes, ' + personalIndex.length + ' personal, ' + Object.keys(codeLookup).length.toLocaleString('es-PE') + ' códigos distintos';
        rebuildPersonalList();
        rebuildCodeList();
        saveHistorial(file.name);
      }catch(err){
        fileSummary.textContent = 'No se pudo leer el archivo — verifica que sea un export de HISREPORT';
        console.error(err);
      }
    }, 20);
  };
  reader.readAsArrayBuffer(file);
}

function rebuildPersonalList(){
  const dl = document.getElementById('personalList');
  dl.innerHTML = personalIndex.map(p => `<option value="${p.PERSONAL}">`).join('');
}

/* ====== Campos generales ====== */
const eessInput = document.getElementById('eessInput');
const fechaInput = document.getElementById('fechaInput');
const tipodocInput = document.getElementById('tipodocInput');
const numdocInput = document.getElementById('numdocInput');
const pacienteInput = document.getElementById('pacienteInput');
const fechanacInput = document.getElementById('fechanacInput');
const edadInput = document.getElementById('edadInput');
const patientNote = document.getElementById('patientNote');
const personalInput = document.getElementById('personalInput');
const profesionInput = document.getElementById('profesionInput');
const rhnumdocInput = document.getElementById('rhnumdocInput');
const servicioInput = document.getElementById('servicioInput');
const personalNote = document.getElementById('personalNote');

fechaInput.value = todayISO();

function updateEdad(){
  const age = calcAge(fechanacInput.value, fechaInput.value || todayISO());
  edadInput.value = (age===null) ? '' : age + ' años';
}
fechanacInput.addEventListener('input', updateEdad);
fechaInput.addEventListener('input', updateEdad);

numdocInput.addEventListener('blur', lookupPatient);
numdocInput.addEventListener('keydown', e => { if(e.key==='Enter'){ e.preventDefault(); lookupPatient(); } });

function lookupPatient(){
  const key = normKey(numdocInput.value);
  if(!key){ patientNote.textContent=''; return; }
  const p = patientLookup[key];
  if(p){
    pacienteInput.value = p.PACIENTE || pacienteInput.value;
    fechanacInput.value = toDateInputValue(p.FECHANAC) || fechanacInput.value;
    tipodocInput.value = p.TIPODOC || tipodocInput.value;
    updateEdad();
    patientNote.textContent = '✓ Paciente encontrado en el historial';
    patientNote.className = 'field-note';
  } else {
    patientNote.textContent = 'Paciente nuevo — no está en el historial cargado, completa sus datos';
    patientNote.className = 'field-note warn';
  }
}

personalInput.addEventListener('blur', lookupPersonal);
personalInput.addEventListener('change', lookupPersonal);

function lookupPersonal(){
  const q = personalInput.value.trim().toUpperCase();
  if(!q){ personalNote.textContent=''; return; }
  let match = personalIndex.find(p => p.PERSONAL.toUpperCase() === q);
  if(!match) match = personalIndex.find(p => String(p.RHNUMDOC).toUpperCase() === q);
  if(!match) match = personalIndex.find(p => p.PERSONAL.toUpperCase().includes(q));
  if(match){
    personalInput.value = match.PERSONAL;
    profesionInput.value = match.PROFESION;
    rhnumdocInput.value = match.RHNUMDOC;
    if(match.servicio) servicioInput.value = matchServicioOption(match.servicio);
    personalNote.textContent = '✓ Personal encontrado en el historial';
    personalNote.className = 'field-note';
  } else {
    profesionInput.value = '';
    rhnumdocInput.value = '';
    personalNote.textContent = 'No está en el historial — puedes escribirlo igual, o revisa el nombre';
    personalNote.className = 'field-note warn';
  }
}
function matchServicioOption(servicioText){
  const opts = [...servicioInput.options].map(o=>o.value);
  const st = serviceStyle(servicioText);
  for(const opt of opts){ if(serviceStyle(opt).name === st.name) return opt; }
  return servicioInput.value;
}

/* ====== Filas de código ====== */
const codeRowsWrap = document.getElementById('codeRows');
document.getElementById('addCodeBtn').addEventListener('click', () => addCodeRow());

function addCodeRow(){
  codeRowSeq++;
  const id = 'code_'+codeRowSeq;
  const div = document.createElement('div');
  div.className = 'code-row';
  div.dataset.rowId = id;
  div.innerHTML = `
    <div class="field">
      <label>Código</label>
      <input type="text" class="codigoInput" list="codeList" placeholder="ej. 99199.17" autocomplete="off">
      <div class="code-hint"></div>
    </div>
    <div class="field">
      <label>Tipo</label>
      <select class="tipodxInput">
        <option value="D">D — Definitivo</option>
        <option value="P">P — Presuntivo</option>
        <option value="R">R — Repetitivo</option>
      </select>
    </div>
    <div class="field">
      <label>Correl. Lab</label>
      <input type="number" class="labInput" min="0" value="1">
    </div>
    <button type="button" class="rm-code" title="Quitar código">×</button>
  `;
  codeRowsWrap.appendChild(div);

  const codigoEl = div.querySelector('.codigoInput');
  const hintEl = div.querySelector('.code-hint');
  codigoEl.addEventListener('input', () => {
    const info = codeLookup[normCode(codigoEl.value)];
    hintEl.textContent = info ? ('→ ' + info.item) : (codigoEl.value.trim() ? '(código no visto antes en el historial)' : '');
  });
  div.querySelector('.rm-code').addEventListener('click', () => {
    div.remove();
    refreshRemoveButtons();
  });
  refreshRemoveButtons();
  return div;
}
function refreshRemoveButtons(){
  const rows = codeRowsWrap.querySelectorAll('.code-row');
  rows.forEach(r => { r.querySelector('.rm-code').disabled = rows.length <= 1; });
}
addCodeRow();

function rebuildCodeList(){
  let dl = document.getElementById('codeList');
  if(!dl){ dl = document.createElement('datalist'); dl.id='codeList'; document.body.appendChild(dl); }
  dl.innerHTML = Object.values(codeLookup).map(c => `<option value="${c.label}">${c.item}</option>`).join('');
}

/* ====== Guardar atención ====== */
const saveBtn = document.getElementById('saveBtn');
const formMsg = document.getElementById('formMsg');

saveBtn.addEventListener('click', () => {
  formMsg.textContent = ''; formMsg.className = '';

  const numdoc = numdocInput.value.trim();
  const paciente = pacienteInput.value.trim();
  const personal = personalInput.value.trim();
  const servicio = servicioInput.value;
  const eess = eessInput.value.trim();
  const fecha = fechaInput.value || todayISO();

  if(!numdoc || !paciente){ showFormError('Falta el N.º de documento o el nombre del paciente.'); return; }
  if(!personal){ showFormError('Falta seleccionar al personal que atendió.'); return; }

  const codeRows = [...codeRowsWrap.querySelectorAll('.code-row')];
  const codes = codeRows.map(row => ({
    codigo: row.querySelector('.codigoInput').value.trim(),
    tipodx: row.querySelector('.tipodxInput').value,
    lab: row.querySelector('.labInput').value.trim()
  })).filter(c => c.codigo);

  if(!codes.length){ showFormError('Agrega al menos un código.'); return; }

  const fechanac = fechanacInput.value;
  const edad = calcAge(fechanac, fecha);

  codes.forEach((c, i) => {
    const info = codeLookup[normCode(c.codigo)];
    dayRecords.push({
      id: Date.now() + '_' + i + '_' + Math.random().toString(36).slice(2,7),
      FECHA: fecha, EESS: eess, TIPODOC: tipodocInput.value, NUMDOC: numdoc, PACIENTE: paciente,
      FECHANAC: fechanac, EDAD: edad===null?'':edad,
      CODIGO: c.codigo, TIPODX: c.tipodx, ITEM: info ? info.item : '',
      CORRELA_ITEM: i+1, CORRELA_LAB: c.lab,
      SERVICIO: servicio, PERSONAL: personal, PROFESION: profesionInput.value,
      RHTIPODOC: 'DNI', RHNUMDOC: rhnumdocInput.value
    });
  });

  renderDayList();
  showFormSuccess('✓ Atención guardada (' + codes.length + ' código' + (codes.length>1?'s':'') + ').');

  numdocInput.value=''; pacienteInput.value=''; fechanacInput.value=''; edadInput.value='';
  patientNote.textContent='';
  codeRowsWrap.innerHTML=''; addCodeRow();
  numdocInput.focus();
});

function showFormError(msg){ formMsg.textContent = msg; formMsg.className = 'error'; }
function showFormSuccess(msg){ formMsg.textContent = msg; formMsg.className = 'success'; setTimeout(()=>{ if(formMsg.className==='success') { formMsg.textContent=''; formMsg.className=''; } }, 4000); }

/* ====== Lista del día ====== */
const summaryBar = document.getElementById('summaryBar');
const dayListWrap = document.getElementById('dayListWrap');

function renderDayList(){
  saveDayRecords();
  if(!dayRecords.length){
    summaryBar.style.display='none';
    dayListWrap.innerHTML = `<div class="empty-day">Aún no registras atenciones hoy — usa el formulario de arriba.</div>`;
    return;
  }
  const patients = new Set(dayRecords.map(r=>r.NUMDOC));
  summaryBar.style.display='flex';
  summaryBar.innerHTML = `<span><b>${dayRecords.length}</b> código${dayRecords.length!==1?'s':''} registrado${dayRecords.length!==1?'s':''}</span>` +
                          `<span><b>${patients.size}</b> paciente${patients.size!==1?'s':''} distinto${patients.size!==1?'s':''}</span>`;

  const rows = dayRecords.map(r => {
    const st = serviceStyle(r.SERVICIO);
    return `<tr style="background:var(${st.bg})">
      <td class="mono">${r.FECHA||''}</td>
      <td class="mono">${r.NUMDOC}</td>
      <td>${r.PACIENTE}</td>
      <td class="mono">${r.EDAD}</td>
      <td>${svcBadgeHtml(r.SERVICIO)}</td>
      <td>${r.PERSONAL}</td>
      <td class="mono">${r.CODIGO}</td>
      <td class="mono">${r.TIPODX}</td>
      <td>${r.ITEM||''}</td>
      <td class="mono">${r.CORRELA_LAB}</td>
      <td><button class="del-row" data-id="${r.id}" title="Quitar">🗑</button></td>
    </tr>`;
  }).join('');

  dayListWrap.innerHTML = `<div class="table-scroll"><table class="day-table">
    <thead><tr>
      <th>Fecha</th><th>Doc.</th><th>Paciente</th><th>Edad</th><th>Servicio</th><th>Personal</th>
      <th>Código</th><th>Tipo</th><th>Ítem</th><th>Lab</th><th></th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;

  dayListWrap.querySelectorAll('.del-row').forEach(btn => {
    btn.addEventListener('click', () => {
      dayRecords = dayRecords.filter(r => r.id !== btn.dataset.id);
      renderDayList();
    });
  });
}
restorePersistedState();

document.getElementById('clearDayBtn').addEventListener('click', () => {
  if(!dayRecords.length) return;
  if(confirm('¿Vaciar toda la lista de atenciones del día? Esto no se puede deshacer (copia o descarga antes si no lo has hecho).')){
    dayRecords = [];
    renderDayList();
  }
});

/* ====== Exportar: copiar / descargar / guardar avance ====== */
const EXPORT_COLUMNS = ['FECHA','EESS','TIPODOC','NUMDOC','PACIENTE','FECHANAC','EDAD','CODIGO','TIPODX','ITEM','CORRELA_ITEM','CORRELA_LAB','SERVICIO','PERSONAL','PROFESION','RHTIPODOC','RHNUMDOC'];

function buildTSV(){
  const lines = [EXPORT_COLUMNS.join('\t')];
  dayRecords.forEach(r => {
    lines.push(EXPORT_COLUMNS.map(c => String(r[c]==null?'':r[c]).replace(/\t/g,' ').replace(/\n/g,' ')).join('\t'));
  });
  return lines.join('\n');
}

document.getElementById('copyBtn').addEventListener('click', () => {
  if(!dayRecords.length){ alert('Todavía no hay atenciones registradas hoy.'); return; }
  const tsv = buildTSV();
  const ta = document.createElement('textarea');
  ta.value = tsv;
  ta.style.position='fixed'; ta.style.opacity='0';
  document.body.appendChild(ta);
  ta.focus(); ta.select();
  let ok = false;
  try{ ok = document.execCommand('copy'); }catch(e){ ok = false; }
  document.body.removeChild(ta);
  if(ok){
    const btn = document.getElementById('copyBtn');
    const old = btn.textContent;
    btn.textContent = '✓ Copiado';
    setTimeout(()=>{ btn.textContent = old; }, 1800);
  } else {
    alert('No se pudo copiar automáticamente. Usa "Descargar Excel" como alternativa.');
  }
});

/* ====== Compartir o descargar (usa Web Share API en celular cuando está disponible) ====== */
async function shareOrDownloadFile(blob, filename, mimeType, shareTitle){
  const file = new File([blob], filename, {type: mimeType});
  if(navigator.canShare && navigator.canShare({files:[file]})){
    try{
      await navigator.share({files:[file], title: shareTitle});
      return;
    }catch(err){
      if(err && err.name === 'AbortError') return;
      console.warn('No se pudo compartir, se descargará en su lugar', err);
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

document.getElementById('downloadXlsxBtn').addEventListener('click', () => {
  if(!dayRecords.length){ alert('Todavía no hay atenciones registradas hoy.'); return; }
  const data = dayRecords.map(r => {
    const o = {};
    EXPORT_COLUMNS.forEach(c => o[c] = r[c] == null ? '' : r[c]);
    return o;
  });
  const ws = XLSX.utils.json_to_sheet(data, {header:EXPORT_COLUMNS});
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Atenciones');
  const fecha = (fechaInput.value || todayISO());
  const filename = `atenciones_${fecha}.xlsx`;
  const buf = XLSX.write(wb, {type:'array', bookType:'xlsx'});
  const blob = new Blob([buf], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  shareOrDownloadFile(blob, filename, blob.type, 'Atenciones del día');
});

document.getElementById('saveProgressBtn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({dayRecords, savedAt:new Date().toISOString()}, null, 2)], {type:'application/json'});
  const filename = `avance_atenciones_${fechaInput.value || todayISO()}.json`;
  shareOrDownloadFile(blob, filename, 'application/json', 'Avance de atenciones');
});

const progressFileInput = document.getElementById('progressFileInput');
document.getElementById('loadProgressBtn').addEventListener('click', () => progressFileInput.click());
progressFileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try{
      const parsed = JSON.parse(ev.target.result);
      if(!Array.isArray(parsed.dayRecords)) throw new Error('formato inválido');
      dayRecords = dayRecords.concat(parsed.dayRecords);
      renderDayList();
      alert('Avance cargado: ' + parsed.dayRecords.length + ' códigos añadidos a la lista actual.');
    }catch(err){
      alert('No se pudo leer ese archivo de avance.');
      console.error(err);
    }
  };
  reader.readAsText(file);
  progressFileInput.value = '';
});
