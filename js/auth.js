// js/auth.js – FIXED ROLE DETECTION FOR ADMIN VS MAHASISWA

import { auth } from "./firebaseConfig.js";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  showNotification,
  showAppForRole,
  openTambahPembayaran,
  openTambahPengeluaran,
  exportCSV,
} from "./ui.js";

// === Elemen DOM ===
const loginPage = document.getElementById("loginPage");
const mainApp = document.getElementById("mainApp");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const loginError = document.getElementById("loginError");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");

// === Pastikan saat awal halaman dibuka, hanya login yang tampil ===
window.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 App initializing...");
  
  // Force show login page on initial load
  if (loginPage) {
    loginPage.style.display = "flex";
    loginPage.classList.remove("hidden");
  }
  
  if (mainApp) {
    mainApp.style.display = "none";
    mainApp.classList.add("hidden");
  }
  
  // Clear any error messages
  if (loginError) {
    loginError.textContent = "";
    loginError.style.display = "none";
  }
});

// === Login Function - FIXED ===
if (loginBtn) {
  loginBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    
    const email = loginEmail?.value?.trim() || '';
    const password = loginPassword?.value || '';

    // Reset error display
    if (loginError) {
      loginError.textContent = "";
      loginError.style.display = "none";
    }

    // Validation
    if (!email || !password) {
      if (loginError) {
        loginError.textContent = "Email dan password wajib diisi.";
        loginError.style.display = "block";
      }
      return;
    }

    // Disable button during login
    loginBtn.disabled = true;
    loginBtn.textContent = "Login...";

    try {
      console.log("🔐 Attempting login for:", email);
      await signInWithEmailAndPassword(auth, email, password);
      
      // Clear form
      if (loginEmail) loginEmail.value = "";
      if (loginPassword) loginPassword.value = "";
      
      console.log("✅ Login successful");
    } catch (err) {
      console.error("❌ Login error:", err);
      
      if (loginError) {
        loginError.style.display = "block";
        
        // More specific error messages
        switch (err.code) {
          case "auth/invalid-credential":
          case "auth/user-not-found":
          case "auth/wrong-password":
            loginError.textContent = "Email atau password salah.";
            break;
          case "auth/invalid-email":
            loginError.textContent = "Format email tidak valid.";
            break;
          case "auth/user-disabled":
            loginError.textContent = "Akun ini telah dinonaktifkan.";
            break;
          case "auth/network-request-failed":
            loginError.textContent = "Koneksi internet bermasalah. Periksa jaringan Anda.";
            break;
          case "auth/too-many-requests":
            loginError.textContent = "Terlalu banyak percobaan login. Coba lagi nanti.";
            break;
          default:
            loginError.textContent = `Gagal login: ${err.message}`;
        }
      }
    } finally {
      // Re-enable button
      if (loginBtn) {
        loginBtn.disabled = false;
        loginBtn.textContent = "Login";
      }
    }
  });
}

// Allow Enter key to submit login
if (loginPassword) {
  loginPassword.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && loginBtn) {
      loginBtn.click();
    }
  });
}

if (loginEmail) {
  loginEmail.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && loginBtn) {
      loginBtn.click();
    }
  });
}

