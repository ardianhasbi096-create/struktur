// js/operator-login.js
const API_URL = "http://localhost:3000";

// fungsi generate token
function generateToken() {
  const date = new Date();
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `F1${day}${month}`;
}

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  if (!loginForm) {
    console.error("Element #loginForm tidak ditemukan. Pastikan file operator-login.html punya form dengan id='loginForm'");
    return;
  }

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nickname = document.getElementById("nickname")?.value?.trim();
    const password = document.getElementById("password")?.value?.trim();

    const loginStatus = document.getElementById("loginStatus");

    if (!nickname || !password) {
      loginStatus.textContent = "Isi nickname dan password dulu.";
      loginStatus.className = "status error";
      return;
    }

    try {
      const res = await fetch(`${API_URL}/token`);
      if (!res.ok) {
        loginStatus.textContent = `Gagal mengambil data operator: ${res.status} ${res.statusText}`;
        loginStatus.className = "status error";
        throw new Error(`Fetch token gagal: ${res.status} ${res.statusText}`);
      }
      const raw = await res.json();
      const operators = Array.isArray(raw) ? raw : (Array.isArray(raw.value) ? raw.value : []);
      if (!Array.isArray(operators) || operators.length === 0) {
        alert("Data operator kosong!");
        throw new Error("Data operator kosong!");
      }
      const operator = operators.find(
        (op) => String(op.nickname) === nickname && String(op.password) === password
      );
      if (!operator) {
        loginStatus.textContent = "Login gagal! Cek nickname atau password.";
        loginStatus.className = "status error";
        return;
      }

      loginStatus.textContent = "Login berhasil! Mengalihkan ke halaman operator...";
      loginStatus.className = "status success";

      // Cek token harian (format tanggal: yyyy-mm-dd)
      const todayIso = new Date().toISOString().slice(0, 10); 
      if (String(operator.tanggal) !== todayIso) {
        // Buat token baru dengan format F1 + dd + mm
        const newTokenValue = generateToken();
        const newTokenObj = {
          ...operator,
          token_harian: newTokenValue,
          tanggal: todayIso
        };
        // pastikan id numeric untuk json-server (jika string, ubah ke number)
        const idForUrl = Number(operator.id);
        let putRes;
        try {
          putRes = await fetch(`${API_URL}/token/${idForUrl}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newTokenObj),
          });
        } catch (err) {
          loginStatus.textContent = "Gagal menghubungi server saat update token!";
          loginStatus.className = "status error";
          console.error("Gagal PUT token:", err);
          return;
        }
        if (!putRes.ok) {
          loginStatus.textContent = `Update token gagal: ${putRes.status} ${putRes.statusText}`;
          loginStatus.className = "status error";
          console.error("PUT response:", putRes);
          return;
        }

        localStorage.setItem("currentToken", newTokenValue);
      } else {
        localStorage.setItem("currentToken", operator.token_harian);
      }

      // Simpan info login dan pindah ke dashboard operator
      localStorage.setItem("operatorLogin", nickname);

      // Redirect setelah 500ms untuk memastikan pesan status terlihat
      setTimeout(() => {
        window.location.href = "operator.html";
      }, 500);
    } catch (err) {
      loginStatus.textContent = "Terjadi kesalahan saat login! Cek console (F12) untuk detail.";
      loginStatus.className = "status error";
      console.error("Error di proses login:", err);
    }
  });
});

function generateToken() {
  const today = new Date();
  const tanggal = String(today.getDate()).padStart(2, '0');
  const bulan = String(today.getMonth() + 1).padStart(2, '0');
  return `F1${tanggal}${bulan}`;

}