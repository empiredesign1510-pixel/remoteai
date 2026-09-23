const STORAGE_KEY = 'orbit-remote-state-v1';

// Kode IR di bawah HANYA demo agar UI bisa dites.
// Format pattern adalah microseconds: mark, space, mark, space, dst.
// Ganti dengan kode perangkat asli / database IR yang valid.
const IR_CODES = {
  generic_tv: {
    power: [9000,4500,560,560,560,1690,560,560,560,1690,560,560],
    vol_up: [9000,4500,560,560,560,560,560,1690,560,560,560,560],
    vol_down: [9000,4500,560,1690,560,560,560,560,560,1690,560,560],
    channel_up: [9000,4500,560,560,560,560,560,560,560,1690,560,560],
    channel_down: [9000,4500,560,1690,560,1690,560,560,560,560,560,560],
    up: [9000,4500,560,560,560,560,560,1690], down: [9000,4500,560,560,560,1690,560,560],
    left: [9000,4500,560,1690,560,560,560,560], right: [9000,4500,560,560,560,560,560,1690],
    ok: [9000,4500,560,1690,560,1690,560,560], home: [9000,4500,560,560,560,1690,560,1690],
    mute: [9000,4500,560,1690,560,560,560,1690]
  },
  generic_ac: {
    power: [9000,4500,560,560,560,560,560,1690],
    temp_up: [9000,4500,560,1690,560,560,560,560],
    temp_down: [9000,4500,560,560,560,1690,560,560],
    mode: [9000,4500,560,1690,560,1690,560,560],
    fan: [9000,4500,560,560,560,560,560,1690],
    swing: [9000,4500,560,560,560,1690,560,1690]
  }
};

const seedState = {
  room: 'Semua',
  selectedId: 'tv-living',
  devices: [
    { id:'tv-living', name:'TV Samsung', room:'Ruang Tamu', type:'tv', brand:'Generic TV', frequency:38000, profile:'generic_tv' },
    { id:'ac-bedroom', name:'AC Bedroom', room:'Kamar', type:'ac', brand:'Generic AC', frequency:38000, profile:'generic_ac', temperature:24, mode:'Cool', fan:'Auto' },
    { id:'cam-front', name:'CCTV Depan', room:'Depan Rumah', type:'cctv', brand:'IP Camera', frequency:0, streamUrl:'' },
    { id:'tv-bedroom', name:'TV Kamar', room:'Kamar', type:'tv', brand:'Generic TV', frequency:38000, profile:'generic_tv' }
  ]
};

let state = loadState();
let toastTimer;

const el = id => document.getElementById(id);
const deviceGrid = el('deviceGrid');
const roomChips = el('roomChips');
const remotePanel = el('remotePanel');
const dialog = el('deviceDialog');
const form = el('deviceForm');

function loadState(){
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || structuredClone(seedState); }
  catch { return structuredClone(seedState); }
}
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function iconFor(type){ return ({tv:'📺', ac:'❄️', cctv:'📹', custom:'✨'})[type] || '🔘'; }
function showToast(message){
  const t = el('toast'); t.textContent = message; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(()=>t.classList.remove('show'), 1800);
}

function getBridge(){
  // Android wrapper dapat mengekspos object window.AndroidIR.
  // AndroidIR.hasEmitter(): boolean
  // AndroidIR.transmit(frequency: number, patternCsv: string): void
  return window.AndroidIR || null;
}

function refreshBridgeStatus(){
  const bridge = getBridge();
  let available = false;
  try { available = !!bridge && (!bridge.hasEmitter || bridge.hasEmitter()); } catch {}
  el('bridgeDot').classList.toggle('ok', available);
  el('bridgeStatus').textContent = available ? 'IR blaster siap' : 'Mode browser';
  el('bridgeHint').textContent = available ? 'Perintah akan dikirim lewat infra merah.' : 'UI aktif; IR membutuhkan wrapper Android/WebView.';
}

