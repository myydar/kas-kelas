/**
 * setupFirebaseUsers.js
 * 
 * Script untuk membuat akun pengguna di Firebase Authentication
 * dan menandai admin dengan custom claim { admin: true }.
 * 
 * Jalankan dengan:
 *    node setupFirebaseUsers.js
 * 
 * Pastikan:
 *  - Sudah install Node.js
 *  - Sudah jalankan `npm install firebase-admin`
 *  - File service account JSON ada di folder yang sama
 */

import admin from "firebase-admin";
import fs from "fs";

// ====== Ganti nama file sesuai file service account kamu ======
const serviceAccount = JSON.parse(
  fs.readFileSync("./kas-kelas-6ce90-firebase-adminsdk-fbsvc-6a21d16e79.json", "utf8")
);

// Inisialisasi Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const auth = admin.auth();

// ====== DAFTAR AKUN ======
// Format email: nama@kelasif24a.local
// Password sesuai dari file aslimu

const users = [
  // --- Admin ---
  {
    name: "Atila Faturrahman Pratama",
    email: "atila@kelasif24a.local",
    password: "atilafp200506",
    role: "admin",
  },
  {
    name: "Mohamad Hilmy Haidar",
    email: "hilmy@kelasif24a.local",
    password: "hilmy_703",
    role: "admin",
  },

  // --- Mahasiswa lainnya ---
  { name: "Aan Rifandi", email: "aan@kelasif24a.local", password: "aanif24a" },
  { name: "Ahmad Arifin", email: "arifin@kelasif24a.local", password: "arifinif24a" },
  { name: "Ahmad Hafizh", email: "ahmad@kelasif24a.local", password: "ahmadif24a" },
  { name: "Alfi Latifatul Munawaroh", email: "alfi@kelasif24a.local", password: "alfiif24a" },
  { name: "Alyaluna Sasmita", email: "alya@kelasif24a.local", password: "alyaif24a" },
  { name: "Angga Pratama Putra", email: "angga@kelasif24a.local", password: "anggaif24a" },
  { name: "Anwar Ramadhan", email: "anwar@kelasif24a.local", password: "anwarif24a" },
  { name: "Aditya Shaid Rahmatullah", email: "adit@kelasif24a.local", password: "aditif24a" },
  { name: "Daffa Andhika Pratama", email: "daffa@kelasif24a.local", password: "daffaif24a" },
  { name: "Dannys Panji Kurniawan", email: "dannys@kelasif24a.local", password: "dannysif24a" },
  { name: "Dimaz Wahyudy", email: "dimaz@kelasif24a.local", password: "dimazif24a" },
  { name: "Fahry Rasyidinata Putra", email: "fahry@kelasif24a.local", password: "fahryif24a" },
  { name: "Fairuz Putra Sema", email: "fairuz@kelasif24a.local", password: "fairuzif24a" },
  { name: "Fitri Romaulita Pasaribu", email: "fitri@kelasif24a.local", password: "fitriif24a" },
  { name: "Habiburrohman Azzami", email: "azzami@kelasif24a.local", password: "azzamiif24a" },
  { name: "Hafiz Bahaudin Akmal", email: "hafiz@kelasif24a.local", password: "hafizif24a" },
  { name: "Indah Rahmawati", email: "indah@kelasif24a.local", password: "indahif24a" },
  { name: "Lutfi Alamsyah Harahap", email: "luthfi@kelasif24a.local", password: "luthfiif24a" },
  { name: "Muhammad Fadhil Alhakim", email: "fadhil@kelasif24a.local", password: "fadhilif24a" },
  { name: "Muhammad Hilal Al Mufid", email: "hilal@kelasif24a.local", password: "hilalif24a" },
  { name: "Nawaf Ghifari Ikhwan", email: "nawaf@kelasif24a.local", password: "nawafif24a" },
  { name: "Nur Mukhlisin", email: "nur@kelasif24a.local", password: "nurif24a" },
  { name: "Rakha Rafid Fahrezi", email: "rakha@kelasif24a.local", password: "rakhaif24a" },
  { name: "Rio Rasyha Syadzily", email: "rio@kelasif24a.local", password: "rioif24a" },
  { name: "Sekar Listyana Kartika", email: "sekar@kelasif24a.local", password: "sekarif24a" },
  { name: "Septian Eka Putra", email: "septian@kelasif24a.local", password: "septianif24a" },
  { name: "Suci Nur Saffrilia Dewi", email: "suci@kelasif24a.local", password: "suciif24a" },
  { name: "Tiara Putri Aulia", email: "tiara@kelasif24a.local", password: "tiaraif24a" },
  { name: "Zaidi Dzakwan", email: "zaidi@kelasif24a.local", password: "zaidiif24a" },
  // Tambahkan sisanya sesuai daftar kamu...
];

// ====== FUNGSI UTAMA ======

async function createUsers() {
  for (const u of users) {
    try {
      // Cek apakah user sudah ada
      let userRecord;
      try {
        userRecord = await auth.getUserByEmail(u.email);
        console.log(`✅ ${u.email} sudah ada`);
      } catch {
        userRecord = await auth.createUser({
          email: u.email,
          password: u.password,
          displayName: u.name,
        });
        console.log(`✨ Akun dibuat: ${u.email}`);
      }

      // Tambahkan custom claim jika admin
      if (u.role === "admin") {
        await auth.setCustomUserClaims(userRecord.uid, { admin: true });
        console.log(`🔑 ${u.email} diberi role admin`);
      }
    } catch (error) {
      console.error(`❌ Gagal untuk ${u.email}:`, error.message);
    }
  }

  console.log("\n✅ Semua akun sudah diproses.");
  process.exit();
}

createUsers();
