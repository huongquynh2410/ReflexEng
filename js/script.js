let database = [];
let filteredDatabase = [];
let currentItem = null;
let currentMode = '';
let promptAudio = null;
let isAllSelected = true;

// Danh sách ID dành riêng cho Roleplay Master
const ROLEPLAY_IDS = ["105", "106", "107", "108"];

const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSDiVOTUA-UZjnvzTogaMSTgb1uw7PFFp7hLLKdY_SXKJutAHuH8XbWyEGla5AGfxRftV0aUFqW81GM/pub?gid=0&single=true&output=csv';
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzxJDpRgXk_3hDVdWaE1E_teMwYzhZ5m_MF_bv9ZB58qTO5ZwgJauoQh_nhX5y5pt-i/exec';

fetch('js/data.json')
    .then(response => response.json())
    .then(data => { database = data; console.log("Data Ready!"); });

function playAudioWithSpeed(path) {
    const audio = new Audio(path);
    audio.playbackRate = parseFloat(document.getElementById('speed-select').value);
    audio.play();
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
            fetch(WEB_APP_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ email, action: 'Vào học' }) });
        } else {
            document.getElementById('login-error').classList.remove('hidden');
        }
    } catch (e) { alert("Lỗi đăng nhập!"); }
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
    
    // Lọc danh sách Day khả dụng dựa trên Mode
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
    if (selectedDays.length === 0) return alert("Chọn bài nhé!");

    // Lọc dữ liệu cuối cùng: đúng Day VÀ đúng phạm vi ID của Mode đó
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
    if (filteredDatabase.length === 0) return;
    currentItem = filteredDatabase[Math.floor(Math.random() * filteredDatabase.length)];
    const img = document.getElementById('display-img');
    const placeholder = document.getElementById('audio-placeholder');
    const fullAudioCont = document.getElementById('full-audio-container');
    const grid = document.getElementById('audio-grid');
    
    grid.innerHTML = '';
    placeholder.classList.add('hidden');
    img.classList.remove('hidden');
    fullAudioCont.classList.add('hidden');

    if (currentMode === 'roleplay') {
        img.classList.add('hidden');
        placeholder.classList.remove('hidden');
        document.getElementById('mode-title').innerText = "Roleplay Master";
        document.getElementById('mode-instruction').innerText = "Luyện hội thoại dài (Không hình ảnh):";
        
        if (currentItem.fullAudio) {
            fullAudioCont.classList.remove('hidden');
            document.getElementById('btn-play-full').onclick = () => playAudioWithSpeed(currentItem.fullAudio);
        }
        currentItem.audios.forEach((path, i) => {
            const btn = document.createElement('button'); btn.className = 'btn-audio'; btn.innerText = `Câu ${i + 1}`;
            btn.onclick = () => playAudioWithSpeed(path); grid.appendChild(btn);
        });
    } else {
        img.src = currentItem.img;
        if (currentMode === 'reflex') {
            document.getElementById('mode-title').innerText = "Phản xạ A - B";
            img.style.display = 'none';
            promptAudio = currentItem.audios[Math.floor(Math.random() * currentItem.audios.length)];
            const btn = document.createElement('button'); btn.className = 'btn-audio btn-check'; btn.innerHTML = `✅ Check Answer`;
            btn.onclick = () => { playAudioWithSpeed(currentItem.audios.find(a => a !== promptAudio)); img.style.display = 'block'; };
            grid.appendChild(btn);
        } else {
            document.getElementById('mode-title').innerText = "Học theo hình ảnh";
            img.style.display = 'block';
            currentItem.audios.forEach((path, i) => {
                const btn = document.createElement('button'); btn.className = 'btn-audio'; btn.innerText = `🔈 Person ${String.fromCharCode(65 + i)}`;
                btn.onclick = () => playAudioWithSpeed(path); grid.appendChild(btn);
            });
        }
    }
}

function handleVisualClick() { if (currentMode === 'reflex' && promptAudio) playAudioWithSpeed(promptAudio); }
function goHome() { document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden')); document.getElementById('home-screen').classList.remove('hidden'); }
