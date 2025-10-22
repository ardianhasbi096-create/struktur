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
      const operator = data[0]; // Ambil operator pertama (asumsi hanya satu)

      // Selalu cek dan update token jika tanggal berbeda
      if (operator.tanggal !== today) {
        const newTokenValue = generateToken();
        const newTokenObj = {
          ...operator,
          token_harian: newTokenValue,
          tanggal: today
        };

        try {
          const putRes = await fetch(`${API_URL}/token/${operator.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newTokenObj),
          });

          if (putRes.ok) {
            console.info("Token berhasil diupdate otomatis untuk hari ini");
            tokenEl.textContent = `Token: ${newTokenValue}`;
          } else {
            console.error("Gagal update token otomatis:", putRes.status);
            tokenEl.textContent = `Token: -`;
          }
        } catch (err) {
          console.error("Error updating token otomatis:", err);
          tokenEl.textContent = `Token: -`;
        }
      } else {
        // Tanggal sama, tampilkan token yang ada
        tokenEl.textContent = `Token: ${operator.token_harian}`;
      }
    } else {
      tokenEl.textContent = `Token: -`;
    }
  } catch (err) {
    console.error("Gagal ambil token:", err);
  }
}

// Fungsi untuk update token otomatis jika tanggal berbeda
async function updateTokenIfNeeded(data, today) {
  if (!Array.isArray(data) || data.length === 0) return false;

  const operator = data[0]; // Ambil operator pertama (asumsi hanya satu)
  if (operator.tanggal !== today) {
    // Generate token baru
    const newTokenValue = generateToken();
    const newTokenObj = {
      ...operator,
      token_harian: newTokenValue,
      tanggal: today
    };

    try {
      const putRes = await fetch(`${API_URL}/token/${operator.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTokenObj),
      });

      if (!putRes.ok) {
        console.error("Gagal update token otomatis:", putRes.status);
        return false;
      } else {
        console.info("Token berhasil diupdate otomatis untuk hari ini");
        return true;
      }
    } catch (err) {
      console.error("Error updating token otomatis:", err);
      return false;
    }
  }
  return false;
}

// Fungsi generate token (sama seperti di operator-login.js)
function generateToken() {
  const date = new Date();
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `F1${day}${month}`;
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

// Fungsi untuk update status rekap
async function updateStatus(rekapId, newStatus) {
  try {
    const res = await fetch(`${API_URL}/rekap/${rekapId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });

    if (!res.ok) throw new Error('Gagal update status');

    // Reload data setelah update
    await loadRekap("hari");
  } catch (err) {
    console.error('Error updating status:', err);
    alert('Gagal mengubah status kehadiran');
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
      <td>${r.status || 'Hadir'}</td>
      <td>
        <select onchange="updateStatus('${r.id}', this.value)">
          <option value="Hadir" ${r.status === 'Hadir' ? 'selected' : ''}>Hadir</option>
          <option value="Izin" ${r.status === 'Izin' ? 'selected' : ''}>Izin</option>
          <option value="Sakit" ${r.status === 'Sakit' ? 'selected' : ''}>Sakit</option>
          <option value="Alpa" ${r.status === 'Alpa' ? 'selected' : ''}>Alpa</option>
        </select>
      </td>
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
    // default: hari
    filterButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    loadRekap(btn.dataset.filter);
  });
});



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