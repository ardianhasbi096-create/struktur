// rekap.js - Menangani tampilan dan logika rekap absensi
const API_URL = "http://localhost:3000";

let currentViewMode = 'hari';
let currentData = [];
let selectedDate = null; // untuk filter tanggal spesifik

// === Fungsi Utilitas Tanggal ===
function formatDate(date) {
    // Gunakan timezone lokal untuk menghindari masalah UTC
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getWeekDates() {
    const today = new Date();
    const dates = [];
    // Mundur ke hari Senin
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);

    // Ambil hanya 5 hari kerja (Senin-Jumat)
    for (let i = 0; i < 5; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        dates.push(formatDate(date));
    }
    return dates;
}

function getMonthDates(yearMonth = null) {
    const date = yearMonth ? new Date(yearMonth + '1') : new Date();
    const year = date.getFullYear();
    const month = date.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();

    const dates = [];
    for (let i = 1; i <= lastDay; i++) {
        const currentDate = new Date(year, month, i);
        dates.push(formatDate(currentDate));
    }
    return dates;
}

// load dan render data
async function loadData(viewMode = 'hari', specificDate = null) {
    try {
        const [rekapRes, siswaRes] = await Promise.all([
            fetch(`${API_URL}/rekap`),
            fetch(`${API_URL}/siswa`)
        ]);

        if (!rekapRes.ok || !siswaRes.ok) {
            console.warn('API tidak tersedia, menggunakan data kosong');
            // Jika API gagal, tetap render dengan data kosong
            currentData = [];
            renderTable(currentData);
            renderCalendarView(currentData, viewMode, specificDate);
            return;
        }

        const [rekap, siswa] = await Promise.all([
            rekapRes.json(),
            siswaRes.json()
        ]);

        // Filter dri mode tampilan
        let filteredData = [];
        const today = formatDate(new Date());

        if (viewMode === 'hari') {
            filteredData = rekap.filter(r => r.tanggal === today);
        } else if (viewMode === 'minggu') {
            const weekDates = getWeekDates();
            filteredData = rekap.filter(r => weekDates.includes(r.tanggal));
        }

        // Gabungkan dengan data siswa
        currentData = filteredData.map(r => {
            const siswaData = siswa.find(s => String(s.nis) === String(r.nis));
            return {
                ...r,
                nama: siswaData ? siswaData.nama : 'Tidak ditemukan'
            };
        });

        // Render tabel dan calendar view
        renderTable(currentData);
        renderCalendarView(currentData, viewMode, specificDate);
    } catch (err) {
        console.error('Error loading data:', err);
        // Jika error, tetap render dengan data kosong dan tampilkan notifikasi
        currentData = [];
        renderTable(currentData);
        renderCalendarView(currentData, viewMode, specificDate);
        showNotification('Data rekap tidak dapat dimuat, menampilkan kalender kosong', 'warning');
    }
}

