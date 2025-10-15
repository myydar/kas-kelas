// js/firestore.js - FIXED IMPORT PATH
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  orderBy,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./firebaseConfig.js";
import { renderPembayaran, renderPengeluaran, updateSummaryUI, showNotification } from "./ui.js";

// Global variable to store current admin status
let currentIsAdmin = false;

// realtime listeners wrapper
export function initFirestoreListeners(isAdmin) {
  currentIsAdmin = isAdmin;
  
  onSnapshot(collection(db, "pembayaran"), (snap) => {
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderPembayaran(data, isAdmin);
    refreshSummary();
  });

  onSnapshot(collection(db, "pengeluaran"), (snap) => {
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderPengeluaran(data, isAdmin);
    refreshSummary();
  });
  
  // Listen to rekap_bulanan changes for real-time summary updates
  onSnapshot(collection(db, "rekap_bulanan"), () => {
    refreshSummary();
  });
}

// === PEMBAYARAN CRUD ===
export async function tambahPembayaran({ nama, bulan, tahun, jumlahPerMinggu }) {
  try {
    await addDoc(collection(db, "pembayaran"), {
      nama,
      bulan,
      tahun: parseInt(tahun),
      minggu: [false, false, false, false],
      jumlahPerMinggu: Number(jumlahPerMinggu),
      createdAt: serverTimestamp()
    });
    showNotification("Data pembayaran berhasil ditambahkan.", "success");
    
    // Update rekap setelah tambah data
    await updateMonthlyRecap();
  } catch (err) {
    console.error(err);
    showNotification("Gagal menambah pembayaran.", "error");
  }
}