function sendIR(device, command){
  const profile = IR_CODES[device.profile] || {};
  const pattern = profile[command];
  if (!pattern) return showToast(`Kode IR “${command}” belum tersedia`);

  const bridge = getBridge();
  try {
    if (bridge?.transmit) {
      bridge.transmit(Number(device.frequency || 38000), pattern.join(','));
      showToast(`${device.name}: ${command}`);
    } else {
      console.info('[SIMULATED IR]', { device, command, pattern });
      showToast(`Simulasi: ${command}`);
    }
  } catch (err) {
    console.error(err);
    showToast('Gagal mengirim IR');
  }
}

function rooms(){ return ['Semua', ...new Set(state.devices.map(d=>d.room))]; }

function renderRooms(){
  roomChips.innerHTML = rooms().map(room => `
    <button class="chip ${state.room === room ? 'active':''}" data-room="${escapeHtml(room)}">${escapeHtml(room)}</button>
  `).join('');
  roomChips.querySelectorAll('.chip').forEach(btn => btn.addEventListener('click', () => {
    state.room = btn.dataset.room; saveState(); render();
  }));
}

function renderDevices(){
  const visible = state.devices.filter(d => state.room === 'Semua' || d.room === state.room);
  el('deviceCount').textContent = visible.length;
  deviceGrid.innerHTML = visible.map(d => `
    <button class="device-card ${state.selectedId === d.id ? 'active':''}" data-device="${d.id}">
      <span class="status-mini"></span>
      <span class="device-icon">${iconFor(d.type)}</span>
      <h3>${escapeHtml(d.name)}</h3>
      <p>${escapeHtml(d.room)} · ${escapeHtml(d.brand || d.type.toUpperCase())}</p>
    </button>
  `).join('') || `<p style="color:var(--muted)">Belum ada perangkat di ruangan ini.</p>`;

  deviceGrid.querySelectorAll('[data-device]').forEach(card => card.addEventListener('click', () => {
    state.selectedId = card.dataset.device; saveState(); renderDevices(); renderRemote();
  }));
}

function remoteHeader(d){
  return `<div class="remote-head">
    <div class="remote-title"><h2>${iconFor(d.type)} ${escapeHtml(d.name)}</h2><p>${escapeHtml(d.brand || '')} · ${escapeHtml(d.room)}</p></div>
    ${d.type !== 'cctv' ? `<button class="icon-btn power-btn" data-command="power" aria-label="Power">⏻</button>` : ''}
  </div>`;
}

function tvRemote(d){
  return `${remoteHeader(d)}
    <div class="dpad">
      <span></span><button data-command="up">▲</button><span></span>
      <button data-command="left">◀</button><button class="ok" data-command="ok">OK</button><button data-command="right">▶</button>
      <span></span><button data-command="down">▼</button><span></span>
    </div>
    <div class="remote-grid">
      <button class="remote-btn" data-command="vol_down">VOL −</button>
      <button class="remote-btn primary" data-command="home">⌂ HOME</button>
      <button class="remote-btn" data-command="vol_up">VOL +</button>
      <button class="remote-btn" data-command="channel_down">CH −</button>
      <button class="remote-btn" data-command="mute">MUTE</button>
      <button class="remote-btn" data-command="channel_up">CH +</button>
    </div>`;
}

function acRemote(d){
  d.temperature ??= 24; d.mode ??= 'Cool'; d.fan ??= 'Auto';
  return `${remoteHeader(d)}
    <div class="ac-display">
      <div class="temperature">${d.temperature}°</div>
      <p>${escapeHtml(d.mode)} · Fan ${escapeHtml(d.fan)}</p>
    </div>
    <div class="remote-grid">
      <button class="remote-btn" data-ac="temp_down">TEMP −</button>
      <button class="remote-btn primary" data-ac="mode">MODE</button>
      <button class="remote-btn" data-ac="temp_up">TEMP +</button>
      <button class="remote-btn double" data-ac="fan">FAN</button>
      <button class="remote-btn" data-ac="swing">SWING</button>
    </div>`;
}

