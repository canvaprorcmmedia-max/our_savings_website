
import {
  register,
  login,
  logout,
  getCurrentUser,
  createSharedHousehold,
  joinSharedHousehold,
  getMyHousehold,
  supabase
} from "./supabase-shared.js";

const authPanel = document.getElementById("auth-panel");
const appScreen = document.getElementById("appScreen");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const authMessage = document.getElementById("auth-message");
const logoutButton = document.getElementById("logout-button");

function showMessage(message) {
  if (authMessage) authMessage.textContent = message;
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


function createHouseholdPanel() {
  const sidebar = document.querySelector("#appScreen .sidebar");
  if (!sidebar) return null;

  let panel = document.getElementById("household-panel");
  if (panel) return panel;

  panel = document.createElement("section");
  panel.id = "household-panel";

  // Ikuti desain sidebar Our Savings
  panel.style.cssText = `
    margin: 18px 0;
    padding: 14px;
    border: 1px solid rgba(255,255,255,.16);
    border-radius: 14px;
    background: rgba(255,255,255,.06);
    color: #f5f7f6;
    box-sizing: border-box;
    min-width: 0;
  `;

  const title = document.createElement("h3");
  title.textContent = "Tabungan Bersama";
  title.style.cssText = "font-size:14px;margin:0 0 8px;";

  const description = document.createElement("p");
  description.textContent = "Buat atau gabung tabungan bersama.";
  description.style.cssText =
    "font-size:12px;line-height:1.5;opacity:.8;margin:0 0 10px;";

  const status = document.createElement("p");
  status.id = "household-status";
  status.textContent = "Memeriksa household...";
  status.style.cssText =
    "font-size:12px;line-height:1.5;overflow-wrap:anywhere;";

  const createButton = document.createElement("button");
  createButton.id = "create-household-button";
  createButton.type = "button";
  createButton.textContent = "Buat household";

  const inviteInput = document.createElement("input");
  inviteInput.id = "household-invite-input";
  inviteInput.type = "text";
  inviteInput.placeholder = "Kode undangan";
  inviteInput.autocomplete = "off";
  inviteInput.maxLength = 100;
  inviteInput.style.cssText = `
    width:100%;
    min-width:0;
    box-sizing:border-box;
    margin:8px 0;
    padding:9px;
    border:1px solid rgba(255,255,255,.25);
    border-radius:8px;
  `;

  const joinButton = document.createElement("button");
  joinButton.id = "join-household-button";
  joinButton.type = "button";
  joinButton.textContent = "Gabung household";

  const inviteCode = document.createElement("p");
  inviteCode.id = "household-invite-code";
  inviteCode.style.cssText =
    "font-size:12px;line-height:1.5;overflow-wrap:anywhere;";

  for (const button of [createButton, joinButton]) {
    button.style.cssText = `
      display:block;
      width:100%;
      box-sizing:border-box;
      margin:8px 0;
      padding:9px 10px;
      border:0;
      border-radius:8px;
      background:#d5e8df;
      color:#123e32;
      font:inherit;
      font-size:12px;
      font-weight:600;
      cursor:pointer;
    `;
  }

  panel.append(
    title,
    description,
    status,
    createButton,
    inviteInput,
    joinButton,
    inviteCode
  );

  // Letakkan di dalam sidebar, bukan sebagai kolom baru
  const sidebarBottom = sidebar.querySelector(".sidebar-bottom");
  if (sidebarBottom) {
    sidebar.insertBefore(panel, sidebarBottom);
  } else {
    sidebar.appendChild(panel);
  }

  createButton.addEventListener("click", createHousehold);
  joinButton.addEventListener("click", joinHousehold);

  return panel;
}


function setHouseholdStatus(message) {
  const el = document.getElementById("household-status");
  if (el) el.textContent = message;
}

async function refreshHousehold() {
  createHouseholdPanel();

  const codeEl = document.getElementById("household-invite-code");
  if (codeEl) codeEl.textContent = "";

  try {
    const household = await getMyHousehold();

    if (!household) {
      setHouseholdStatus("Kamu belum tergabung dalam household.");
      return;
    }

    setHouseholdStatus(
      `Household: ${household.name} · Peran: ${household.role}`
    );

    // Ambil kode undangan household milik akun yang login
    const { data, error } = await supabase
      .from("savings_households")
      .select("invite_code")
      .eq("id", household.id)
      .single();

    if (error) throw error;

    if (codeEl) {
      codeEl.textContent =
        "Kode undangan: " + data.invite_code;
    }

    const createButton =
      document.getElementById("create-household-button");
    const joinButton =
      document.getElementById("join-household-button");
    const inviteInput =
      document.getElementById("household-invite-input");

    if (createButton) createButton.disabled = true;
    if (joinButton) joinButton.disabled = true;
    if (inviteInput) inviteInput.disabled = true;
  } catch (error) {
    console.error("Gagal memuat household:", error);
    setHouseholdStatus("Gagal memuat household: " + error.message);
  }
}

async function createHousehold() {
  const button = document.getElementById("create-household-button");
  if (button) button.disabled = true;

  try {
    setHouseholdStatus("Membuat household...");

    await createSharedHousehold("Our Savings");
    await refreshHousehold();

    setHouseholdStatus("Household berhasil dibuat!");
  } catch (error) {
    console.error("Gagal membuat household:", error);
    setHouseholdStatus("Gagal membuat household: " + error.message);
  } finally {
    if (button) button.disabled = false;
  }
}

async function joinHousehold() {
  const input = document.getElementById("household-invite-input");
  const button = document.getElementById("join-household-button");
  const code = input?.value.trim();

  if (!code) {
    setHouseholdStatus("Masukkan kode undangan terlebih dahulu.");
    return;
  }

  if (button) button.disabled = true;

  try {
    setHouseholdStatus("Bergabung ke household...");

    await joinSharedHousehold(code);

    if (input) input.value = "";
    await refreshHousehold();

    setHouseholdStatus("Berhasil bergabung ke household!");
  } catch (error) {
    console.error("Gagal bergabung:", error);
    setHouseholdStatus("Gagal bergabung: " + error.message);
  } finally {
    if (button) button.disabled = false;
  }
}

// Register
registerForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("register-email").value.trim();
  const password = document.getElementById("register-password").value;

  try {
    const result = await register(email, password);
    registerForm.reset();

    if (result.session) {
      showDashboard();
      showMessage("Registrasi berhasil. Kamu sudah login.");
      await refreshHousehold();
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

  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  try {
    await login(email, password);
    loginForm.reset();

    const user = await getCurrentUser();

    if (user) {
      showDashboard();
      showMessage("Login berhasil! Halo, " + user.email);
      await refreshHousehold();
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
  showLogin();
  showMessage("Memeriksa sesi login...");

  try {
    const user = await getCurrentUser();

    if (user) {
      showDashboard();
      showMessage("Kamu login sebagai " + user.email);
      await refreshHousehold();
    } else {
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
