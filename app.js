const audio = document.querySelector('#audio');
const deck = document.querySelector('.deck');
const picker = document.querySelector('#file-picker');
const list = document.querySelector('#track-list');
const emptyState = document.querySelector('#empty-state');
const title = document.querySelector('#track-title');
const artist = document.querySelector('#track-artist');
const number = document.querySelector('#track-number');
const count = document.querySelector('#track-count');
const playButton = document.querySelector('#play');
const progress = document.querySelector('#progress');
const elapsed = document.querySelector('#elapsed');
const duration = document.querySelector('#duration');
const volume = document.querySelector('#volume');
const volumeValue = document.querySelector('#volume-value');
const muteButton = document.querySelector('#mute');
const shuffleButton = document.querySelector('#shuffle');
const canvas = document.querySelector('#scope');
const context2d = canvas.getContext('2d');

let tracks = [];
let currentIndex = -1;
let shuffle = false;
let audioContext;
let analyser;
let source;
let animationFrame;

function formatTime(value) {
  if (!Number.isFinite(value)) return '00:00';
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function cleanName(filename) {
  return filename.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function addFiles(files) {
  const incoming = [...files].filter(file => file.type.startsWith('audio/') || /\.(mp3|m4a|wav|ogg|flac|aac)$/i.test(file.name));
  incoming.forEach(file => {
    tracks.push({ title: cleanName(file.name), subtitle: `${(file.size / 1024 / 1024).toFixed(1)} MB · LOCAL FILE`, url: URL.createObjectURL(file), generated: false });
  });
  renderLibrary();
  if (currentIndex < 0 && tracks.length) loadTrack(0, false);
}

function renderLibrary() {
  emptyState.hidden = tracks.length > 0;
  count.textContent = String(tracks.length).padStart(2, '0');
  list.replaceChildren(...tracks.map((track, index) => {
    const item = document.createElement('li');
    item.tabIndex = 0;
    item.setAttribute('aria-current', index === currentIndex ? 'true' : 'false');
    item.innerHTML = `<span class="track-index">${String(index + 1).padStart(2, '0')}</span><span><strong></strong><small></small></span><span class="track-state">${index === currentIndex && !audio.paused ? '●' : '▶'}</span>`;
    item.querySelector('strong').textContent = track.title;
    item.querySelector('small').textContent = track.subtitle;
    item.addEventListener('click', () => loadTrack(index, true));
    item.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); loadTrack(index, true); } });
    return item;
  }));
}

function loadTrack(index, autoplay) {
  if (!tracks.length) return;
  currentIndex = (index + tracks.length) % tracks.length;
  const track = tracks[currentIndex];
  audio.src = track.url;
  title.textContent = track.title;
  artist.textContent = track.subtitle;
  number.textContent = `NO. ${String(currentIndex + 1).padStart(2, '0')}`;
  progress.value = 0;
  elapsed.textContent = '00:00';
  duration.textContent = '00:00';
  renderLibrary();
  updateMediaSession(track);
  if (autoplay) void playAudio();
}

async function prepareAnalyser() {
  if (!audioContext) {
    audioContext = new AudioContext();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source = audioContext.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioContext.destination);
  }
  if (audioContext.state === 'suspended') await audioContext.resume();
}

async function playAudio() {
  if (currentIndex < 0) return;
  await prepareAnalyser();
  try { await audio.play(); } catch (error) { console.warn('Playback needs another tap', error); }
}

function togglePlayback() {
  if (currentIndex < 0) {
    document.querySelector('#demo-track').focus();
    return;
  }
  if (audio.paused) void playAudio(); else audio.pause();
}

function nextTrack(direction = 1) {
  if (!tracks.length) return;
  const target = shuffle && tracks.length > 1
    ? (currentIndex + 1 + Math.floor(Math.random() * (tracks.length - 1))) % tracks.length
    : currentIndex + direction;
  loadTrack(target, true);
}

function updateMediaSession(track) {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({ title: track.title, artist: 'Muski local web player', album: 'Local Vault' });
}

function drawScope() {
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (canvas.width !== width * ratio || canvas.height !== height * ratio) {
    canvas.width = width * ratio;
    canvas.height = height * ratio;
  }
  context2d.setTransform(ratio, 0, 0, ratio, 0, 0);
  context2d.fillStyle = '#090908';
  context2d.fillRect(0, 0, width, height);
  context2d.strokeStyle = '#a8ff1f';
  context2d.lineWidth = 2;
  context2d.beginPath();

  if (analyser && !audio.paused) {
    const values = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(values);
    values.forEach((value, index) => {
      const x = index / (values.length - 1) * width;
      const y = value / 255 * height;
      if (index === 0) context2d.moveTo(x, y); else context2d.lineTo(x, y);
    });
  } else {
    for (let x = 0; x <= width; x += 5) {
      const y = height / 2 + Math.sin(x * 0.025) * 5;
      if (x === 0) context2d.moveTo(x, y); else context2d.lineTo(x, y);
    }
  }
  context2d.stroke();
  animationFrame = requestAnimationFrame(drawScope);
}

