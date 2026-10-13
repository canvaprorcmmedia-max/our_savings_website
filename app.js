
import {
  register,
  login,
  logout,
  getCurrentUser
} from "./supabase-shared.js";

const authPanel = document.getElementById("auth-panel");
const appScreen = document.getElementById("appScreen");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const authMessage = document.getElementById("auth-message");
const logoutButton = document.getElementById("logout-button");

function showMessage(message) {
  if (authMessage) {
    authMessage.textContent = message;
  }
}

function showLogin() {
  if (authPanel) {
    authPanel.classList.remove("hidden");
    authPanel.style.display = "";
  }

  if (appScreen) {
    appScreen.classList.add("hidden");
    appScreen.style.display = "none";
  }
}

function showDashboard() {
  if (authPanel) {
    authPanel.classList.add("hidden");
    authPanel.style.display = "none";
  }

  if (appScreen) {
    appScreen.classList.remove("hidden");
    appScreen.style.display = "";
  }
}

// Daftar akun baru
registerForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document
    .getElementById("register-email")
    .value.trim();

  const password = document
    .getElementById("register-password")
    .value;

  try {
    const result = await register(email, password);

    registerForm.reset();

    if (result.session) {
      showDashboard();
      showMessage("Registrasi berhasil. Kamu sudah login.");
    } else {
      showLogin();
      showMessage(
        "Pendaftaran berhasil. Periksa email untuk konfirmasi, lalu login."
      );
    }
  } catch (error) {
    showMessage("Registrasi gagal: " + error.message);
  }
});

// Login
loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document
    .getElementById("login-email")
    .value.trim();

  const password = document
    .getElementById("login-password")
    .value;

  try {
    await login(email, password);

    loginForm.reset();

    const user = await getCurrentUser();

    if (user) {
      showDashboard();
      showMessage("Login berhasil! Halo, " + user.email);
    } else {
      showLogin();
      showMessage("Login belum terverifikasi. Silakan coba lagi.");
    }
  } catch (error) {
    showMessage("Login gagal: " + error.message);
  }
});

// Logout
logoutButton?.addEventListener("click", async () => {
  try {
    await logout();
    showLogin();
    showMessage("Kamu sudah logout.");
  } catch (error) {
    showMessage("Logout gagal: " + error.message);
  }
});

async function checkSession() {
  // Sembunyikan dashboard terlebih dahulu
  showLogin();
  showMessage("Memeriksa sesi login...");

  try {
    const user = await getCurrentUser();

    if (user) {
      // Sesi masih aktif: tampilkan dashboard
      showDashboard();
      showMessage("Kamu login sebagai " + user.email);
    } else {
      // Tidak ada sesi: tampilkan halaman login
      showLogin();
      showMessage("Silakan login atau daftar akun baru.");
    }
  } catch (error) {
    console.error("Gagal memeriksa sesi:", error);
    showLogin();
    showMessage("Sesi tidak dapat diperiksa. Silakan login kembali.");
  }
}
checkSession();