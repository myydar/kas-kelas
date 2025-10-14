// js/ui.js - UPDATED WITH RIWAYAT PEMBAYARAN FEATURE
import { 
  tambahPembayaran, 
  tambahPengeluaran, 
  updateMingguPembayaran, 
  hapusPembayaran, 
  hapusPengeluaran, 
  initFirestoreListeners, 
  ubahBulanTahun, 
  loadRiwayatByNama, 
  loadAllRiwayat,
  resetSemuaPembayaran, 
  resetSemuaData, 
  loadCatatanPengeluaran 
} from "./firestore.js";

/* DOM refs */
const tabelPembayaran = document.getElementById("tabelPembayaran");
const tabelPengeluaran = document.getElementById("tabelPengeluaran");
const monthlyList = document.getElementById("monthlyList");

const modalPembOverlay = document.getElementById("modalPembayaran");
const modalPengOverlay = document.getElementById("modalPengeluaran");
const modalRiwayat = document.getElementById("modalRiwayat");
const modalCatatan = document.getElementById("modalCatatan");
const modalRiwayatAll = document.getElementById("modalRiwayatAll");

const modalNama = document.getElementById("modalNama");
const modalBulan = document.getElementById("modalBulan");
const modalTahun = document.getElementById("modalTahun");
const modalJumlah = document.getElementById("modalJumlah");
const modalSaveBtn = document.getElementById("modalSaveBtn");

const pengDesc = document.getElementById("pengDesc");
const pengJumlah = document.getElementById("pengJumlah");
const modalPengSave = document.getElementById("modalPengSave");

/* Enhanced notification */
export function showNotification(msg, type='info'){
  const box = document.createElement('div');
  box.className = `notif ${type}`;
  box.textContent = msg;
  box.style.animation = 'slideInRight 0.3s ease';
  document.body.appendChild(box);
  setTimeout(()=> {
    box.style.animation = 'slideInRight 0.3s ease reverse';
    setTimeout(() => box.remove(), 300);
  }, 2700);
}

/* Show/hide app parts by role and init listeners */
export function showAppForRole(isAdmin) {
  initFirestoreListeners(isAdmin);
  
  // Setup event listeners for all buttons
  const resetBtn = document.getElementById("resetPembayaranBtn");
  const resetSemuaBtn = document.getElementById("resetSemuaDataBtn");
  const catatanBtn = document.getElementById("lihatCatatanBtn");
  const riwayatAllBtn = document.getElementById("lihatRiwayatBtn");
  
  if (isAdmin) {
    if (resetBtn) {
      resetBtn.onclick = () => confirmResetPembayaran();
    }
    if (resetSemuaBtn) {
      resetSemuaBtn.onclick = () => confirmResetSemuaData();
    }
    if (catatanBtn) {
      catatanBtn.onclick = () => showCatatanPengeluaran();
    }
  }
  
  // Riwayat button available for ALL users
  if (riwayatAllBtn) {
    riwayatAllBtn.onclick = () => showAllRiwayat();
  }
}

/* Modal openers called from auth.js */
export function openTambahPembayaran() {
  modalPembOverlay.style.display = 'flex';
  document.getElementById("modalPembTitle").textContent = 'Tambah Pembayaran';
  modalNama.value = '';
  modalJumlah.value = 5000;
  modalTahun.value = new Date().getFullYear();
  const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  modalBulan.value = months[new Date().getMonth()];
}

export function openTambahPengeluaran() {
  modalPengOverlay.style.display = 'flex';
  pengDesc.value = '';
  pengJumlah.value = '';
}

