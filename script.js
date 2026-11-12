const screens = [...document.querySelectorAll('.screen')];
const nav = [...document.querySelectorAll('.nav-btn')];

function showScreen(id){
  screens.forEach(screen => screen.classList.toggle('active', screen.id === id));
  nav.forEach(button => button.classList.toggle('active', button.dataset.screen === id));
}
nav.forEach(button => button.addEventListener('click', () => showScreen(button.dataset.screen)));

// Relógio e data em tempo real, conforme o relógio local do dispositivo.
function updateDateTime(){
  // O layout principal atual não possui mais os elementos #clock e #date.
  // Mantém a rotina compatível caso esses elementos sejam adicionados no futuro.
  const clock = document.getElementById('clock');
  const date = document.getElementById('date');
  if (!clock && !date) return;

  const now = new Date();
  if (clock) {
    clock.textContent = new Intl.DateTimeFormat('pt-BR', {
      hour:'2-digit', minute:'2-digit', hour12:false
    }).format(now);
  }
  if (date) {
    const weekday = new Intl.DateTimeFormat('pt-BR', {weekday:'short'}).format(now).replace('.', '');
    const day = now.getDate();
    const month = new Intl.DateTimeFormat('pt-BR', {month:'short'}).format(now).replace('.', '');
    date.textContent = `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}. ${day} de ${month}.`;
  }
}
updateDateTime();
setInterval(updateDateTime, 1000);

// Estado único da iluminação: os dois controles são sincronizados.
let lightIsOn = false;
const homeSwitch = document.getElementById('home-light-switch');
const homeBulb = document.getElementById('home-bulb');
const homeLabel = document.getElementById('home-light-label');
const roomCard = document.getElementById('room-card');
const salaCard = document.getElementById('room-card-sala');
const cozinhaCard = document.getElementById('room-card-cozinha');

function replayLightAnimation(element){
  if (!element) return;
  element.classList.remove('light-tap');
  void element.offsetWidth;
  element.classList.add('light-tap');
  window.setTimeout(() => element.classList.remove('light-tap'), 700);
}
function setLightState(isOn){
  lightIsOn = isOn;
  replayLightAnimation(homeSwitch);
  replayLightAnimation(roomCard);
  replayLightAnimation(roomCard.querySelector('svg'));
  replayLightAnimation(homeBulb);
  homeSwitch.classList.toggle('on', lightIsOn);
  homeSwitch.setAttribute('aria-pressed', String(lightIsOn));
  homeBulb.classList.toggle('is-on', lightIsOn);
  homeLabel.textContent = lightIsOn ? 'Ligado' : 'Desligado';
  roomCard.classList.toggle('is-on', lightIsOn);
  roomCard.setAttribute('aria-pressed', String(lightIsOn));
}
homeSwitch.addEventListener('click', () => setLightState(!lightIsOn));
roomCard.addEventListener('click', () => setLightState(!lightIsOn));

// Sala e cozinha têm controles independentes do Quarto.
[salaCard, cozinhaCard].forEach(card => {
  card.addEventListener('click', () => {
    const isOn = card.getAttribute('aria-pressed') === 'true';
    replayLightAnimation(card);
    const bulb = card.querySelector('svg');
    replayLightAnimation(bulb);
    card.classList.toggle('is-on', !isOn);
    card.setAttribute('aria-pressed', String(!isOn));
  });
});

// Player de áudio local. Os arquivos não são enviados para nenhum servidor.
const audio = new Audio();
audio.preload = 'metadata';
audio.volume = 0.85;
let tracks = [];
let currentIndex = -1;
let shuffle = false;
let repeat = false;
let objectUrls = [];

const homeFiles = document.getElementById('home-audio-files');
const pageFiles = document.getElementById('page-audio-files');
const playlist = document.getElementById('playlist');
const emptyPlaylist = document.getElementById('empty-playlist');

