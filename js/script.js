let database = [];
let filteredDatabase = [];
let currentItem = null;
let currentMode = '';
let promptAudio = null;
let remainingAudios = [];
let isAllSelected = true;

// 1. Cấu hình các đường link kết nối Google Sheet
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSDiVOTUA-UZjnvzTogaMSTgb1uw7PFFp7hLLKdY_SXKJutAHuH8XbWyEGla5AGfxRftV0aUFqW81GM/pub?gid=0&single=true&output=csv';
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzxJDpRgXk_3hDVdWaE1E_teMwYzhZ5m_MF_bv9ZB58qTO5ZwgJauoQh_nhX5y5pt-i/exec';

// 2. Tải dữ liệu từ file JSON
fetch('js/data.json')
    .then(response => response.json())
    .then(data => {
        database = data;
        console.log("Dữ liệu Reflex Eng đã sẵn sàng!");
    })
    .catch(err => console.error("Lỗi JSON:", err));

// --- LOGIC ĐĂNG NHẬP & THEO DÕI TRUY CẬP ---
async function handleCredentialResponse(response) {
    const responsePayload = decodeJwtResponse(response.credential);
    const userEmail = responsePayload.email.toLowerCase();

    try {
        // Lấy danh sách email từ Google Sheet
        const res = await fetch(SHEET_CSV_URL);
        const csvData = await res.text();
        
        // Tối ưu: Chỉ lấy cột A và lọc bỏ các dòng trống hoặc tiêu đề không phải mail
        const allowedEmails = csvData.split(/\r?\n/)
                                     .map(line => line.split(',')[0].trim().toLowerCase())
                                     .filter(email => email.includes('@'));

        if (allowedEmails.includes(userEmail)) {
            // Đăng nhập thành công
            document.getElementById('login-screen').classList.add('hidden');
            document.getElementById('home-screen').classList.remove('hidden');

            // --- HỆ THỐNG THEO DÕI (BACKEND) ---
            // Gửi thông tin người vào học về tab Logs
            fetch(WEB_APP_URL, {
                method: 'POST',
                mode: 'no-cors', // Rất quan trọng để tránh lỗi CORS trình duyệt
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: userEmail,
                    action: 'Đã vào web học bài'
                })
            });

        } else {
            // Email không có trong danh sách
            document.getElementById('login-error').classList.remove('hidden');
            google.accounts.id.disableAutoSelect();
        }
    } catch (error) {
        alert("Lỗi kết nối. Hãy kiểm tra lại link CSV và trạng thái công bố của Google Sheet.");
    }
}

function decodeJwtResponse(token) {
    let base64Url = token.split('.')[1];
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    let jsonPayload = decodeURIComponent(window.atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
    return JSON.parse(jsonPayload);
}

// --- CÁC HÀM LOGIC HỌC TẬP (GIỮ NGUYÊN) ---
function startApp(mode) {
    currentMode = mode;
    document.getElementById('home-screen').classList.add('hidden');
    document.getElementById('day-select-screen').classList.remove('hidden');
    renderDayChecklist();
}

function renderDayChecklist() {
    const container = document.getElementById('day-checklist');
    container.innerHTML = '';
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const allDays = [...new Set(database.map(item => item.day))].sort((a, b) => 
        a.localeCompare(b, undefined, {numeric: true})
    );
    
    allDays.forEach(dayName => {
        const firstItemOfDay = database.find(item => item.day === dayName);
        let isLocked = false;
        let unlockInfo = "";

        if (firstItemOfDay.unlockDate) {
            const unlockDate = new Date(firstItemOfDay.unlockDate);
            if (unlockDate > today) {
                isLocked = true;
                unlockInfo = ` (Mở vào ${unlockDate.getDate()}/${unlockDate.getMonth() + 1})`;
            }
        }

        const label = document.createElement('label');
        label.className = `day-item ${isLocked ? 'locked' : ''}`;
        label.innerHTML = `
            <input type="checkbox" value="${dayName}" ${isLocked ? 'disabled' : 'checked'}>
            <span>${dayName}${isLocked ? unlockInfo : ''}</span>
            ${isLocked ? '<small style="display:block; font-size:10px; color:red;">Chưa đến ngày học</small>' : ''}
        `;
        container.appendChild(label);
    });
}

function confirmSelection() {
    const checkboxes = document.querySelectorAll('#day-checklist input:checked');
    const selectedDays = Array.from(checkboxes).map(cb => cb.value);
    if (selectedDays.length === 0) { alert("Bạn ơi, hãy chọn ít nhất 1 ngày!"); return; }

    filteredDatabase = database.filter(item => selectedDays.includes(item.day));
    document.getElementById('day-select-screen').classList.add('hidden');
    document.getElementById('study-screen').classList.remove('hidden');
    document.getElementById('mode-title').innerText = currentMode === 'visual' ? "Học theo hình ảnh" : "Phản xạ A - B";
    document.getElementById('mode-instruction').innerText = currentMode === 'visual' ? "Nhìn ảnh và tự nhớ hội thoại:" : "Nhấn vào tai nghe để nghe máy nói, sau đó bấm Check:";
    renderContent();
}

function renderContent() {
    if (filteredDatabase.length === 0) return;
    currentItem = filteredDatabase[Math.floor(Math.random() * filteredDatabase.length)];
    const imgElement = document.getElementById('display-img');
    const container = document.getElementById('audio-grid');
    container.innerHTML = '';

    if (currentMode === 'reflex') {
        imgElement.style.display = 'none'; 
        const pIndex = Math.floor(Math.random() * currentItem.audios.length);
        promptAudio = currentItem.audios[pIndex];
        remainingAudios = currentItem.audios.filter((_, index) => index !== pIndex);
        remainingAudios.forEach(path => {
            const btn = document.createElement('button');
            btn.className = 'btn-audio btn-check';
            btn.innerHTML = `✅ Check Answer`;
            btn.onclick = (e) => { e.stopPropagation(); new Audio(path).play(); };
            container.appendChild(btn);
        });
    } else {
        imgElement.style.display = 'block';
        imgElement.src = currentItem.img;
        currentItem.audios.forEach((path, index) => {
            const btn = document.createElement('button');
            btn.className = 'btn-audio';
            btn.innerText = `🔈 Person ${String.fromCharCode(65 + index)}`;
            btn.onclick = (e) => { e.stopPropagation(); new Audio(path).play(); };
            container.appendChild(btn);
        });
    }
}

function toggleSelectAll() {
    const checkboxes = document.querySelectorAll('#day-checklist input[type="checkbox"]');
    const btn = document.getElementById('btn-select-all');
    isAllSelected = !isAllSelected;
    checkboxes.forEach(cb => { if(!cb.disabled) cb.checked = isAllSelected; });
    btn.innerText = isAllSelected ? "Bỏ chọn tất cả" : "Chọn tất cả";
}

function handleVisualClick() {
    if (currentMode === 'reflex' && promptAudio) new Audio(promptAudio).play();
}

function goHome() {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById('home-screen').classList.remove('hidden');
}
