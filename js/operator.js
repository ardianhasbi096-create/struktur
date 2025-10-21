// operator js
const API_URL = "http://localhost:3000";

// ambil elemen penting
const tokenEl = document.getElementById("tokenAktif");
const logoutBtn = document.getElementById("logoutBtn");
const addForm = document.getElementById("addForm");
const tabelSiswa = document.getElementById("tabelSiswa").querySelector("tbody");
const tabelRekap = document.getElementById("tabelRekap").querySelector("tbody");
const filterButtons = document.querySelectorAll("#filterButtons button");

// Cek login operator
const operatorLogin = localStorage.getItem("operatorLogin");
if (!operatorLogin) {
  alert("Anda belum login sebagai operator!");
  window.location.href = "operator-login.html";
}

// Tampilan token aktif di header
async function loadToken() {
  try {
    const res = await fetch(`${API_URL}/token`);
    if (!res.ok) throw new Error(`Fetch operator gagal: ${res.status} ${res.statusText}`);
    const raw = await res.json();
    console.debug("loadToken: raw token response:", raw);
    // support response dengan value atau array langsung
    const data = Array.isArray(raw) ? raw : (Array.isArray(raw.value) ? raw.value : []);

    if (Array.isArray(data) && data.length > 0) {
      const d = new Date();
      const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const todayToken = data.find(d => d.tanggal === today);
      if (todayToken && todayToken.token_harian) {
        tokenEl.textContent = `Token: ${todayToken.token_harian}`;
      } else {
        // fallback: tampilkan token terakhir yang tersedia 
        const latest = data[0];
        tokenEl.textContent = `Token: ${latest.token_harian || '-'} (terakhir: ${latest.tanggal || 'unknown'})`;
        console.info("Tidak ada token untuk hari ini. Jika Anda baru saja login, pastikan login berhasil dan server json-server sedang berjalan sehingga token dapat diperbarui.");
      }
    } else {
      tokenEl.textContent = `Token: -`;
    }
  } catch (err) {
    console.error("Gagal ambil token:", err);
  }
}

// Load daftar siswa 
async function loadSiswa() {
  try {
    const res = await fetch(`${API_URL}/siswa`);
    const siswaList = await res.json();
    tampilkanSiswa(siswaList);
  } catch (err) {
    console.error("Gagal ambil data siswa:", err);
  }
}

function tampilkanSiswa(siswaList) {
  tabelSiswa.innerHTML = "";
  siswaList.forEach((s, i) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${i + 1}</td>
      <td>${s.nama}</td>
      <td>${s.nis}</td>
      <td><button class="aksi" onclick="hapusSiswa('${s.id}')">Hapus</button></td>
    `;
    tabelSiswa.appendChild(row);
  });
}

// Tambah siswa baru 
addForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const nama = document.getElementById("nama").value.trim();
  const nis = document.getElementById("nis").value.trim();

  if (!nama || !nis) return alert("Nama dan NIS harus diisi!");

  try {
    await fetch(`${API_URL}/siswa`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nama, nis, id: String(Date.now()) }),
    });
    addForm.reset();
    loadSiswa();
  } catch (err) {
    console.error("Gagal tambah siswa:", err);
  }
});

// Hapus siswa 
async function hapusSiswa(id) {
  if (!confirm("Yakin hapus siswa ini?")) return;
  try {
    await fetch(`${API_URL}/siswa/${id}`, { method: "DELETE" });
    loadSiswa();
  } catch (err) {
    console.error("Gagal hapus siswa:", err);
  }
}
window.hapusSiswa = hapusSiswa;

// Rekap manual (sementara) 
async function loadRekap(filter = "hari") {
  try {
    const res = await fetch(`${API_URL}/rekap`);
    const data = await res.json();

    // ambil data siswa untuk mengisi nama berdasarkan nis
    const siswaRes = await fetch(`${API_URL}/siswa`);
    const siswaList = siswaRes.ok ? await siswaRes.json() : [];

    const now = new Date();
    let filtered = [];

    if (filter === "hari") {
      const today = now.toISOString().slice(0, 10);
      filtered = data.filter((r) => r.tanggal === today);
    } else if (filter === "minggu") {
      const mingguLalu = new Date(now);
      mingguLalu.setDate(now.getDate() - 7);
      filtered = data.filter((r) => new Date(r.tanggal) >= mingguLalu);
    } else if (filter === "bulan") {
      const bulanLalu = new Date(now);
      bulanLalu.setMonth(now.getMonth() - 1);
      filtered = data.filter((r) => new Date(r.tanggal) >= bulanLalu);
    }

    // gabungkan nama siswa ke rekap (cocokkan nis sebagai string)
    const withNames = filtered.map(r => {
      const s = siswaList.find(sx => String(sx.nis) === String(r.nis));
      return { ...r, nama: s ? s.nama : 'Tidak ditemukan' };
    });

    tampilkanRekap(withNames);
  } catch (err) {
    console.error("Gagal ambil data rekap:", err);
  }
}

function tampilkanRekap(data) {
  tabelRekap.innerHTML = "";
  data.forEach((r, i) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${i + 1}</td>
      <td>${r.nama || 'Tidak ditemukan'}</td>
      <td>${r.nis}</td>
      <td>${r.tanggal}</td>
    `;
    tabelRekap.appendChild(row);
  });
}

// tombol filter rekap
filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const filter = btn.dataset.filter;
    // jika minggu, langsung redirect ke rekap page dengan query
    if (filter === 'minggu') {
      window.location.href = `rekap.html?view=minggu`;
      return;
    }
    // jika bulan, tampilkan dropdown pilihan 12 bulan terakhir (inline)
    if (filter === 'bulan') {
      buildMonthDropdown();
      const dropdown = document.getElementById('monthDropdown');
      if (dropdown) {
        dropdown.classList.remove('hidden');
        dropdown.setAttribute('aria-hidden', 'false');
      }
      return;
    }
    // default: hari
    filterButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    loadRekap(btn.dataset.filter);
  });
});

// model bulan jatuh (anjai)
function buildMonthDropdown(containerId = 'monthDropdown') {
  const dropdown = document.getElementById(containerId);
  if (!dropdown) return;
  dropdown.innerHTML = '';
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('default', { month: 'long', year: 'numeric' });
    const item = document.createElement('div');
    item.className = 'month-item';
    item.textContent = label;
    item.dataset.ym = ym;
    item.addEventListener('click', () => {
      // buka rekap.html dengan parameter
      window.location.href = `rekap.html?view=bulan&month=${ym}`;
    });
    dropdown.appendChild(item);
  }
}

// toggle dropdown
document.addEventListener('click', (e) => {
  const monthBtn = document.getElementById('monthButton');
  const monthDropdown = document.getElementById('monthDropdown');
  if (!monthBtn || !monthDropdown) return;
  if (monthBtn.contains(e.target)) {
    monthDropdown.classList.toggle('hidden');
    const hidden = monthDropdown.classList.contains('hidden');
    monthDropdown.setAttribute('aria-hidden', hidden ? 'true' : 'false');
  } else if (!monthDropdown.contains(e.target)) {
    // click outside -> hide
    monthDropdown.classList.add('hidden');
    monthDropdown.setAttribute('aria-hidden', 'true');
  }
});

// build dropdown 
document.addEventListener('DOMContentLoaded', () => buildMonthDropdown());

// Tombol logout
logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("operatorLogin");
  alert("Anda telah logout.");
  window.location.href = "operator-login.html";
});

//  Inisialisasi awal
async function init() {
  await loadToken();
  await loadSiswa();
  await loadRekap("hari");
}
init();