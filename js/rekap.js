// rekap.js - Menangani tampilan dan logika rekap absensi
const API_URL = "http://localhost:3000";

let currentViewMode = 'hari';
let currentData = [];
let preferredLayout = localStorage.getItem('rekapLayout') || 'grid'; // 'table' or 'grid'

// === Fungsi Utilitas Tanggal ===
function formatDate(date) {
    return date.toISOString().slice(0, 10);
}

function getWeekDates() {
    const today = new Date();
    const dates = [];
    // Mundur ke hari Senin
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);

    // Ambil 7 hari dari Senin
    for (let i = 0; i < 7; i++) {
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

        if (!rekapRes.ok || !siswaRes.ok) throw new Error('Gagal mengambil data');

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
        } else if (viewMode === 'bulan') {
            const monthDates = getMonthDates(specificDate);
            filteredData = rekap.filter(r => monthDates.includes(r.tanggal));
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
        alert('Gagal memuat data rekap');
    }
}

function renderTable(data) {
    const tbody = document.querySelector('#tabelRekap tbody');
    tbody.innerHTML = '';

    data.forEach((r, i) => {
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
    } else {
        dates = getMonthDates(specificDate);
    }

    // Render header hari (Senin-Minggu)
    if (viewMode !== 'hari') {
        const days = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
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

        container.appendChild(cell);
    });

    // render grid view jika 
    const gridContainerWrapper = document.getElementById('rekapGridContainer');
    if (preferredLayout === 'grid') {
        if (gridContainerWrapper) gridContainerWrapper.style.display = '';
        renderGrid(dates, data);
        // hide table view 
        document.querySelector('.table-container').style.display = 'none';
    } else {
        if (gridContainerWrapper) gridContainerWrapper.style.display = 'none';
        document.querySelector('.table-container').style.display = '';
    }
}

// logika kontrol ui
function changeViewMode(mode) {
    currentViewMode = mode;
    document.getElementById('monthSelector').style.display =
        mode === 'bulan' ? 'inline-block' : 'none';

    if (mode === 'bulan') {
        const now = new Date();
        const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        document.getElementById('monthPicker').value = yearMonth;
        loadData(mode, yearMonth);
    } else {
        loadData(mode);
    }
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

function loadBulan(yearMonth) {
    loadData('bulan', yearMonth);
}

function toggleView() {
    preferredLayout = (preferredLayout === 'grid') ? 'table' : 'grid';
    localStorage.setItem('rekapLayout', preferredLayout);
    const btn = document.getElementById('toggleViewBtn');
    if (btn) btn.textContent = `Tampilkan: ${preferredLayout === 'grid' ? 'Grid' : 'Tabel'}`;
    // rerender current view
    if (currentViewMode === 'bulan') {
        const mp = document.getElementById('monthPicker');
        loadData('bulan', mp ? mp.value : null);
    } else {
        loadData(currentViewMode);
    }
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
    if (view === 'bulan') {
        document.getElementById('monthSelector').style.display = 'inline-block';
        if (month) {
            const mp = document.getElementById('monthPicker');
            if (mp) mp.value = month;
        }
    }

    // inisialisasi toggle button label
    const toggleBtn = document.getElementById('toggleViewBtn');
    if (toggleBtn) toggleBtn.textContent = `Tampilkan: ${preferredLayout === 'grid' ? 'Grid' : 'Tabel'}`;

    if (view === 'bulan') loadData('bulan', month || null);
    else loadData(view);
});