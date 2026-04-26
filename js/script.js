let database = [];
let filteredDatabase = [];
let currentItem = null;
let currentMode = '';
let promptAudio = null;
let isAllSelected = true;

// Danh sách ID dành riêng cho Roleplay Master
const ROLEPLAY_IDS = ["105", "106", "107", "108"];

// Cấu hình URL
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSDiVOTUA-UZjnvzTogaMSTgb1uw7PFFp7hLLKdY_SXKJutAHuH8XbWyEGla5AGfxRftV0aUFqW81GM/pub?gid=0&single=true&output=csv';
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzxJDpRgXk_3hDVdWaE1E_teMwYzhZ5m_MF_bv9ZB58qTO5ZwgJauoQh_nhX5y5pt-i/exec';

// Tải dữ liệu từ JSON
fetch('js/data.json')
    .then(response => response.json())
    .then(data => { 
        database = data; 
        console.log("Data Ready!"); 
    });

// Hàm hỗ trợ tra cứu tiêu đề cho Roleplay Mode
function getLessonTitle(id) {
    const titles = {
        "105": "AT THE STORE",
        "106": "AT THE MEETING",
        "107": "AT THE SHOP",
        "108": "AT THE OFFICE"
    };
    return titles[id] || "ROLEPLAY MODE";
}

// Hàm phát âm thanh kèm tốc độ tùy chỉnh
function playAudioWithSpeed(path) {
    if (!path) return;
    const audio = new Audio(path);
    const speed = document.getElementById('speed-select').value;
    audio.playbackRate = parseFloat(speed);
    audio.play();
}

// Xử lý đăng nhập Google
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
            // Log thông tin về Google Sheet
            fetch(WEB_APP_URL, { 
                method: 'POST', 
                mode: 'no-cors', 
                body: JSON.stringify({ email, action: 'Vào học Reflex Eng' }) 
            });
        } else {
            document.getElementById('login-error').classList.remove('hidden');
            google.accounts.id.disableAutoSelect();
        }
    } catch (e) { 
        alert("Lỗi kết nối dữ liệu!"); 
    }
}

// Khởi chạy ứng dụng theo chế độ
function startApp(mode) {
    currentMode = mode;
    document.getElementById('home-screen').classList.add('hidden');
    document.getElementById('day-select-screen').classList.remove('hidden');
    renderDayChecklist();
}

// Hiển thị danh sách Day (lọc theo Mode)
function renderDayChecklist() {
    const container = document.getElementById('day-checklist');
    container.innerHTML = '';
    
    // Lọc: Mode 3 chỉ hiện ID 105-108, Mode 1&2 hiện các bài còn lại
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

// Xác nhận bài học đã chọn
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

// Hiển thị nội dung học tập
function renderContent() {
    if (filteredDatabase.length === 0) return;
    currentItem = filteredDatabase[Math.floor(Math.random() * filteredDatabase.length)];
    
    const img = document.getElementById('display-img');
    const placeholder = document.getElementById('audio-placeholder');
    const fullAudioCont = document.getElementById('full-audio-container');
    const grid = document.getElementById('audio-grid');
    
    // Reset giao diện
    grid.innerHTML = '';
    placeholder.classList.add('hidden');
    img.classList.remove('hidden');
    fullAudioCont.classList.add('hidden');

    if (currentMode === 'roleplay') {
        // Giao diện không hình ảnh
        img.classList.add('hidden');
        placeholder.classList.remove('hidden');
        
        // Cập nhật tiêu đề theo bối cảnh
        const titleElement = placeholder.querySelector('p');
        if (titleElement) titleElement.innerText = getLessonTitle(currentItem.id);
        
        document.getElementById('mode-title').innerText = "Roleplay Master";
        document.getElementById('mode-instruction').innerText = "Luyện hội thoại dài:";
        
        if (currentItem.fullAudio) {
            fullAudioCont.classList.remove('hidden');
            document.getElementById('btn-play-full').onclick = () => playAudioWithSpeed(currentItem.fullAudio);
        }
        
        // Tạo nút cho từng câu thoại
        currentItem.audios.forEach((path, i) => {
            const btn = document.createElement('button'); 
            btn.className = 'btn-audio'; 
            btn.innerText = `Câu ${i + 1}`;
            btn.onclick = (e) => { e.stopPropagation(); playAudioWithSpeed(path); };
            grid.appendChild(btn);
        });
    } else {
        // Giao diện có hình ảnh (Visual & Reflex)
        img.src = currentItem.img;
        
        if (currentMode === 'reflex') {
            document.getElementById('mode-title').innerText = "Phản xạ A - B";
            document.getElementById('mode-instruction').innerText = "Nghe máy nói và đối đáp lại:";
            img.style.display = 'none';
            
            promptAudio = currentItem.audios[Math.floor(Math.random() * currentItem.audios.length)];
            
            const btn = document.createElement('button'); 
            btn.className = 'btn-audio btn-check'; 
            btn.innerHTML = `✅ Check Answer`;
            btn.onclick = (e) => { 
                e.stopPropagation();
                const reply = currentItem.audios.find(a => a !== promptAudio);
                if (reply) playAudioWithSpeed(reply); 
                img.style.display = 'block'; 
            };
            grid.appendChild(btn);
        } else {
            document.getElementById('mode-title').innerText = "Học theo hình ảnh";
            document.getElementById('mode-instruction').innerText = "Nhìn ảnh và nhớ lại hội thoại:";
            img.style.display = 'block';
            
            currentItem.audios.forEach((path, i) => {
                const btn = document.createElement('button'); 
                btn.className = 'btn-audio'; 
                btn.innerText = `🔈 Person ${String.fromCharCode(65 + i)}`;
                btn.onclick = (e) => { e.stopPropagation(); playAudioWithSpeed(path); };
                grid.appendChild(btn);
            });
        }
    }
}

// Xử lý khi click vào khung ảnh (cho chế độ Reflex)
function handleVisualClick() { 
    if (currentMode === 'reflex' && promptAudio) playAudioWithSpeed(promptAudio); 
}

// Quay lại trang chủ
function goHome() { 
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden')); 
    document.getElementById('home-screen').classList.remove('hidden'); 
}

// Chọn/Bỏ chọn tất cả Day
function toggleSelectAll() {
    const checkboxes = document.querySelectorAll('#day-checklist input');
    const btn = document.getElementById('btn-select-all');
    isAllSelected = !isAllSelected;
    checkboxes.forEach(cb => cb.checked = isAllSelected);
    btn.innerText = isAllSelected ? "Bỏ chọn tất cả" : "Chọn tất cả";
}
