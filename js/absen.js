// absen.js - Logika absensi siswa
const API_URL = "http://localhost:3000";

document.addEventListener("DOMContentLoaded", () => {
    const absenForm = document.getElementById("absenForm");
    // index.html id="status"
    const statusEl = document.getElementById("status");
    const submitBtn = absenForm.querySelector('button[type="submit"]');

    absenForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const nis = document.getElementById("nis").value.trim();
        const token = document.getElementById("token").value.trim();

        if (!nis || !token) {
            showStatus("Isi NIS dan token dulu!", "error");
            return;
        }

        try {
            // status submit
            if (submitBtn) submitBtn.disabled = true;
            showStatus('Memproses...', 'info');
            // 1. Cek token valid
            const tokenRes = await fetch(`${API_URL}/token`);
            if (!tokenRes.ok) throw new Error("Gagal mengecek token");

            const tokenData = await tokenRes.json();
            // Gunakan tanggal dari database sebagai acuan, bukan dari browser
            const today = tokenData[0]?.tanggal || new Date().toISOString().slice(0, 10);
            console.log("Today (from DB):", today);
            console.log("Token data:", tokenData);
            console.log("Input token:", token);

            // Debug: cek setiap token
            tokenData.forEach(t => {
                console.log(`Token in DB: tanggal=${t.tanggal}, token_harian=${t.token_harian}`);
                console.log(`Comparing: ${t.tanggal} === ${today} && ${t.token_harian} === ${token}`);
            });

            const validToken = tokenData.find(t =>
                t.tanggal === today && t.token_harian === token
            );

            console.log("Valid token found:", validToken);

            if (!validToken) {
                showStatus("Token tidak valid atau sudah expired!", "error");
                return;
            }

            // 2. Cek NIS valid
            const siswaRes = await fetch(`${API_URL}/siswa`);
            if (!siswaRes.ok) throw new Error("Gagal mengecek data siswa");

            const siswaList = await siswaRes.json();
            const siswa = siswaList.find(s => String(s.nis) === String(nis));

            if (!siswa) {
                showStatus("NIS tidak ditemukan!", "error");
                return;
            }

            // 3. Cek apakah sudah absen hari ini
            const rekapRes = await fetch(`${API_URL}/rekap`);
            if (!rekapRes.ok) throw new Error("Gagal mengecek rekap");

            const rekapList = await rekapRes.json();
            const sudahAbsen = rekapList.find(r =>
                r.nis === nis && r.tanggal === today
            );

            if (sudahAbsen) {
                showStatus("Anda sudah absen hari ini!", "error");
                return;
            }

            // 4. Catat absensi baru status otomatis hadir
            const absenRes = await fetch(`${API_URL}/rekap`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: Date.now().toString(),
                    nis: nis,
                    tanggal: today,
                    status: "Hadir"  // Status default
                })
            });

            if (!absenRes.ok) throw new Error("Gagal mencatat absensi");

            showStatus("Absensi berhasil dicatat!", "success");

            absenForm.reset();

        } catch (err) {
            console.error("Error:", err);
            showStatus("Terjadi kesalahan sistem", "error");
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    });

    function showStatus(message, type = "success") {
        statusEl.textContent = message;
        statusEl.className = `status ${type}`;

        if (type === "success") {
            setTimeout(() => {
                statusEl.textContent = "";
                statusEl.className = "status";
            }, 10000);
        } else if (type === 'info') {
            // jaga status sampe selesai
        } else {
            // jika error, ilangin abis 5 detik
            setTimeout(() => {
                statusEl.textContent = "";
                statusEl.className = "status";
            }, 5000);
        }
    }
});