function cctvRemote(d){
  return `${remoteHeader(d)}
    <div class="camera-frame">
      <div><div class="cam-icon">📡</div><strong>Preview kamera</strong><p style="margin-top:8px">Hubungkan HLS/WebRTC/RTSP melalui gateway backend agar stream tampil di web.</p></div>
    </div>
    <div class="remote-grid">
      <button class="remote-btn" data-cctv="left">◀ Pan</button>
      <button class="remote-btn primary" data-cctv="snapshot">Snapshot</button>
      <button class="remote-btn" data-cctv="right">Pan ▶</button>
      <button class="remote-btn wide" data-cctv="fullscreen">Buka kamera</button>
    </div>`;
}

function customRemote(d){
  return `${remoteHeader(d)}
    <div class="remote-grid">
      ${['A','B','C','D','E','F'].map(x=>`<button class="remote-btn" data-command="${x.toLowerCase()}">${x}</button>`).join('')}
    </div>`;
}

function renderRemote(){
  const d = state.devices.find(x=>x.id===state.selectedId);
  if (!d) {
    remotePanel.innerHTML = `<div class="remote-empty"><div><div class="big">🎛️</div><strong>Pilih perangkat</strong><p style="margin-top:8px">Remote akan muncul di sini.</p></div></div>`;
    return;
  }
  remotePanel.innerHTML = d.type === 'tv' ? tvRemote(d) : d.type === 'ac' ? acRemote(d) : d.type === 'cctv' ? cctvRemote(d) : customRemote(d);

  remotePanel.querySelectorAll('[data-command]').forEach(btn => btn.addEventListener('click', () => sendIR(d, btn.dataset.command)));
  remotePanel.querySelectorAll('[data-ac]').forEach(btn => btn.addEventListener('click', () => handleAC(d, btn.dataset.ac)));
  remotePanel.querySelectorAll('[data-cctv]').forEach(btn => btn.addEventListener('click', () => handleCCTV(d, btn.dataset.cctv)));
}

function handleAC(d, command){
  if(command === 'temp_up') d.temperature = Math.min(30, (d.temperature ?? 24) + 1);
  if(command === 'temp_down') d.temperature = Math.max(16, (d.temperature ?? 24) - 1);
  if(command === 'mode') {
    const modes = ['Cool','Dry','Fan','Auto'];
    d.mode = modes[(modes.indexOf(d.mode)+1) % modes.length];
  }
  if(command === 'fan') {
    const fan = ['Auto','Low','Med','High'];
    d.fan = fan[(fan.indexOf(d.fan)+1) % fan.length];
  }
  sendIR(d, command); saveState(); renderRemote();
}

function handleCCTV(d, command){
  // Implementasi produksi: panggil API ONVIF / vendor / NVR milik user.
  // Browser tidak bisa bicara RTSP langsung tanpa gateway/transcoding.
  showToast(`CCTV: ${command} (hubungkan API)`);
}

function render(){ renderRooms(); renderDevices(); renderRemote(); refreshBridgeStatus(); }

el('addDeviceBtn').addEventListener('click', () => dialog.showModal());
form.addEventListener('submit', (e) => {
  if (e.submitter?.value === 'cancel') return;
  e.preventDefault();
  const fd = new FormData(form);
  const type = fd.get('type');
  const d = {
    id: `${type}-${Date.now()}`,
    name: String(fd.get('name')).trim(), room: String(fd.get('room')).trim(), type,
    brand: String(fd.get('brand')).trim() || 'Custom', frequency: Number(fd.get('frequency')) || 38000,
    profile: type === 'tv' ? 'generic_tv' : type === 'ac' ? 'generic_ac' : 'custom'
  };
  state.devices.push(d); state.selectedId = d.id; state.room = 'Semua'; saveState();
  form.reset(); dialog.close(); render(); showToast('Perangkat ditambahkan');
});

function escapeHtml(v='') { return String(v).replace(/[&<>'"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[s])); }

if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(()=>{}));
render();
