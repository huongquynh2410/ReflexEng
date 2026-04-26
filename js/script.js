let database = [];
let filteredDatabase = [];
let currentItem = null;
let currentMode = '';
let promptAudio = null;
let remainingAudios = [];
let isAllSelected = true;

const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSDiVOTUA-UZjnvzTogaMSTgb1uw7PFFp7hLLKdY_SXKJutAHuH8XbWyEGla5AGfxRftV0aUFqW81GM/pub?gid=0&single=true&output=csv';
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzxJDpRgXk_3hDVdWaE1E_teMwYzhZ5m_MF_bv9ZB58qTO5ZwgJauoQh_nhX5y5pt-i/exec';

fetch('js/data.json')
    .then(response => response.json())
    .then(data => {
        database = data;
        console.log("Dữ liệu đã sẵn sàng!");
    })
    .catch(err => console.error("Lỗi JSON:", err));

function playAudioWithSpeed(path) {
    const audio = new Audio(path);
    const speed = document.getElementById('speed-select').value;
    audio.playbackRate = parseFloat(speed);
    audio.play();
}

async function handleCredentialResponse(response) {
    const responsePayload = decodeJwtResponse(response.credential);
    const userEmail = responsePayload.email.toLowerCase();

    try {
        const res = await fetch(SHEET_CSV_URL);
        const csvData = await res.text();
        const allowedEmails = csvData.split(/\r?\n/).map(line => line.split(',')[0].trim().toLowerCase()).filter(e => e.includes('@'));

        if (allowedEmails.includes(userEmail)) {
            document.getElementById('login-screen').classList.add('hidden');
            document.getElementById('home-screen').classList.remove('hidden');
            fetch(WEB_APP_URL, {
                method: 'POST',
                mode: 'no-cors',
                body: JSON.stringify({ email: userEmail, action: 'Học viên đã vào web' })
            });
        } else {
            document.getElementById('login-error').classList.remove('hidden');
            google.accounts.id.disableAutoSelect();
        }
    } catch (error) { alert("Lỗi kết nối server!"); }
}

function decodeJwtResponse(token) {
    let base64Url = token.split('.')[1];
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(window.atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')));
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
    const allDays = [...new Set(database.map(item => item.day))].sort((a, b) => a.localeCompare(b, undefined, {numeric: true}));
    allDays.forEach(dayName => {
        const label = document.createElement('label');
        label.className = 'day-item';
        label.innerHTML = `<input type="checkbox" value="${dayName}" checked> <span>${dayName}</span>`;
        container.appendChild(label);
    });
}

function confirmSelection() {
    const checkboxes = document.querySelectorAll('#day-checklist input:checked');
    const selectedDays = Array.from(checkboxes).map(cb => cb.value);
    if (selectedDays.length === 0) return alert("Chọn ít nhất 1 bài nhé!");
    filteredDatabase = database.filter(item => selectedDays.includes(item.day));
    document.getElementById('day-select-screen').classList.add('hidden');
    document.getElementById('study-screen').classList.remove('hidden');
    renderContent();
}

function renderContent() {
    if (filteredDatabase.length === 0) return;
    currentItem = filteredDatabase[Math.floor(Math.random() * filteredDatabase.length)];
    const imgElement = document.getElementById('display-img');
    const placeholder = document.getElementById('audio-placeholder');
    const container = document.getElementById('audio-grid');
    container.innerHTML = '';

    placeholder.classList.add('hidden');
    imgElement.classList.remove('hidden');

    if (currentMode === 'roleplay') {
        imgElement.classList.add('hidden');
        placeholder.classList.remove('hidden');
        document.getElementById('mode-title').innerText = "Roleplay Master";
        document.getElementById('mode-instruction').innerText = "Luyện phản xạ âm thanh:";
        currentItem.audios.forEach((path, index) => {
            const btn = document.createElement('button');
            btn.className = 'btn-audio';
            btn.innerText = `Câu ${index + 1}`;
            btn.onclick = () => playAudioWithSpeed(path);
            container.appendChild(btn);
        });
    } else {
        imgElement.src = currentItem.img;
        if (currentMode === 'reflex') {
            document.getElementById('mode-title').innerText = "Phản xạ A - B";
            document.getElementById('mode-instruction').innerText = "Nghe câu hỏi và đối đáp lại:";
            imgElement.style.display = 'none';
            const pIndex = Math.floor(Math.random() * currentItem.audios.length);
            promptAudio = currentItem.audios[pIndex];
            const btn = document.createElement('button');
            btn.className = 'btn-audio btn-check';
            btn.innerHTML = `✅ Check Answer`;
            btn.onclick = () => {
                const reply = currentItem.audios.find(a => a !== promptAudio);
                if(reply) playAudioWithSpeed(reply);
                imgElement.style.display = 'block';
            };
            container.appendChild(btn);
        } else {
            document.getElementById('mode-title').innerText = "Học theo hình ảnh";
            document.getElementById('mode-instruction').innerText = "Nhìn ảnh và nhớ lại hội thoại:";
            imgElement.style.display = 'block';
            currentItem.audios.forEach((path, index) => {
                const btn = document.createElement('button');
                btn.className = 'btn-audio';
                btn.innerText = `🔈 Person ${String.fromCharCode(65 + index)}`;
                btn.onclick = () => playAudioWithSpeed(path);
                container.appendChild(btn);
            });
        }
    }
}

function handleVisualClick() {
    if (currentMode === 'reflex' && promptAudio) playAudioWithSpeed(promptAudio);
}

function goHome() {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById('home-screen').classList.remove('hidden');
}

function toggleSelectAll() {
    isAllSelected = !isAllSelected;
    document.querySelectorAll('#day-checklist input').forEach(cb => cb.checked = isAllSelected);
    document.getElementById('btn-select-all').innerText = isAllSelected ? "Bỏ chọn tất cả" : "Chọn tất cả";
}
