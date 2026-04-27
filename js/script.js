let database = [];
let filteredDatabase = [];
let currentItem = null;
let currentMode = '';
let promptAudio = null;
let isAllSelected = true;
let currentAudio = null; 
let isAutoplay = false; // Biến trạng thái autoplay

const ROLEPLAY_IDS = ["105", "106", "107", "108"];
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSDiVOTUA-UZjnvzTogaMSTgb1uw7PFFp7hLLKdY_SXKJutAHuH8XbWyEGla5AGfxRftV0aUFqW81GM/pub?gid=0&single=true&output=csv';
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzxJDpRgXk_3hDVdWaE1E_teMwYzhZ5m_MF_bv9ZB58qTO5ZwgJauoQh_nhX5y5pt-i/exec';

fetch('js/data.json')
    .then(response => response.json())
    .then(data => { database = data; console.log("Data Ready!"); });

function getLessonTitle(id) {
    const titles = { "105": "AT THE STORE", "106": "AT THE MEETING", "107": "AT THE SHOP", "108": "AT THE OFFICE" };
    return titles[id] || "ROLEPLAY MODE";
}

function playAudioWithSpeed(path) {
    if (!path) return;
    stopAllAudio();
    currentAudio = new Audio(path);
    const speed = document.getElementById('speed-select').value;
    const icon = document.querySelector('.pulse-icon');
    currentAudio.playbackRate = parseFloat(speed);
    currentAudio.onplay = () => { if (icon) icon.classList.add('playing'); };
    currentAudio.onended = () => { if (icon) icon.classList.remove('playing'); currentAudio = null; };
    currentAudio.play();
}

function stopAllAudio() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        const icon = document.querySelector('.pulse-icon');
        if (icon) icon.classList.remove('playing');
        currentAudio = null;
    }
}

// LOGIC AUTOPLAY
function toggleAutoplay() {
    if (isAutoplay) {
        stopAutoplay();
    } else {
        startAutoplay();
    }
}

function startAutoplay() {
    isAutoplay = true;
    const btn = document.getElementById('btn-autoplay');
    btn.innerText = "⏹️ Stop Auto";
    btn.style.background = "#fee2e2";
    
    let currentIndex = 0;
    const audios = currentItem.audios;

    function playSequence() {
        if (!isAutoplay || currentIndex >= audios.length) {
            stopAutoplay();
            return;
        }

        stopAllAudio();
        currentAudio = new Audio(audios[currentIndex]);
        const speed = document.getElementById('speed-select').value;
        const icon = document.querySelector('.pulse-icon');
        currentAudio.playbackRate = parseFloat(speed);
        
        currentAudio.onplay = () => icon?.classList.add('playing');
        currentAudio.onended = () => {
            icon?.classList.remove('playing');
            currentIndex++;
            if (isAutoplay) setTimeout(playSequence, 1200); // Nghỉ 1.2s giữa các câu
        };
        currentAudio.play();
    }
    playSequence();
}

function stopAutoplay() {
    isAutoplay = false;
    stopAllAudio();
    const btn = document.getElementById('btn-autoplay');
    if (btn) {
        btn.innerText = "🔄 Autoplay";
        btn.style.background = "#eff6ff";
    }
}

async function handleCredentialResponse(response) {
    const payload = JSON.parse(atob(response.credential.split('.')[1]));
    const email = payload.email.toLowerCase();
    try {
        const res = await fetch(SHEET_CSV_URL);
        const csv = await res.text();
        const allowed = csv.split(/\r?\n/).map(l => l.split(',')[0].trim().toLowerCase());
        if (allowed.includes(email)) {
            document.getElementById('login-screen').classList.add('hidden');
            document.getElementById('home-screen').classList.remove('hidden');
            fetch(WEB_APP_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ email, action: 'Vào học Reflex Eng' }) });
        } else {
            document.getElementById('login-error').classList.remove('hidden');
            google.accounts.id.disableAutoSelect();
        }
    } catch (e) { alert("Lỗi kết nối dữ liệu!"); }
}

function startApp(mode) {
    currentMode = mode;
    document.getElementById('home-screen').classList.add('hidden');
    document.getElementById('day-select-screen').classList.remove('hidden');
    renderDayChecklist();
}