/* Show ALL Riwayat - Available for ALL users */
export async function showAllRiwayat() {
  if (!modalRiwayatAll) return;
  
  modalRiwayatAll.style.display = 'flex';
  const content = document.getElementById('riwayatAllContent');
  content.innerHTML = '<p style="text-align:center; padding:20px; color:#718096;">Memuat riwayat...</p>';
  
  const items = await loadAllRiwayat();
  
  if (!items || items.length === 0) {
    content.innerHTML = `
      <div style="text-align:center; padding:40px; color:#718096;">
        <div style="font-size:48px; margin-bottom:12px; opacity:0.5;">📂</div>
        <div style="font-size:14px;">Belum ada riwayat pembayaran</div>
      </div>
    `;
    return;
  }
  
  // Group by nama
  const grouped = {};
  items.forEach(item => {
    if (!grouped[item.nama]) {
      grouped[item.nama] = [];
    }
    grouped[item.nama].push(item);
  });
  
  // Render grouped data
  const entries = Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0]));
  
  content.innerHTML = entries.map(([nama, records]) => {
    const recordsHtml = records.map(i => {
      const paidCount = (i.minggu || []).filter(Boolean).length;
      const total = paidCount * (i.jumlahPerMinggu || 0);
      const dateStr = i.movedAt ? new Date(i.movedAt.toDate ? i.movedAt.toDate() : i.movedAt).toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : '';
      
      const keterangan = i.keterangan || 'Pindah bulan';
      const mingguBadges = (i.minggu || []).map((m, idx) => 
        `<span style="display:inline-block; padding:2px 6px; border-radius:6px; font-size:11px; margin-right:4px; background:${m ? '#c6f6d5' : '#fed7d7'}; color:${m ? '#22543d' : '#742a2a'};">M${idx + 1}</span>`
      ).join('');
      
      return `
        <div style="padding:12px; border-left:3px solid #667eea; background:#f7fafc; margin-bottom:8px; border-radius:8px;">
          <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:6px;">
            <div>
              <div style="font-weight:600; font-size:14px; color:#1a202c; margin-bottom:4px;">${i.bulan} ${i.tahun}</div>
              <div style="font-size:12px; color:#718096; margin-bottom:4px;">${mingguBadges}</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:16px; font-weight:700; color:#667eea;">Rp ${total.toLocaleString('id-ID')}</div>
              <div style="font-size:11px; color:#718096;">${paidCount}/4 minggu</div>
            </div>
          </div>
          <div style="font-size:11px; color:#718096; display:flex; justify-content:space-between;">
            <span>📝 ${keterangan}</span>
            <span>🕐 ${dateStr}</span>
          </div>
        </div>
      `;
    }).join('');
    
    const totalRecords = records.reduce((sum, r) => {
      const paidCount = (r.minggu || []).filter(Boolean).length;
      return sum + (paidCount * (r.jumlahPerMinggu || 0));
    }, 0);
    
    return `
      <div style="margin-bottom:24px; border:2px solid #e2e8f0; border-radius:12px; padding:16px; background:white;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; padding-bottom:12px; border-bottom:2px solid #e2e8f0;">
          <h4 style="font-size:16px; font-weight:700; color:#1a202c; margin:0;">👤 ${escapeHtml(nama)}</h4>
          <div style="text-align:right;">
            <div style="font-size:12px; color:#718096;">Total Riwayat</div>
            <div style="font-size:18px; font-weight:700; color:#48bb78;">Rp ${totalRecords.toLocaleString('id-ID')}</div>
          </div>
        </div>
        ${recordsHtml}
      </div>
    `;
  }).join('');
}

/* Reset function - Admin only */
export async function confirmResetPembayaran() {
  const confirmed = confirm(
    '⚠️ PERINGATAN!\n\n' +
    'Anda akan mereset SEMUA status pembayaran (M1, M2, M3, M4) menjadi belum bayar.\n\n' +
    'Data lama akan disimpan ke riwayat pembayaran.\n\n' +
    'Apakah Anda yakin ingin melanjutkan?'
  );
  
  if (confirmed) {
    const doubleCheck = confirm(
      '🔴 KONFIRMASI TERAKHIR\n\n' +
      'Ini adalah tindakan yang tidak dapat dibatalkan dengan mudah.\n\n' +
      'Tekan OK untuk melanjutkan reset.'
    );
    
    if (doubleCheck) {
      showNotification("Sedang mereset data...", "info");
      const success = await resetSemuaPembayaran();
      if (success) {
        showNotification("Reset berhasil! Periksa riwayat untuk data lama.", "success");
      }
    }
  }
}