export async function updateMingguPembayaran(id, mingguIndex, value) {
  try {
    const ref = doc(db, "pembayaran", id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data();
    const minggu = Array.isArray(data.minggu) ? [...data.minggu] : [false,false,false,false];
    minggu[mingguIndex] = !!value;
    await updateDoc(ref, { minggu });
    
    // Update rekap setelah update minggu
    await updateMonthlyRecap();
  } catch (err) {
    console.error(err);
  }
}

export async function ubahBulanTahun(id, bulanBaru, tahunBaru) {
  try {
    const ref = doc(db, "pembayaran", id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data();
    
    // CEK apakah bulan lama sudah ada di riwayat (untuk mencegah duplikasi)
    const existingRiwayatQuery = query(
      collection(db, "riwayat_pembayaran"),
      where("nama", "==", data.nama),
      where("bulan", "==", data.bulan),
      where("tahun", "==", data.tahun)
    );
    const existingRiwayatSnap = await getDocs(existingRiwayatQuery);
    
    // Hanya simpan ke riwayat jika belum ada
    if (existingRiwayatSnap.empty) {
      const paidCount = (data.minggu || []).filter(Boolean).length;
      const totalBayar = paidCount * (data.jumlahPerMinggu || 0);
      
      await addDoc(collection(db, "riwayat_pembayaran"), {
        originalId: id,
        nama: data.nama,
        bulan: data.bulan,
        tahun: data.tahun,
        minggu: data.minggu,
        jumlahPerMinggu: data.jumlahPerMinggu,
        totalBayar: totalBayar,
        movedAt: serverTimestamp(),
        keterangan: "Pindah bulan/tahun"
      });
    }
    
    // CEK apakah bulan BARU sudah ada di riwayat
    const targetRiwayatQuery = query(
      collection(db, "riwayat_pembayaran"),
      where("nama", "==", data.nama),
      where("bulan", "==", bulanBaru),
      where("tahun", "==", parseInt(tahunBaru))
    );
    const targetRiwayatSnap = await getDocs(targetRiwayatQuery);
    
    let mingguBaru = [false, false, false, false];
    
    // Jika bulan baru sudah pernah ada di riwayat, ambil data minggu-nya
    if (!targetRiwayatSnap.empty) {
      const riwayatData = targetRiwayatSnap.docs[0].data();
      mingguBaru = riwayatData.minggu || [false, false, false, false];
      console.log(`✅ Memuat data dari riwayat untuk ${bulanBaru} ${tahunBaru}:`, mingguBaru);
    }
    
    // Update active record dengan data dari riwayat (jika ada)
    await updateDoc(ref, {
      bulan: bulanBaru,
      tahun: parseInt(tahunBaru),
      minggu: mingguBaru
    });
    
    const message = targetRiwayatSnap.empty 
      ? "Bulan/Tahun berhasil diubah." 
      : "Bulan/Tahun berhasil diubah. Data pembayaran dimuat dari riwayat.";
    
    showNotification(message, "success");
    
    // Update rekap setelah ubah bulan/tahun
    await updateMonthlyRecap();
  } catch (err) {
    console.error(err);
    showNotification("Gagal mengubah bulan/tahun.", "error");
  }
}

export async function hapusPembayaran(id) {
  try {
    await deleteDoc(doc(db, "pembayaran", id));
    showNotification("Data pembayaran dihapus.", "info");
    
    // Update rekap setelah hapus data
    await updateMonthlyRecap();
  } catch (err) {
    console.error(err);
  }
}

// === PENGELUARAN CRUD ===
export async function tambahPengeluaran({ keterangan, jumlah }) {
  try {
    const newDoc = await addDoc(collection(db, "pengeluaran"), {
      keterangan,
      jumlah: Number(jumlah),
      tanggal: new Date().toISOString(),
      createdAt: serverTimestamp()
    });
    
    // Simpan catatan pengeluaran ke collection terpisah untuk audit trail
    await addDoc(collection(db, "catatan_pengeluaran"), {
      pengeluaranId: newDoc.id,
      keterangan,
      jumlah: Number(jumlah),
      tanggal: new Date().toISOString(),
      aksi: "TAMBAH",
      timestamp: serverTimestamp()
    });
    
    showNotification("Pengeluaran ditambahkan.", "success");
    
    // Update rekap setelah tambah pengeluaran
    await updateMonthlyRecap();
  } catch (err) {
    console.error(err);
    showNotification("Gagal menambah pengeluaran.", "error");
  }
}

export async function hapusPengeluaran(id) {
  try {
    const ref = doc(db, "pengeluaran", id);
    const snap = await getDoc(ref);
    
    if (snap.exists()) {
      const data = snap.data();
      
      // Simpan catatan penghapusan
      await addDoc(collection(db, "catatan_pengeluaran"), {
        pengeluaranId: id,
        keterangan: data.keterangan,
        jumlah: data.jumlah,
        tanggal: data.tanggal,
        aksi: "HAPUS",
        timestamp: serverTimestamp()
      });
    }
    
    await deleteDoc(ref);
    showNotification("Pengeluaran dihapus.", "info");
    
    // Update rekap setelah hapus pengeluaran
    await updateMonthlyRecap();
  } catch (err) {
    console.error(err);
  }
}

// === RIWAYAT VIEW ===
export async function loadRiwayatByNama(nama) {
  try {
    // Query tanpa orderBy dulu untuk debugging
    const q = query(
      collection(db, "riwayat_pembayaran"), 
      where("nama", "==", nama)
    );
    const snap = await getDocs(q);
    
    // Sort manual di JavaScript
    const results = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    results.sort((a, b) => {
      const dateA = a.movedAt?.toDate ? a.movedAt.toDate() : new Date(0);
      const dateB = b.movedAt?.toDate ? b.movedAt.toDate() : new Date(0);
      return dateB - dateA; // Descending (terbaru dulu)
    });
    
    console.log(`📜 Riwayat untuk ${nama}:`, results.length, "records");
    return results;
  } catch (err) {
    console.error("Error loading riwayat by nama:", err);
    
    // Fallback: coba tanpa where clause jika ada error
    try {
      const allSnap = await getDocs(collection(db, "riwayat_pembayaran"));
      const filtered = allSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(d => d.nama === nama)
        .sort((a, b) => {
          const dateA = a.movedAt?.toDate ? a.movedAt.toDate() : new Date(0);
          const dateB = b.movedAt?.toDate ? b.movedAt.toDate() : new Date(0);
          return dateB - dateA;
        });
      
      console.log(`📜 Riwayat (fallback) untuk ${nama}:`, filtered.length, "records");
      return filtered;
    } catch (fallbackErr) {
      console.error("Fallback also failed:", fallbackErr);
      return [];
    }
  }
}

export async function loadAllRiwayat() {
  try {
    const snap = await getDocs(collection(db, "riwayat_pembayaran"));
    
    // Sort manual di JavaScript
    const results = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    results.sort((a, b) => {
      const dateA = a.movedAt?.toDate ? a.movedAt.toDate() : new Date(0);
      const dateB = b.movedAt?.toDate ? b.movedAt.toDate() : new Date(0);
      return dateB - dateA; // Descending (terbaru dulu)
    });
    
    console.log("📜 Total riwayat:", results.length, "records");
    return results;
  } catch (err) {
    console.error("Error loading all riwayat:", err);
    return [];
  }
}

export async function loadRiwayatAllByNama(nama) {
  return await loadRiwayatByNama(nama);
}

// === EDIT RIWAYAT (ADMIN ONLY) - NEW FEATURE ===
export async function updateRiwayatPembayaran(riwayatId, mingguBaru) {
  try {
    const ref = doc(db, "riwayat_pembayaran", riwayatId);
    const snap = await getDoc(ref);
    
    if (!snap.exists()) {
      showNotification("Data riwayat tidak ditemukan.", "error");
      return false;
    }
    
    const data = snap.data();
    const paidCount = (mingguBaru || []).filter(Boolean).length;
    const totalBayar = paidCount * (data.jumlahPerMinggu || 0);
    
    // Update riwayat
    await updateDoc(ref, {
      minggu: mingguBaru,
      totalBayar: totalBayar,
      updatedAt: serverTimestamp(),
      keterangan: (data.keterangan || "") + " [UPDATED]"
    });
    
    // Log aktivitas update
    await addDoc(collection(db, "log_aktivitas"), {
      aksi: "UPDATE_RIWAYAT",
      riwayatId: riwayatId,
      nama: data.nama,
      bulan: data.bulan,
      tahun: data.tahun,
      mingguLama: data.minggu,
      mingguBaru: mingguBaru,
      timestamp: serverTimestamp()
    });
    
    showNotification("Data riwayat berhasil diupdate!", "success");
    
    // Update rekap bulanan
    await updateMonthlyRecap();
    
    return true;
  } catch (err) {
    console.error("Error updating riwayat:", err);
    showNotification("Gagal mengupdate data riwayat.", "error");
    return false;
  }
}

// === HAPUS RIWAYAT (ADMIN ONLY) - NEW FEATURE ===
export async function deleteRiwayatPembayaran(riwayatId) {
  try {
    const ref = doc(db, "riwayat_pembayaran", riwayatId);
    const snap = await getDoc(ref);
    
    if (!snap.exists()) {
      showNotification("Data riwayat tidak ditemukan.", "error");
      return false;
    }
    
    const data = snap.data();
    
    // Backup ke log sebelum hapus
    await addDoc(collection(db, "log_aktivitas"), {
      aksi: "HAPUS_RIWAYAT",
      riwayatId: riwayatId,
      nama: data.nama,
      bulan: data.bulan,
      tahun: data.tahun,
      minggu: data.minggu,
      totalBayar: data.totalBayar,
      timestamp: serverTimestamp()
    });
    
    // Hapus dari riwayat
    await deleteDoc(ref);
    
    showNotification("Data riwayat berhasil dihapus.", "info");
    
    // Update rekap bulanan
    await updateMonthlyRecap();
    
    return true;
  } catch (err) {
    console.error("Error deleting riwayat:", err);
    showNotification("Gagal menghapus data riwayat.", "error");
    return false;
  }
}

// === RESET PEMBAYARAN (ADMIN ONLY) ===
export async function resetSemuaPembayaran() {
  try {
    const paySnap = await getDocs(collection(db, "pembayaran"));
    const payments = paySnap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    // Simpan semua data ke riwayat sebelum direset
    const batchPromises = payments.map(async (p) => {
      const paidCount = (p.minggu || []).filter(Boolean).length;
      const totalBayar = paidCount * (p.jumlahPerMinggu || 0);
      
      return addDoc(collection(db, "riwayat_pembayaran"), {
        originalId: p.id,
        nama: p.nama,
        bulan: p.bulan,
        tahun: p.tahun,
        minggu: p.minggu,
        jumlahPerMinggu: p.jumlahPerMinggu,
        totalBayar: totalBayar,
        movedAt: serverTimestamp(),
        keterangan: "RESET_PEMBAYARAN"
      });
    });
    
    await Promise.all(batchPromises);
    
    // Reset semua minggu menjadi false
    const resetPromises = payments.map(p => 
      updateDoc(doc(db, "pembayaran", p.id), {
        minggu: [false, false, false, false]
      })
    );
    
    await Promise.all(resetPromises);
    
    // Log aktivitas reset
    await addDoc(collection(db, "log_aktivitas"), {
      aksi: "RESET_SEMUA_PEMBAYARAN",
      jumlahData: payments.length,
      timestamp: serverTimestamp()
    });
    
    showNotification(`Berhasil mereset ${payments.length} data pembayaran. Semua data disimpan ke riwayat.`, "success");
    
    // Update rekap setelah reset
    await updateMonthlyRecap();
    
    return true;
  } catch (err) {
    console.error("Error reset pembayaran:", err);
    showNotification("Gagal mereset pembayaran.", "error");
    return false;
  }
}

// === RESET SEMUA DATA (ADMIN ONLY) - HAPUS SEMUA DARI 0 ===
export async function resetSemuaData() {
  try {
    // 1. Backup semua pembayaran
    const paySnap = await getDocs(collection(db, "pembayaran"));
    const payments = paySnap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    const paymentBackups = payments.map(async (p) => {
      const paidCount = (p.minggu || []).filter(Boolean).length;
      const totalBayar = paidCount * (p.jumlahPerMinggu || 0);
      
      return addDoc(collection(db, "riwayat_pembayaran"), {
        originalId: p.id,
        nama: p.nama,
        bulan: p.bulan,
        tahun: p.tahun,
        minggu: p.minggu,
        jumlahPerMinggu: p.jumlahPerMinggu,
        totalBayar: totalBayar,
        movedAt: serverTimestamp(),
        keterangan: "RESET_SEMUA_DATA"
      });
    });
    
    await Promise.all(paymentBackups);
    
    // 2. Backup semua pengeluaran
    const pengSnap = await getDocs(collection(db, "pengeluaran"));
    const pengeluaran = pengSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    const pengeluaranBackups = pengeluaran.map(e => 
      addDoc(collection(db, "catatan_pengeluaran"), {
        pengeluaranId: e.id,
        keterangan: e.keterangan,
        jumlah: e.jumlah,
        tanggal: e.tanggal,
        aksi: "BACKUP_RESET",
        timestamp: serverTimestamp()
      })
    );
    
    await Promise.all(pengeluaranBackups);
    
    // 3. HAPUS SEMUA PEMBAYARAN (bukan reset, tapi hapus total)
    const deletePayments = payments.map(p => 
      deleteDoc(doc(db, "pembayaran", p.id))
    );
    
    await Promise.all(deletePayments);
    
    // 4. Hapus semua pengeluaran
    const deletePengeluaran = pengeluaran.map(e => 
      deleteDoc(doc(db, "pengeluaran", e.id))
    );
    
    await Promise.all(deletePengeluaran);
    
    // 5. Hapus semua rekap bulanan
    const recapSnap = await getDocs(collection(db, "rekap_bulanan"));
    const deleteRecaps = recapSnap.docs.map(d => deleteDoc(doc(db, "rekap_bulanan", d.id)));
    await Promise.all(deleteRecaps);
    
    // 6. Hapus semua riwayat pembayaran (data lama) - OPTIONAL
    const riwayatSnap = await getDocs(collection(db, "riwayat_pembayaran"));
    const deleteRiwayat = riwayatSnap.docs.map(d => deleteDoc(doc(db, "riwayat_pembayaran", d.id)));
    await Promise.all(deleteRiwayat);
    
    // 7. Hapus semua catatan pengeluaran (data lama) - OPTIONAL
    const catatanSnap = await getDocs(collection(db, "catatan_pengeluaran"));
    const deleteCatatan = catatanSnap.docs.map(d => deleteDoc(doc(db, "catatan_pengeluaran", d.id)));
    await Promise.all(deleteCatatan);
    
    // 8. Log aktivitas
    await addDoc(collection(db, "log_aktivitas"), {
      aksi: "RESET_TOTAL_SEMUA_DATA",
      jumlahPembayaran: payments.length,
      jumlahPengeluaran: pengeluaran.length,
      timestamp: serverTimestamp()
    });
    
    showNotification(
      `✅ Reset TOTAL berhasil!\n` +
      `- ${payments.length} pembayaran dihapus\n` +
      `- ${pengeluaran.length} pengeluaran dihapus\n` +
      `- Semua data lama dihapus\n` +
      `Sistem kembali ke 0!`, 
      "success"
    );
    
    // Update rekap
    await updateMonthlyRecap();
    
    return true;
  } catch (err) {
    console.error("Error reset semua data:", err);
    showNotification("Gagal mereset data.", "error");
    return false;
  }
}

// === LOAD CATATAN PENGELUARAN ===
export async function loadCatatanPengeluaran(limit = 50) {
  try {
    const q = query(
      collection(db, "catatan_pengeluaran"), 
      orderBy("timestamp", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.slice(0, limit).map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("Error loading catatan:", err);
    return [];
  }
}

// === MONTHLY RECAP STORAGE - FIXED ===
export async function updateMonthlyRecap() {
  try {
    const paySnap = await getDocs(collection(db, "pembayaran"));
    const pengSnap = await getDocs(collection(db, "pengeluaran"));
    const riwayatSnap = await getDocs(collection(db, "riwayat_pembayaran"));

    const payments = paySnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const pengeluaran = pengSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const riwayat = riwayatSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const monthlyRecap = {};
    
    // Data pembayaran aktif
    payments.forEach(p => {
      const paidCount = (p.minggu || []).filter(Boolean).length;
      const amount = paidCount * (p.jumlahPerMinggu || 0);
      const key = `${p.bulan}_${p.tahun}`;
      
      if (!monthlyRecap[key]) {
        monthlyRecap[key] = {
          bulan: p.bulan,
          tahun: p.tahun,
          pemasukan: 0,
          pengeluaran: 0,
          saldo: 0,
          jumlahSiswa: new Set(),
          updatedAt: new Date()
        };
      }
      
      monthlyRecap[key].pemasukan += amount;
      monthlyRecap[key].jumlahSiswa.add(p.nama);
    });

    // Data dari riwayat
    riwayat.forEach(r => {
      const paidCount = (r.minggu || []).filter(Boolean).length;
      const amount = paidCount * (r.jumlahPerMinggu || 0);
      const key = `${r.bulan}_${r.tahun}`;
      
      if (!monthlyRecap[key]) {
        monthlyRecap[key] = {
          bulan: r.bulan,
          tahun: r.tahun,
          pemasukan: 0,
          pengeluaran: 0,
          saldo: 0,
          jumlahSiswa: new Set(),
          updatedAt: new Date()
        };
      }
      
      monthlyRecap[key].pemasukan += amount;
      monthlyRecap[key].jumlahSiswa.add(r.nama);
    });

    // Tambahkan pengeluaran
    pengeluaran.forEach(e => {
      const date = new Date(e.tanggal);
      const bulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][date.getMonth()];
      const tahun = date.getFullYear();
      const key = `${bulan}_${tahun}`;
      
      if (!monthlyRecap[key]) {
        monthlyRecap[key] = {
          bulan: bulan,
          tahun: tahun,
          pemasukan: 0,
          pengeluaran: 0,
          saldo: 0,
          jumlahSiswa: new Set(),
          updatedAt: new Date()
        };
      }
      
      monthlyRecap[key].pengeluaran += (e.jumlah || 0);
    });

    // Hitung saldo dan simpan ke Firestore
    for (const [key, data] of Object.entries(monthlyRecap)) {
      data.saldo = data.pemasukan - data.pengeluaran;
      data.jumlahSiswa = data.jumlahSiswa.size;
      
      const recapRef = doc(db, "rekap_bulanan", key);
      await setDoc(recapRef, {
        bulan: data.bulan,
        tahun: data.tahun,
        pemasukan: data.pemasukan,
        pengeluaran: data.pengeluaran,
        saldo: data.saldo,
        jumlahSiswa: data.jumlahSiswa,
        updatedAt: serverTimestamp()
      }, { merge: true });
    }

    console.log("✅ Rekap bulanan berhasil disimpan ke database");
  } catch (err) {
    console.error("❌ Error updating monthly recap:", err);
  }
}

export async function loadMonthlyRecap() {
  try {
    const snap = await getDocs(collection(db, "rekap_bulanan"));
    const recaps = {};
    
    snap.docs.forEach(doc => {
      const data = doc.data();
      const key = `${data.bulan} ${data.tahun}`;
      recaps[key] = data.pemasukan;
    });
    
    return recaps;
  } catch (err) {
    console.error("Error loading monthly recap:", err);
    return {};
  }
}

// === REFRESH SUMMARY - FIXED ===
async function refreshSummary() {
  try {
    const paySnap = await getDocs(collection(db, "pembayaran"));
    const pengSnap = await getDocs(collection(db, "pengeluaran"));
    const recapSnap = await getDocs(collection(db, "rekap_bulanan"));

    const payments = paySnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const pengeluaran = pengSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const unique = new Set(payments.map(p => p.nama));
    const totalSiswa = unique.size;

    let totalPemasukan = 0;
    let totalPengeluaran = 0;
    
    const monthly = {};
    recapSnap.docs.forEach(doc => {
      const data = doc.data();
      const key = `${data.bulan} ${data.tahun}`;
      monthly[key] = data.pemasukan || 0;
      totalPemasukan += (data.pemasukan || 0);
      totalPengeluaran += (data.pengeluaran || 0);
    });

    const saldoKas = totalPemasukan - totalPengeluaran;

    updateSummaryUI({ totalSiswa, totalPemasukan, totalPengeluaran, saldoKas, monthly });
  } catch (err) {
    console.error("Error refresh summary:", err);
  }
}

export { refreshSummary };