
import { createClient } from
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// Ganti dua nilai ini dengan kredensial dari project Supabase kamu.
const SUPABASE_URL = "https://ahiukgfaqayhpfvjntbb.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_SAM_GEcvlLgBQLouXHs09g_x_ho4DDa";

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

// Mendaftarkan akun baru.
export async function register(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });

  if (error) throw error;
  return data;
}

// Login akun yang sudah terdaftar.
export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;
  return data;
}

// Logout.
export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Mendapatkan pengguna yang sedang login.
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error) throw error;
  return data.user;
}

// Membuat ruang tabungan bersama.
// Pengguna harus login terlebih dahulu.
export async function createSharedHousehold(
  name = "Our Savings"
) {
  const { data, error } = await supabase.rpc(
    "create_savings_household",
    { p_name: name }
  );

  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

// Bergabung ke ruang tabungan menggunakan kode undangan.
export async function joinSharedHousehold(inviteCode) {
  const { data, error } = await supabase.rpc(
    "join_savings_household",
    { p_invite_code: inviteCode.trim() }
  );

  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

// Mengambil informasi ruang tabungan milik pengguna.
export async function getMyHousehold() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Silakan login terlebih dahulu.");
  }

  const { data: membership, error: membershipError } =
    await supabase
      .from("savings_household_members")
      .select("household_id, role")
      .eq("user_id", user.id)
      .maybeSingle();

  if (membershipError) throw membershipError;
  if (!membership) return null;

  const { data: household, error: householdError } =
    await supabase
      .from("savings_households")
      .select("id, name")
      .eq("id", membership.household_id)
      .single();

  if (householdError) throw householdError;

  return {
    ...household,
    role: membership.role
  };
}
