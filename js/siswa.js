// url ke basenyo
const BASE_URL = "http://localhost:3000";

const form = document.getElementById("absensiForm");
const nisInput = document.getElementById("nis");
const tokenInput = document.getElementById("token");
const notifBox = document.getElementById("notif");

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nis = nisInput.value.trim();
    const token = tokenInput.value.trim();

    if (!nis || !token) {
        showNotif("Harap isi NIS dan token!", "error");
        return;
    }

    try {
        // cek validasi tokenny
        const tokenRes = await fetch(`${BASE_URL}/token`);
        const tokenData = await tokenRes.json();

        const validToken = tokenData.find(t => t.kode === token);

        if (!validToken) {
            showNotif("Token salah atau sudah kadaluwarsa!", "error");
            return;
        }

        // kirim data absensi
        const tanggal = new Date().toISOString().split("T")[0];
        await fetch(`${BASE_URL}/rekap`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                nis,
                tanggal,
                status: "Hadir",
                waktu: new Date().toLocaleTimeString()
            })
        });

        showNotif("Absensi berhasil dikirim!", "success");
        form.reset();

    } catch (error) {
        showNotif("Terjadi kesalahan: " + error.message, "error");
    }
});

// notif
function showNotif(pesan, tipe) {
    notifBox.textContent = pesan;
    notifBox.className = tipe; // ubah warna nnti
    setTimeout(() => notifBox.textContent = "", 3000);
}