/* Reset semua data - Admin only */
export async function confirmResetSemuaData() {
  const confirmed = confirm(
    '🚨 PERINGATAN SANGAT KERAS!\n\n' +
    'Anda akan MENGHAPUS TOTAL:\n' +
    '❌ SEMUA data pembayaran → DIHAPUS\n' +
    '❌ SEMUA pengeluaran → DIHAPUS\n' +
    '❌ SEMUA rekap bulanan → DIHAPUS\n' +
    '❌ SEMUA riwayat lama → DIHAPUS\n\n' +
    '⚠️ Sistem akan kembali ke 0!\n' +
    '⚠️ TIDAK ADA BACKUP yang tersimpan!\n\n' +
    'Apakah Anda yakin?'
  );
  
  if (confirmed) {
    const doubleCheck = confirm(
      '🔴 KONFIRMASI TERAKHIR!\n\n' +
      'SEMUA data akan HILANG PERMANEN:\n' +
      '- Semua nama siswa\n' +
      '- Semua data pemasukan\n' +
      '- Semua data pengeluaran\n' +
      '- Semua riwayat\n' +
      '- Semua rekap bulanan\n\n' +
      '⚠️ TIDAK BISA DIKEMBALIKAN!\n\n' +
      'Tekan OK untuk HAPUS SEMUA atau Cancel untuk batalkan.'
    );
    
    if (doubleCheck) {
      const tripleCheck = prompt(
        'Ketik "HAPUS SEMUA" (tanpa tanda kutip) untuk konfirmasi final:'
      );
      
      if (tripleCheck === 'HAPUS SEMUA') {
        showNotification("Sedang menghapus semua data...", "info");
        const success = await resetSemuaData();
        if (success) {
          showNotification("✅ Semua data berhasil dihapus! Sistem kembali ke 0.", "success");
        }
      } else {
        showNotification("Reset dibatalkan. Data tetap aman.", "info");
      }
    }
  }
}

/* Show catatan pengeluaran modal */
export async function showCatatanPengeluaran() {
  modalCatatan.style.display = 'flex';
  const content = document.getElementById('catatanContent');
  content.innerHTML = '<p style="text-align:center; padding:20px; color:#718096;">Memuat catatan...</p>';
  
  const catatan = await loadCatatanPengeluaran();
  
  if (!catatan || catatan.length === 0) {
    content.innerHTML = `
      <div style="text-align:center; padding:40px; color:#718096;">
        <div style="font-size:48px; margin-bottom:12px; opacity:0.5;">📋</div>
        <div style="font-size:14px;">Belum ada catatan pengeluaran</div>
      </div>
    `;
    return;
  }
  
  content.innerHTML = catatan.map(c => {
    const aksiColor = c.aksi === 'TAMBAH' ? '#48bb78' : '#f56565';
    const aksiIcon = c.aksi === 'TAMBAH' ? '➕' : '🗑️';
    const timestamp = c.timestamp ? new Date(c.timestamp.toDate ? c.timestamp.toDate() : c.timestamp).toLocaleString('id-ID') : '';
    
    return `<div style="padding:16px; border-bottom:1px solid #e2e8f0; transition:all 0.2s ease;" onmouseover="this.style.background='#f7fafc'" onmouseout="this.style.background='white'">
      <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:8px;">
        <div style="font-weight:700; font-size:16px;">${escapeHtml(c.keterangan)}</div>
        <span style="padding:4px 12px; border-radius:12px; font-size:12px; font-weight:600; background:${aksiColor}; color:white;">${aksiIcon} ${c.aksi}</span>
      </div>
      <div style="font-size:18px; font-weight:700; color:#667eea; margin-bottom:4px;">Rp ${Number(c.jumlah).toLocaleString('id-ID')}</div>
      <div style="font-size:12px; color:#718096;">${timestamp}</div>
    </div>`;
  }).join('');
}