function createDemoWav() {
  const sampleRate = 44100;
  const seconds = 12;
  const samples = sampleRate * seconds;
  const buffer = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(buffer);
  const writeText = (offset, text) => [...text].forEach((character, index) => view.setUint8(offset + index, character.charCodeAt(0)));
  writeText(0, 'RIFF'); view.setUint32(4, 36 + samples * 2, true); writeText(8, 'WAVE'); writeText(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); writeText(36, 'data'); view.setUint32(40, samples * 2, true);
  const scale = [55, 65.41, 73.42, 82.41];
  for (let i = 0; i < samples; i += 1) {
    const time = i / sampleRate;
    const beat = (time * 2) % 1;
    const step = Math.floor(time * 2) % scale.length;
    const kick = Math.sin(2 * Math.PI * (52 + 90 * Math.exp(-beat * 18)) * time) * Math.exp(-beat * 12) * 0.7;
    const bass = Math.sin(2 * Math.PI * scale[step] * time) * 0.24;
    const pulse = Math.sin(2 * Math.PI * scale[(step + 2) % scale.length] * 4 * time) > 0 ? 0.08 : -0.08;
    const hatPhase = (time * 8) % 1;
    const noise = (Math.random() * 2 - 1) * Math.exp(-hatPhase * 35) * 0.08;
    const fade = Math.min(1, time * 3, (seconds - time) * 2);
    const sample = Math.max(-1, Math.min(1, (kick + bass + pulse + noise) * fade));
    view.setInt16(44 + i * 2, sample * 32767, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

picker.addEventListener('change', event => { addFiles(event.target.files); picker.value = ''; });
document.querySelector('#demo-track').addEventListener('click', () => {
  const existing = tracks.findIndex(track => track.generated);
  if (existing >= 0) { loadTrack(existing, true); return; }
  const url = URL.createObjectURL(createDemoWav());
  tracks.unshift({ title: 'NEON NEEDLE', subtitle: 'MUSKI LAB · GENERATED ON DEVICE', url, generated: true });
  renderLibrary();
  loadTrack(0, true);
});
playButton.addEventListener('click', togglePlayback);
document.querySelector('#previous').addEventListener('click', () => nextTrack(-1));
document.querySelector('#next').addEventListener('click', () => nextTrack(1));
shuffleButton.addEventListener('click', () => { shuffle = !shuffle; shuffleButton.setAttribute('aria-pressed', String(shuffle)); });
muteButton.addEventListener('click', () => { audio.muted = !audio.muted; muteButton.textContent = audio.muted ? 'MUTE' : 'VOL'; });
volume.addEventListener('input', () => { audio.volume = Number(volume.value); volumeValue.textContent = `${Math.round(audio.volume * 100)}%`; });
progress.addEventListener('input', () => { if (Number.isFinite(audio.duration)) audio.currentTime = Number(progress.value) / 1000 * audio.duration; });
audio.addEventListener('timeupdate', () => { elapsed.textContent = formatTime(audio.currentTime); progress.value = audio.duration ? String(audio.currentTime / audio.duration * 1000) : '0'; });
audio.addEventListener('loadedmetadata', () => { duration.textContent = formatTime(audio.duration); });
audio.addEventListener('play', () => { deck.dataset.playing = 'true'; playButton.textContent = 'Ⅱ'; playButton.setAttribute('aria-label', 'Pause'); renderLibrary(); });
audio.addEventListener('pause', () => { deck.dataset.playing = 'false'; playButton.textContent = '▶'; playButton.setAttribute('aria-label', 'Play'); renderLibrary(); });
audio.addEventListener('ended', () => nextTrack(1));

document.addEventListener('keydown', event => {
  if (event.code === 'Space' && !['INPUT', 'BUTTON'].includes(document.activeElement.tagName)) { event.preventDefault(); togglePlayback(); }
  if (event.key === 'ArrowRight' && event.altKey) nextTrack(1);
  if (event.key === 'ArrowLeft' && event.altKey) nextTrack(-1);
});

if ('mediaSession' in navigator) {
  navigator.mediaSession.setActionHandler('play', () => void playAudio());
  navigator.mediaSession.setActionHandler('pause', () => audio.pause());
  navigator.mediaSession.setActionHandler('previoustrack', () => nextTrack(-1));
  navigator.mediaSession.setActionHandler('nexttrack', () => nextTrack(1));
}

window.addEventListener('dragover', event => event.preventDefault());
window.addEventListener('drop', event => { event.preventDefault(); if (event.dataTransfer?.files) addFiles(event.dataTransfer.files); });
window.addEventListener('beforeunload', () => { cancelAnimationFrame(animationFrame); tracks.forEach(track => URL.revokeObjectURL(track.url)); });

audio.volume = Number(volume.value);
drawScope();