function renderDayChecklist() {
    const container = document.getElementById('day-checklist');
    container.innerHTML = '';
    let availableData = (currentMode === 'roleplay') 
        ? database.filter(i => ROLEPLAY_IDS.includes(i.id))
        : database.filter(i => !ROLEPLAY_IDS.includes(i.id));
    const allDays = [...new Set(availableData.map(item => item.day))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    allDays.forEach(day => {
        const label = document.createElement('label');
        label.className = 'day-item';
        label.innerHTML = `<input type="checkbox" value="${day}" checked> <span>${day}</span>`;
        container.appendChild(label);
    });
}

function confirmSelection() {
    const selectedDays = Array.from(document.querySelectorAll('#day-checklist input:checked')).map(cb => cb.value);
    if (selectedDays.length === 0) return alert("Chọn ít nhất 1 bài nhé!");
    filteredDatabase = database.filter(item => {
        const isSelectedDay = selectedDays.includes(item.day);
        const isRightMode = (currentMode === 'roleplay') ? ROLEPLAY_IDS.includes(item.id) : !ROLEPLAY_IDS.includes(item.id);
        return isSelectedDay && isRightMode;
    });
    document.getElementById('day-select-screen').classList.add('hidden');
    document.getElementById('study-screen').classList.remove('hidden');
    renderContent();
}

function renderContent() {
    stopAutoplay(); // Dừng autoplay nếu đang chạy khi chuyển bài
    if (filteredDatabase.length === 0) return;
    currentItem = filteredDatabase[Math.floor(Math.random() * filteredDatabase.length)];
    const img = document.getElementById('display-img');
    const placeholder = document.getElementById('audio-placeholder');
    const pText = document.getElementById('placeholder-text');
    const fullAudioCont = document.getElementById('full-audio-container');
    const grid = document.getElementById('audio-grid');
    
    grid.innerHTML = '';
    placeholder.classList.add('hidden');
    img.classList.remove('hidden');
    fullAudioCont.classList.add('hidden');

    if (currentMode === 'roleplay') {
        img.classList.add('hidden');
        placeholder.classList.remove('hidden');
        pText.innerText = getLessonTitle(currentItem.id);
        document.getElementById('mode-title').innerText = "Roleplay Master";
        if (currentItem.fullAudio) {
            fullAudioCont.classList.remove('hidden');
            document.getElementById('btn-play-full').onclick = () => playAudioWithSpeed(currentItem.fullAudio);
        }
        currentItem.audios.forEach((path, i) => {
            const btn = document.createElement('button'); btn.className = 'btn-audio'; btn.innerText = `Câu ${i + 1}`;
            btn.onclick = () => playAudioWithSpeed(path); grid.appendChild(btn);
        });
    } else if (currentMode === 'reflex') {
        document.getElementById('mode-title').innerText = "Phản xạ A - B";
        img.classList.add('hidden');
        placeholder.classList.remove('hidden');
        pText.innerText = "TAP TO LISTEN";
        promptAudio = currentItem.audios[Math.floor(Math.random() * currentItem.audios.length)];
        currentItem.audios.forEach((path, i) => {
            if (path !== promptAudio) {
                const btn = document.createElement('button'); btn.className = 'btn-audio btn-check';
                btn.innerHTML = `✅ Check Answer ${currentItem.audios.length > 2 ? i + 1 : ''}`;
                btn.onclick = (e) => { e.stopPropagation(); playAudioWithSpeed(path); };
                grid.appendChild(btn);
            }
        });
    } else {
        document.getElementById('mode-title').innerText = "Học theo hình ảnh";
        img.src = currentItem.img;
        currentItem.audios.forEach((path, i) => {
            const btn = document.createElement('button'); btn.className = 'btn-audio'; btn.innerText = `🔈 Person ${String.fromCharCode(65 + i)}`;
            btn.onclick = () => playAudioWithSpeed(path); grid.appendChild(btn);
        });
    }
}

function handleVisualClick() { 
    if (currentMode === 'reflex' && promptAudio) playAudioWithSpeed(promptAudio);
    if (currentMode === 'roleplay' && currentItem.fullAudio) playAudioWithSpeed(currentItem.fullAudio);
}

function goHome() { 
    stopAutoplay();
    stopAllAudio();
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden')); 
    document.getElementById('home-screen').classList.remove('hidden'); 
}

function toggleSelectAll() {
    const checkboxes = document.querySelectorAll('#day-checklist input');
    const btn = document.getElementById('btn-select-all');
    isAllSelected = !isAllSelected;
    checkboxes.forEach(cb => cb.checked = isAllSelected);
    btn.innerText = isAllSelected ? "Bỏ chọn tất cả" : "Chọn tất cả";
}