/* Modal closer */
export function closeModal(e) {
  if (e && e.target && e.target.classList && e.target.classList.contains('modal-overlay')) {
    e.target.style.display = 'none';
  } else {
    if (modalPembOverlay) modalPembOverlay.style.display = 'none';
    if (modalPengOverlay) modalPengOverlay.style.display = 'none';
    if (modalRiwayat) modalRiwayat.style.display = 'none';
    if (modalCatatan) modalCatatan.style.display = 'none';
    if (modalRiwayatAll) modalRiwayatAll.style.display = 'none';
  }
}

/* Wire save actions */
if (modalSaveBtn) {
  modalSaveBtn.addEventListener('click', async () => {
    const nama = modalNama.value.trim();
    const bulan = modalBulan.value;
    const tahun = parseInt(modalTahun.value) || new Date().getFullYear();
    const jumlah = Number(modalJumlah.value) || 0;
    if (!nama) { 
      showNotification('Nama harus diisi','error'); 
      return; 
    }
    await tambahPembayaran({nama, bulan, tahun, jumlahPerMinggu: jumlah});
    closeModal();
  });
}

if (modalPengSave) {
  modalPengSave.addEventListener('click', async () => {
    const ket = pengDesc.value.trim();
    const jumlah = Number(pengJumlah.value) || 0;
    if (!ket || !jumlah) { 
      showNotification('Isi semua field pengeluaran','error'); 
      return; 
    }
    await tambahPengeluaran({ keterangan: ket, jumlah });
    closeModal();
  });
}