function formatTime(seconds){
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
}
function selectedTrack(){
  return currentIndex >= 0 ? tracks[currentIndex] : null;
}
function renderPlaylist(){
  playlist.innerHTML = '';
  tracks.forEach((track, index) => {
    const button = document.createElement('button');
    button.className = 'track-item' + (index === currentIndex ? ' active' : '');
    button.type = 'button';
    const number = document.createElement('span');
    number.className = 'track-number';
    number.textContent = index === currentIndex && !audio.paused ? '♫' : String(index + 1);
    const name = document.createElement('span');
    name.className = 'track-name';
    name.textContent = track.name;
    button.append(number, name);
    button.addEventListener('click', () => loadTrack(index, true));
    playlist.appendChild(button);
  });
  emptyPlaylist.hidden = tracks.length > 0;
  playlist.hidden = tracks.length === 0;
}
function updatePlayerUI(){
  const track = selectedTrack();
  const title = track ? track.name.replace(/\.[^.]+$/, '') : 'Nenhuma música adicionada';
  const subtitle = track ? 'Arquivo local' : 'Adicione músicas para começar a reproduzir';
  document.getElementById('home-track-title').textContent = title;
  document.getElementById('home-track-subtitle').textContent = subtitle;
  document.getElementById('page-track-title').textContent = track ? title : 'Nenhuma música selecionada';
  document.getElementById('page-track-artist').textContent = track ? 'Arquivo local' : 'Adicione músicas para começar';
  const icon = audio.paused ? '▶' : 'Ⅱ';
  document.getElementById('home-play').textContent = icon;
  document.getElementById('page-play').textContent = icon;
  document.getElementById('current-time').textContent = formatTime(audio.currentTime);
  document.getElementById('total-time').textContent = formatTime(audio.duration);
  const seek = document.getElementById('seek-bar');
  seek.value = Number.isFinite(audio.duration) && audio.duration > 0
    ? (audio.currentTime / audio.duration) * 100 : 0;
  renderPlaylist();
}
function loadTrack(index, autoplay){
  if (!tracks.length) return;
  currentIndex = (index + tracks.length) % tracks.length;
  audio.src = tracks[currentIndex].url;
  audio.load();
  updatePlayerUI();
  if (autoplay) audio.play().catch(() => updatePlayerUI());
}
function playPause(filePicker = pageFiles){
  if (!tracks.length) {
    // Abre o seletor correspondente ao controle usado (Home ou página Música).
    filePicker.click();
    return;
  }
  if (audio.paused) audio.play().catch(() => updatePlayerUI());
  else audio.pause();
  updatePlayerUI();
}
function nextTrack(){
  if (!tracks.length) return;
  let next = currentIndex + 1;
  if (shuffle && tracks.length > 1) {
    do { next = Math.floor(Math.random() * tracks.length); } while (next === currentIndex);
  }
  if (next >= tracks.length) next = repeat ? 0 : currentIndex;
  if (next === currentIndex && !repeat && !shuffle) {
    audio.currentTime = 0;
    audio.pause();
    updatePlayerUI();
    return;
  }
  loadTrack(next, true);
}
function previousTrack(){
  if (!tracks.length) return;
  if (audio.currentTime > 3) {
    audio.currentTime = 0;
    return;
  }
  loadTrack(currentIndex <= 0 ? tracks.length - 1 : currentIndex - 1, true);
}
function addFiles(fileList){
  const incoming = [...fileList].filter(file => file.type.startsWith('audio/') || /\.(mp3|m4a|aac|wav|ogg|oga|opus|flac|aiff|wma)$/i.test(file.name));
  incoming.forEach(file => {
    const url = URL.createObjectURL(file);
    objectUrls.push(url);
    tracks.push({name:file.name, url});
  });
  if (currentIndex === -1 && tracks.length) loadTrack(0, false);
  renderPlaylist();
  updatePlayerUI();
}
homeFiles.addEventListener('change', event => {
  addFiles(event.target.files);
  event.target.value = '';
});
pageFiles.addEventListener('change', event => {
  addFiles(event.target.files);
  event.target.value = '';
});
document.getElementById('home-play').addEventListener('click', () => playPause(homeFiles));
document.getElementById('page-play').addEventListener('click', () => playPause(pageFiles));
document.getElementById('home-prev').addEventListener('click', previousTrack);
document.getElementById('page-prev').addEventListener('click', previousTrack);
document.getElementById('home-next').addEventListener('click', nextTrack);
document.getElementById('page-next').addEventListener('click', nextTrack);
document.getElementById('page-shuffle').addEventListener('click', event => {
  shuffle = !shuffle;
  event.currentTarget.style.color = shuffle ? 'var(--green)' : '';
});
document.getElementById('page-repeat').addEventListener('click', event => {
  repeat = !repeat;
  event.currentTarget.style.color = repeat ? 'var(--green)' : '';
});
document.getElementById('seek-bar').addEventListener('input', event => {
  if (Number.isFinite(audio.duration) && audio.duration > 0) {
    audio.currentTime = (Number(event.target.value) / 100) * audio.duration;
  }
});
document.getElementById('volume-bar').addEventListener('input', event => {
  audio.volume = Number(event.target.value);
});
audio.addEventListener('timeupdate', updatePlayerUI);
audio.addEventListener('loadedmetadata', updatePlayerUI);
audio.addEventListener('play', updatePlayerUI);
audio.addEventListener('pause', updatePlayerUI);
audio.addEventListener('ended', () => {
  if (repeat) {
    audio.currentTime = 0;
    audio.play();
  } else if (currentIndex < tracks.length - 1 || shuffle) {
    nextTrack();
  } else {
    updatePlayerUI();
  }
});
updatePlayerUI();

/* ===== Navegação Wi-Fi (prévia no navegador) ===== */
const openWifi = document.getElementById('open-wifi');
const wifiBack = document.getElementById('wifi-back');
const wifiDemoToggle = document.getElementById('wifi-demo-toggle');
const wifiStateLabel = document.getElementById('wifi-state-label');
openWifi?.addEventListener('click', () => showScreen('wifi'));
wifiBack?.addEventListener('click', () => showScreen('settings'));
wifiDemoToggle?.addEventListener('click', () => {
  const enabled = wifiDemoToggle.getAttribute('aria-pressed') !== 'true';
  wifiDemoToggle.setAttribute('aria-pressed', String(enabled));
  wifiDemoToggle.textContent = enabled ? 'Ligado' : 'Desligado';
  wifiDemoToggle.classList.toggle('off', !enabled);
  wifiStateLabel.textContent = enabled ? 'Prévia de interface • navegador' : 'Desligado na demonstração';
});

// Navegação das telas Wi-Fi e Bluetooth
document.getElementById('open-wifi')?.addEventListener('click',()=>showScreen('wifi'));
document.getElementById('open-bluetooth')?.addEventListener('click',()=>showScreen('bluetooth'));
document.getElementById('wifi-back')?.addEventListener('click',()=>showScreen('settings'));
document.getElementById('bluetooth-back')?.addEventListener('click',()=>showScreen('settings'));