// === Pantau Status Login - FIXED ROLE DETECTION ===
onAuthStateChanged(auth, async (user) => {
  console.log("🔄 Auth state changed:", user ? user.email : "No user");
  
  if (user) {
    try {
      // FIXED: Deteksi role admin HANYA berdasarkan email yang mengandung "admin"
      // Jika email mengandung "admin" = Admin
      // Jika tidak = Mahasiswa
      const isAdmin = user.email.toLowerCase().includes("admin");

      console.log("👤 User role:", isAdmin ? "Admin" : "Mahasiswa");
      console.log("📧 Email:", user.email);

      // Tampilkan halaman utama
      if (loginPage) {
        loginPage.style.display = "none";
        loginPage.classList.add("hidden");
      }
      
      if (mainApp) {
        mainApp.style.display = "block";
        mainApp.classList.remove("hidden");
      }

      // Tampilkan info user dengan label yang benar
      const userInfo = document.getElementById("userInfo");
      if (userInfo) {
        userInfo.textContent = `👤 ${user.email}${isAdmin ? " (Admin)" : " (Mahasiswa)"}`;
      }

      // Notifikasi
      showNotification("Berhasil login", "success");

      // Tampilkan fitur sesuai role
      showAppForRole(isAdmin);

      // === BUTTON VISIBILITY CONTROL ===
      const tambahDataBtn = document.getElementById("tambahDataBtn");
      const tambahPengeluaranBtn = document.getElementById("tambahPengeluaranBtn");
      const exportCsvBtn = document.getElementById("exportCsvBtn");
      const lihatRiwayatBtn = document.getElementById("lihatRiwayatBtn");
      const resetBtn = document.getElementById("resetPembayaranBtn");
      const resetSemuaBtn = document.getElementById("resetSemuaDataBtn");
      const catatanBtn = document.getElementById("lihatCatatanBtn");

      if (isAdmin) {
        // ADMIN: Semua button visible
        if (tambahDataBtn) {
          tambahDataBtn.style.display = "inline-flex";
          tambahDataBtn.onclick = () => openTambahPembayaran();
        }
        if (tambahPengeluaranBtn) {
          tambahPengeluaranBtn.style.display = "inline-flex";
          tambahPengeluaranBtn.onclick = () => openTambahPengeluaran();
        }
        if (exportCsvBtn) {
          exportCsvBtn.style.display = "inline-flex";
          exportCsvBtn.onclick = () => exportCSV();
        }
        if (lihatRiwayatBtn) {
          lihatRiwayatBtn.style.display = "inline-flex";
        }
        if (resetBtn) {
          resetBtn.style.display = "inline-flex";
        }
        if (resetSemuaBtn) {
          resetSemuaBtn.style.display = "inline-flex";
        }
        if (catatanBtn) {
          catatanBtn.style.display = "inline-flex";
        }
      } else {
        // MAHASISWA: Hanya export, riwayat, dan catatan yang visible
        if (tambahDataBtn) tambahDataBtn.style.display = "none";
        if (tambahPengeluaranBtn) tambahPengeluaranBtn.style.display = "none";
        if (resetBtn) resetBtn.style.display = "none";
        if (resetSemuaBtn) resetSemuaBtn.style.display = "none";
        
        // Mahasiswa bisa export, lihat riwayat, dan lihat catatan
        if (exportCsvBtn) {
          exportCsvBtn.style.display = "inline-flex";
          exportCsvBtn.onclick = () => exportCSV();
        }
        if (lihatRiwayatBtn) {
          lihatRiwayatBtn.style.display = "inline-flex";
        }
        if (catatanBtn) {
          catatanBtn.style.display = "inline-flex";
        }
      }
    } catch (error) {
      console.error("❌ Error setting up user:", error);
      showNotification("Terjadi kesalahan saat memuat data user", "error");
    }
  } else {
    // Belum login atau logout
    console.log("👋 User logged out");
    
    if (mainApp) {
      mainApp.style.display = "none";
      mainApp.classList.add("hidden");
    }
    
    if (loginPage) {
      loginPage.style.display = "flex";
      loginPage.classList.remove("hidden");
    }
  }
});

// === Logout Function - FIXED ===
if (logoutBtn) {
  logoutBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    
    try {
      console.log("🚪 Logging out...");
      await signOut(auth);
      showNotification("Berhasil logout", "info");
      
      // Clear forms
      if (loginEmail) loginEmail.value = "";
      if (loginPassword) loginPassword.value = "";
      if (loginError) {
        loginError.textContent = "";
        loginError.style.display = "none";
      }
      
      console.log("✅ Logout successful");
    } catch (err) {
      console.error("❌ Gagal logout:", err);
      showNotification("Terjadi kesalahan saat logout.", "error");
    }
  });
}