/* RENDER FUNCTIONS - FIXED */
export function renderPembayaran(data, isAdmin) {
  if (!tabelPembayaran) return;
  
  if (!data || data.length === 0) {
    tabelPembayaran.innerHTML = `
      <div style="text-align:center; padding:60px 20px; color:#718096;">
        <div style="font-size:64px; margin-bottom:16px; opacity:0.5;">📚</div>
        <div style="font-size:16px; font-weight:500;">Belum ada data pembayaran</div>
      </div>
    `;
    return;
  }

  const MONTH_ORDER = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  
  // Sort data by year and month
  data.sort((a,b) => {
    if ((a.tahun||0) !== (b.tahun||0)) return (a.tahun||0) - (b.tahun||0);
    return MONTH_ORDER.indexOf(a.bulan) - MONTH_ORDER.indexOf(b.bulan);
  });

  let rows = data.map(d => {
    const minggu = d.minggu || [false,false,false,false];
    const weekCells = minggu.map((m,i) => {
      const badge = m 
        ? '<span style="display:inline-block; padding:4px 12px; border-radius:12px; font-size:12px; font-weight:600; background:#c6f6d5; color:#22543d;">✓</span>' 
        : '<span style="display:inline-block; padding:4px 12px; border-radius:12px; font-size:12px; font-weight:600; background:#fed7d7; color:#742a2a;">✗</span>';
      if (isAdmin) return `<td class="clickable" data-id="${d.id}" data-week="${i}">${badge}</td>`;
      return `<td>${badge}</td>`;
    }).join('');
    
    const totalBayar = (minggu.filter(Boolean).length) * (d.jumlahPerMinggu || 0);
    const totalClass = minggu.filter(Boolean).length === 4 ? "total-full" : "total-partial";
    const aksi = isAdmin ? `<td>
      <button class="hapusPemb hapus" data-id="${d.id}">🗑️</button>
    </td>` : '';
    
    // Add riwayat button for all users
    const riwayatBtn = `<button class="lihatRiwayat" data-nama="${escapeHtml(d.nama)}" style="padding:6px 12px; border-radius:8px; font-size:12px; background:#4299e1; margin-left:4px;">📜</button>`;
    
    return `<tr>
      <td style="text-align:left;">
        <strong>${escapeHtml(d.nama)}</strong>
        ${riwayatBtn}
      </td>
      <td>
        ${isAdmin ? `<select class="bulanSel" data-id="${d.id}" style="padding:6px 10px; border:2px solid #e2e8f0; border-radius:8px; font-size:13px;">
          ${MONTH_ORDER.map(m => `<option ${m===d.bulan? 'selected':''}>${m}</option>`).join('')}
        </select>
        <input class="tahunInput" data-id="${d.id}" type="number" value="${d.tahun||2025}" style="width:80px; margin-left:6px; padding:6px 10px; border:2px solid #e2e8f0; border-radius:8px; font-size:13px;">` 
        : `${d.bulan} ${d.tahun}`}
      </td>
      ${weekCells}
      <td class="${totalClass}"><strong>Rp ${Number(totalBayar).toLocaleString('id-ID')}</strong></td>
      ${aksi}
    </tr>`;
  });

  tabelPembayaran.innerHTML = `<table><thead>
    <tr><th>Nama</th><th>Bulan/Tahun</th><th>M1</th><th>M2</th><th>M3</th><th>M4</th><th>Total</th>${isAdmin?'<th>Aksi</th>':''}</tr>
  </thead><tbody>${rows.join('')}</tbody></table>`;

  // Add event listeners for riwayat buttons (available for ALL users)
  tabelPembayaran.querySelectorAll('.lihatRiwayat').forEach(btn => {
    btn.onclick = () => showRiwayatModalForNama(btn.dataset.nama);
  });

  if (isAdmin) {
    tabelPembayaran.querySelectorAll('.clickable').forEach(cell => {
      cell.onclick = async () => {
        const id = cell.dataset.id; 
        const week = parseInt(cell.dataset.week);
        const current = cell.textContent.includes('✓');
        await updateMingguPembayaran(id, week, !current);
      };
    });

    tabelPembayaran.querySelectorAll('.hapusPemb').forEach(btn => {
      btn.onclick = async () => {
        if (confirm('Hapus data pembayaran ini?')) await hapusPembayaran(btn.dataset.id);
      };
    });

    tabelPembayaran.querySelectorAll('.bulanSel').forEach(sel => {
      sel.onchange = async (e) => {
        const id = sel.dataset.id;
        const bulanBaru = sel.value;
        const tahunInput = document.querySelector(`.tahunInput[data-id="${id}"]`);
        const tahunBaru = tahunInput ? tahunInput.value : (new Date().getFullYear());
        if (confirm('Ubah bulan/tahun? Data lama akan disimpan di riwayat.')) {
          await ubahBulanTahun(id, bulanBaru, tahunBaru);
        }
      };
    });

    tabelPembayaran.querySelectorAll('.tahunInput').forEach(inp => {
      inp.onchange = async () => {
        const id = inp.dataset.id;
        const bulanSel = document.querySelector(`.bulanSel[data-id="${id}"]`);
        const bulanBaru = bulanSel ? bulanSel.value : null;
        const tahunBaru = inp.value;
        if (confirm('Ubah tahun? Data lama akan disimpan di riwayat.')) {
          await ubahBulanTahun(id, bulanBaru, tahunBaru);
        }
      };
    });
  }
}

export function renderPengeluaran(data, isAdmin) {
  if (!tabelPengeluaran) return;
  
  if (!data || data.length === 0) {
    tabelPengeluaran.innerHTML = `
      <div style="text-align:center; padding:60px 20px; color:#718096;">
        <div style="font-size:64px; margin-bottom:16px; opacity:0.5;">💸</div>
        <div style="font-size:16px; font-weight:500;">Belum ada pengeluaran</div>
      </div>
    `;
    return;
  }
  
  data.sort((a,b)=> new Date(b.tanggal) - new Date(a.tanggal));
  
  const rows = data.map(d => `<tr>
    <td style="text-align:left;">${escapeHtml(d.keterangan)}</td>
    <td><strong>Rp ${Number(d.jumlah).toLocaleString('id-ID')}</strong></td>
    <td>${new Date(d.tanggal).toLocaleDateString('id-ID')}</td>
    ${isAdmin ? `<td><button class="hapusPeng hapus" data-id="${d.id}">🗑️</button></td>` : ''}
  </tr>`);
  
  tabelPengeluaran.innerHTML = `<table><thead><tr><th>Keterangan</th><th>Jumlah</th><th>Tanggal</th>${isAdmin?'<th>Aksi</th>':''}</tr></thead><tbody>${rows.join('')}</tbody></table>`;

  if (isAdmin) {
    tabelPengeluaran.querySelectorAll('.hapusPeng').forEach(btn=>{
      btn.onclick = async ()=> {
        if (confirm('Hapus pengeluaran ini?')) await hapusPengeluaran(btn.dataset.id);
      };
    });
  }
}