function renderTable(data) {
    const tbody = document.querySelector('#tabelRekap tbody');
    const tableTitle = document.getElementById('tableTitle');
    const showAllBtn = document.getElementById('showAllBtn');
    tbody.innerHTML = '';

    // Filter data berdasarkan selectedDate jika ada
    let displayData = data;
    if (selectedDate && currentViewMode === 'minggu') {
        displayData = data.filter(r => r.tanggal === selectedDate);
        tableTitle.textContent = `Daftar Kehadiran - ${selectedDate}`;
        showAllBtn.style.display = 'inline-block';
    } else {
        tableTitle.textContent = 'Daftar Kehadiran';
        showAllBtn.style.display = 'none';
    }

    if (displayData.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="6" style="text-align: center; padding: 20px; color: #64748b;">
                Tidak ada data kehadiran untuk tanggal ini
            </td>
        `;
        tbody.appendChild(row);
    } else {
        displayData.forEach((r, i) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${i + 1}</td>
                <td>${r.nama}</td>
                <td>${r.nis}</td>
                <td>${r.tanggal}</td>
                <td>${r.status || 'Hadir'}</td>
                <td>
                    <select onchange="updateStatus('${r.id}', this.value)">
                        <option value="Hadir" ${!r.status || r.status === 'Hadir' ? 'selected' : ''}>Hadir</option>
                        <option value="Izin" ${r.status === 'Izin' ? 'selected' : ''}>Izin</option>
                        <option value="Sakit" ${r.status === 'Sakit' ? 'selected' : ''}>Sakit</option>
                        <option value="Alpa" ${r.status === 'Alpa' ? 'selected' : ''}>Alpa</option>
                    </select>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
}

function renderGrid(dates, data) {
    const gridContainer = document.getElementById('rekapGrid');
    if (!gridContainer) return;
    gridContainer.innerHTML = '';

    // filter data per tanggal
    dates.forEach(date => {
        const dayData = data.filter(r => r.tanggal === date);
        const hadir = dayData.filter(r => !r.status || r.status === 'Hadir').length;
        const izin = dayData.filter(r => r.status === 'Izin').length;
        const sakit = dayData.filter(r => r.status === 'Sakit').length;
        const alpa = dayData.filter(r => r.status === 'Alpa').length;

        const box = document.createElement('div');
        box.className = 'rekap-box';
        box.innerHTML = `
            <div class="tanggal">${date.split('-')[2]}</div>
            <div class="status ${alpa > 0 ? 'status-alpa' : (sakit > 0 ? 'status-sakit' : (izin > 0 ? 'status-izin' : 'status-hadir'))}">
                H:${hadir} I:${izin} S:${sakit} A:${alpa}
            </div>
        `;
        gridContainer.appendChild(box);
    });
}

function renderCalendarView(data, viewMode, specificDate = null) {
    const container = document.getElementById('calendarView');
    container.innerHTML = '';

    let dates;
    if (viewMode === 'hari') {
        dates = [formatDate(new Date())];
    } else if (viewMode === 'minggu') {
        dates = getWeekDates();
    }

    // Render header hari (Senin-Jumat untuk minggu)
    if (viewMode !== 'hari') {
        const days = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum'];
        days.forEach(day => {
            const cell = document.createElement('div');
            cell.className = 'date-cell header';
            cell.textContent = day;
            container.appendChild(cell);
        });
    }

    // Render cells tanggal
    dates.forEach(date => {
        const cell = document.createElement('div');
        cell.className = 'date-cell';

        const dayData = data.filter(r => r.tanggal === date);
        const total = dayData.length;
        const hadir = dayData.filter(r => !r.status || r.status === 'Hadir').length;
        const izin = dayData.filter(r => r.status === 'Izin').length;
        const sakit = dayData.filter(r => r.status === 'Sakit').length;
        const alpa = dayData.filter(r => r.status === 'Alpa').length;

        cell.innerHTML = `
            <div>${date.split('-')[2]}</div>
            <small>
                H:${hadir} I:${izin}<br>
                S:${sakit} A:${alpa}
            </small>
        `;

        if (total > 0) {
            if (alpa > 0) cell.classList.add('alpa');
            else if (izin > 0) cell.classList.add('izin');
            else if (sakit > 0) cell.classList.add('sakit');
            else cell.classList.add('hadir');
        }

        // Tambahkan event listener untuk klik tanggal (hanya untuk minggu)
        if (viewMode === 'minggu') {
            cell.style.cursor = 'pointer';
            cell.addEventListener('click', () => {
                selectedDate = date;
                renderTable(data); // Re-render tabel dengan filter tanggal
                // Highlight tanggal yang dipilih
                document.querySelectorAll('.date-cell').forEach(c => c.classList.remove('selected'));
                cell.classList.add('selected');
            });
        }

        container.appendChild(cell);
    });
}



function showDateDetails(dateStr, dayData) {
    // Buat modal untuk menampilkan detail tanggal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content date-detail-modal">
            <h3>Detail Kehadiran - ${dateStr}</h3>
            <div class="date-detail-content">
                ${dayData.length > 0 ?
            dayData.map(record => `
                        <div class="detail-item">
                            <span>NIS: ${record.nis}</span>
                            <span>Status: ${record.status || 'Hadir'}</span>
                        </div>
                    `).join('') :
            '<p>Tidak ada data kehadiran untuk tanggal ini</p>'
        }
            </div>
            <button onclick="this.closest('.modal').remove()">Tutup</button>
        </div>
    `;
    document.body.appendChild(modal);

    // Tutup modal saat klik di luar
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
}

// Fungsi notifikasi
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'warning' ? '#f59e0b' : '#10b981'};
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-weight: 500;
        animation: slideIn 0.3s ease-out;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// logika kontrol ui
function changeViewMode(mode) {
    currentViewMode = mode;
    selectedDate = null; // reset selected date saat ganti mode
    loadData(mode);
}

async function updateStatus(rekapId, newStatus) {
    try {
        const res = await fetch(`${API_URL}/rekap/${rekapId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });

        if (!res.ok) throw new Error('Gagal update status');

        // Reload data, refresh tampilan
        loadData(currentViewMode);
    } catch (err) {
        console.error('Error updating status:', err);
        alert('Gagal mengubah status kehadiran');
    }
}



function toggleView() {
    // Mode grid sudah dihapus, jadi fungsi ini tidak diperlukan lagi
    // Tetap ada untuk kompatibilitas jika ada referensi di HTML
    return;
}

function showAllData() {
    selectedDate = null;
    renderTable(currentData);
    // Remove highlight dari semua tanggal
    document.querySelectorAll('.date-cell').forEach(c => c.classList.remove('selected'));
}

// Inisialisasi
document.addEventListener('DOMContentLoaded', () => {
    // baca parameter url
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view') || 'hari';
    const month = params.get('month');

    // set kontrol ui
    const viewSelect = document.getElementById('viewMode');
    if (viewSelect) viewSelect.value = view;

    // Mode grid sudah dihapus, tidak perlu inisialisasi toggle button

    loadData(view);
});