/* SUMMARY UI update - FIXED */
export function updateSummaryUI({ totalSiswa, totalPemasukan, totalPengeluaran, saldoKas, monthly }) {
  const siswaEl = document.getElementById('totalSiswa');
  const pemasukanEl = document.getElementById('totalPemasukan');
  const pengeluaranEl = document.getElementById('totalPengeluaran');
  const saldoEl = document.getElementById('saldoKas');
  
  if (siswaEl) siswaEl.textContent = totalSiswa;
  if (pemasukanEl) pemasukanEl.textContent = `Rp ${Number(totalPemasukan).toLocaleString('id-ID')}`;
  if (pengeluaranEl) pengeluaranEl.textContent = `Rp ${Number(totalPengeluaran).toLocaleString('id-ID')}`;
  if (saldoEl) saldoEl.textContent = `Rp ${Number(saldoKas).toLocaleString('id-ID')}`;
  
  if (!monthlyList) return;
  
  monthlyList.innerHTML = '';
  const entries = Object.entries(monthly).sort((a,b)=>{
    const [aB,aY] = a[0].split(' ');
    const [bB,bY] = b[0].split(' ');
    const MONTH_ORDER = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    if (aY !== bY) return aY - bY;
    return MONTH_ORDER.indexOf(aB) - MONTH_ORDER.indexOf(bB);
  });
  
  if (entries.length === 0) {
    monthlyList.innerHTML = '<div style="text-align:center; padding:40px; color:#718096; grid-column: 1/-1;">Belum ada data pemasukan</div>';
  } else {
    entries.forEach(([k,v]) => {
      const div = document.createElement('div');
      div.innerHTML = `
        <div style="font-size:14px; font-weight:600; color:#4a5568; margin-bottom:6px;">${k}</div>
        <div style="font-size:20px; font-weight:700; color:#667eea;">
          Rp ${Number(v).toLocaleString('id-ID')}
        </div>
      `;
      monthlyList.appendChild(div);
    });
  }
}

/* EXPORT CSV - IMPLEMENTED */
export async function exportCSV() {
  try {
    // Import getDocs dari Firebase
    const { getDocs, collection } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    const { db } = await import("./firebaseconfig.js");
    
    const paySnap = await getDocs(collection(db, "pembayaran"));
    const pengSnap = await getDocs(collection(db, "pengeluaran"));
    
    const payments = paySnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const pengeluaran = pengSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    // Generate CSV for payments
    let csvPembayaran = "Nama,Bulan,Tahun,Minggu 1,Minggu 2,Minggu 3,Minggu 4,Total Bayar\n";
    payments.forEach(p => {
      const minggu = p.minggu || [false,false,false,false];
      const totalBayar = minggu.filter(Boolean).length * (p.jumlahPerMinggu || 0);
      csvPembayaran += `${p.nama},${p.bulan},${p.tahun},${minggu[0]?'Sudah':'Belum'},${minggu[1]?'Sudah':'Belum'},${minggu[2]?'Sudah':'Belum'},${minggu[3]?'Sudah':'Belum'},${totalBayar}\n`;
    });
    
    // Generate CSV for pengeluaran
    let csvPengeluaran = "Keterangan,Jumlah,Tanggal\n";
    pengeluaran.forEach(e => {
      const tanggal = new Date(e.tanggal).toLocaleDateString('id-ID');
      csvPengeluaran += `${e.keterangan},${e.jumlah},${tanggal}\n`;
    });
    
    // Download pembayaran CSV
    const blobPembayaran = new Blob([csvPembayaran], { type: 'text/csv' });
    const urlPembayaran = window.URL.createObjectURL(blobPembayaran);
    const aPembayaran = document.createElement('a');
    aPembayaran.href = urlPembayaran;
    aPembayaran.download = `pembayaran_${new Date().toISOString().split('T')[0]}.csv`;
    aPembayaran.click();
    
    // Download pengeluaran CSV
    setTimeout(() => {
      const blobPengeluaran = new Blob([csvPengeluaran], { type: 'text/csv' });
      const urlPengeluaran = window.URL.createObjectURL(blobPengeluaran);
      const aPengeluaran = document.createElement('a');
      aPengeluaran.href = urlPengeluaran;
      aPengeluaran.download = `pengeluaran_${new Date().toISOString().split('T')[0]}.csv`;
      aPengeluaran.click();
    }, 500);
    
    showNotification('CSV berhasil diexport!', 'success');
  } catch (err) {
    console.error('Error export CSV:', err);
    showNotification('Gagal export CSV', 'error');
  }
}

/* RIWAYAT modal display - Per Nama */
export async function showRiwayatModalForNama(nama) {
  if (!modalRiwayat) return;
  
  modalRiwayat.style.display = 'flex';
  document.getElementById('riwayatTitle').textContent = `Riwayat — ${nama}`;
  const content = document.getElementById('riwayatContent');
  content.innerHTML = '<p style="text-align:center; padding:20px; color:#718096;">Memuat riwayat...</p>';
  
  console.log('🔍 Loading riwayat for:', nama);
  const items = await loadRiwayatByNama(nama);
  console.log('📊 Loaded items:', items);
  
  if (!items || items.length === 0) {
    content.innerHTML = `
      <div style="text-align:center; padding:40px; color:#718096;">
        <div style="font-size:48px; margin-bottom:12px; opacity:0.5;">📂</div>
        <div style="font-size:16px; font-weight:500; margin-bottom:8px;">Belum ada riwayat</div>
        <div style="font-size:13px; color:#a0aec0;">Riwayat pembayaran untuk <strong>${escapeHtml(nama)}</strong> akan muncul di sini</div>
      </div>
    `;
    return;
  }
  
  content.innerHTML = items.map(i => {
    const paidCount = (i.minggu || []).filter(Boolean).length;
    const total = paidCount * (i.jumlahPerMinggu || 0);
    const dateStr = i.movedAt ? new Date(i.movedAt.toDate ? i.movedAt.toDate() : i.movedAt).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) : 'Tanggal tidak tersedia';
    
    const keterangan = i.keterangan || 'Pindah bulan';
    const mingguBadges = (i.minggu || []).map((m, idx) => 
      `<span style="display:inline-block; padding:2px 6px; border-radius:6px; font-size:11px; margin-right:4px; background:${m ? '#c6f6d5' : '#fed7d7'}; color:${m ? '#22543d' : '#742a2a'};">M${idx + 1}</span>`
    ).join('');
    
    return `<div style="padding:16px; border-bottom:1px solid #e2e8f0; transition:all 0.2s ease;" onmouseover="this.style.background='#f7fafc'" onmouseout="this.style.background='white'">
      <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:6px;">
        <div>
          <div style="font-weight:700; font-size:16px; margin-bottom:6px;">${i.bulan} ${i.tahun} • Rp ${total.toLocaleString('id-ID')}</div>
          <div style="font-size:12px; color:#718096; margin-bottom:4px;">${mingguBadges}</div>
        </div>
        <div style="text-align:right; font-size:11px; color:#718096;">
          <div>📝 ${keterangan}</div>
          <div style="margin-top:4px;">🕐 ${dateStr}</div>
        </div>
      </div>
      <div style="font-size:13px; color:#718096;">${paidCount}/4 minggu terbayar</div>
    </div>`;
  }).join('');
}

/* Utility: escape html */
function escapeHtml(str='') {
  return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}