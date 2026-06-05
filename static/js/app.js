/**
 * app.js
 * ======
 * Logika utama aplikasi Shift Scheduler.
 * Animasi berjalan otomatis saat "Jalankan" diklik,
 * hasil lengkap muncul setelah animasi selesai (atau di-skip).
 */

/* ══════════════════════════════════════════════
   STATE GLOBAL
   ══════════════════════════════════════════════ */

let varianHC = "simple";

/* ══════════════════════════════════════════════
   HELPER: BACA NILAI SLIDER & LABEL
   ══════════════════════════════════════════════ */

function getNilai(id) {
  return parseFloat(document.getElementById(id).value);
}

function hubungkanSlider(sliderId, labelId, format) {
  const slider = document.getElementById(sliderId);
  const label  = document.getElementById(labelId);
  if (!slider || !label) return;
  const perbarui = () => {
    const v = parseFloat(slider.value);
    label.textContent = format ? format(v) : v;
  };
  slider.addEventListener("input", perbarui);
  perbarui();
}

/* ══════════════════════════════════════════════
   HELPER: TAMPILAN STATE
   ══════════════════════════════════════════════ */

function tampilLoading(id, pesan) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = `
    <div class="state-loading">
      <div class="spinner-border text-info" style="width:2.5rem;height:2.5rem;" role="status"></div>
      <div class="loading-teks">${pesan}</div>
      <div class="loading-sub">Mohon tunggu sebentar...</div>
    </div>`;
}

function tampilError(id, pesan) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = `<div class="notif-error mt-2">❌ ${pesan}</div>`;
}

/* ══════════════════════════════════════════════
   ANIMASI OTOMATIS STEP-BY-STEP
   Berjalan setelah data diterima dari server.
   Menampilkan progress bar + teks iterasi saat ini.
   Hasil lengkap muncul setelah animasi selesai / di-skip.
   ══════════════════════════════════════════════ */

/**
 * Menjalankan animasi playback riwayat iterasi secara otomatis.
 * Setelah selesai, callback onSelesai dipanggil untuk menampilkan hasil.
 * @param {string}   panelId   - ID panel yang menampilkan animasi
 * @param {Array}    riwayat   - Data riwayat dari backend
 * @param {Function} onSelesai - Callback setelah animasi selesai
 */
function jalankanAnimasi(panelId, riwayat, onSelesai) {
  const el = document.getElementById(panelId);
  if (!el) return;

  const total = riwayat.length;
  let   index = 0;

  // Tampilkan panel animasi sementara hasil dihitung
  el.innerHTML = `
    <div class="animasi-panel card p-4 text-center">
      <div style="font-size:42px;margin-bottom:14px;">⚙️</div>
      <div style="font-size:15px;font-weight:600;color:var(--aksen);margin-bottom:6px;"
           id="${panelId}-anim-teks">Memulai simulasi...</div>
      <div style="font-size:12px;color:var(--muted);margin-bottom:20px;"
           id="${panelId}-anim-detail">-</div>
      <div class="animasi-progress mb-3">
        <div class="animasi-progress-bar" id="${panelId}-anim-bar" style="width:0%"></div>
      </div>
      <div style="font-size:11px;color:var(--muted2);">
        <span id="${panelId}-anim-counter">0</span> / ${total} langkah
      </div>
    </div>`;

  // Sesuaikan kecepatan animasi: semakin banyak iterasi, semakin cepat
  const kecepatan = Math.max(20, Math.min(120, Math.floor(3000 / total)));

  const timer = setInterval(() => {
    if (index >= total) {
      clearInterval(timer);
      onSelesai(); // Tampilkan hasil lengkap
      return;
    }

    const frame  = riwayat[index];
    const persen = Math.round(((index + 1) / total) * 100);
    const kunciX = frame.generasi ? "Generasi" : "Iterasi";
    const nilaiX = frame.generasi ?? frame.iterasi ?? (index + 1);

    const barEl     = document.getElementById(`${panelId}-anim-bar`);
    const teksEl    = document.getElementById(`${panelId}-anim-teks`);
    const detailEl  = document.getElementById(`${panelId}-anim-detail`);
    const counterEl = document.getElementById(`${panelId}-anim-counter`);

    if (barEl)     barEl.style.width    = persen + "%";
    if (counterEl) counterEl.textContent = index + 1;
    if (teksEl)    teksEl.textContent   = `${kunciX} ${nilaiX} | Fitness: ${frame.fitness?.toFixed(4) ?? "-"}`;
    if (detailEl)  detailEl.textContent = `Pelanggaran saat ini: ${frame.pelanggaran ?? "-"}`;

    index++;
  }, kecepatan);
}

/* ══════════════════════════════════════════════
   RENDER HASIL LENGKAP PER TAB
   ══════════════════════════════════════════════ */

function renderHasilHC(panelId, hasil) {
  document.getElementById(panelId).innerHTML = `
    <div id="${panelId}-stat"></div>
    ${hasil.solusi_sempurna
      ? `<div class="notif-sukses mb-3">✓ Solusi sempurna, tidak ada pelanggaran constraint!</div>`
      : ""}
    <div class="card mb-3">
      <div class="card-header">📈 Grafik Konvergensi Fitness</div>
      <div class="card-body">
        <p style="font-size:11px;color:#64748b;margin-bottom:10px;">Menunjukkan perubahan nilai fitness setiap iterasi. Garis naik berarti jadwal makin baik. Jika berhenti sebelum 1.0, algoritma terjebak di <em>local optimum</em>.</p>
        <div class="chart-box"><canvas id="${panelId}-chart"></canvas></div>
      </div>
    </div>
    <div class="card">
      <div class="card-header">
        📅 Jadwal Terbaik yang Ditemukan
        ${buatTombolEkspor(hasil.jadwal_terbaik, hasil.algoritma, hasil.fitness_akhir, hasil.pelanggaran_akhir)}
      </div>
      <div class="card-body" id="${panelId}-tabel"></div>
    </div>`;

  renderStatistik(`${panelId}-stat`, [
    { label: "Algoritma",   nilai: hasil.algoritma,         warna: "#16bdca" },
    { label: "Fitness",     nilai: hasil.fitness_akhir,     warna: "#0e9f6e" },
    { label: "Pelanggaran", nilai: hasil.pelanggaran_akhir, warna: hasil.pelanggaran_akhir === 0 ? "#0e9f6e" : "#e02424" },
    { label: "Iterasi",     nilai: hasil.total_iterasi,     warna: "#e3a008" },
    { label: "Waktu",       nilai: hasil.waktu_eksekusi, satuan: "dtk", warna: "#94a3b8" },
  ]);

  renderGrafikKonvergensi(`${panelId}-chart`, hasil.riwayat, hasil.algoritma, "iterasi");
  renderTabelJadwal(`${panelId}-tabel`, hasil.jadwal_terbaik);
}

function renderHasilSA(panelId, hasil) {
  document.getElementById(panelId).innerHTML = `
    <div id="${panelId}-stat"></div>
    <div class="row g-3 mb-3">
      <div class="col-12 col-md-6">
        <div class="card h-100">
          <div class="card-header">📈 Konvergensi Fitness</div>
          <div class="card-body">
            <p style="font-size:11px;color:#64748b;margin-bottom:10px;">Fitness solusi terbaik sepanjang proses. SA kadang menerima solusi lebih buruk (garis turun sementara) untuk lolos dari <em>local optimum</em>.</p>
            <div class="chart-box"><canvas id="${panelId}-chart-f"></canvas></div>
          </div>
        </div>
      </div>
      <div class="col-12 col-md-6">
        <div class="card h-100">
          <div class="card-header">🌡️ Kurva Pendinginan & Probabilitas Boltzmann</div>
          <div class="card-body">
            <p style="font-size:11px;color:#64748b;margin-bottom:10px;">Suhu (merah) turun seiring iterasi — semakin dingin, semakin selektif. Garis ungu (P = e<sup>−Δ/T</sup>) adalah probabilitas menerima solusi lebih buruk; mendekati 0 saat suhu rendah.</p>
            <div class="chart-box"><canvas id="${panelId}-chart-t"></canvas></div>
          </div>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-header">
        📅 Jadwal Terbaik yang Ditemukan
        ${buatTombolEkspor(hasil.jadwal_terbaik, "Simulated Annealing", hasil.fitness_akhir, hasil.pelanggaran_akhir)}
      </div>
      <div class="card-body" id="${panelId}-tabel"></div>
    </div>`;

  renderStatistik(`${panelId}-stat`, [
    { label: "Fitness",        nilai: hasil.fitness_akhir,         warna: "#0e9f6e" },
    { label: "Pelanggaran",    nilai: hasil.pelanggaran_akhir,     warna: hasil.pelanggaran_akhir === 0 ? "#0e9f6e" : "#e02424" },
    { label: "Iterasi",        nilai: hasil.total_iterasi,         warna: "#e3a008" },
    { label: "Suhu Akhir",     nilai: hasil.suhu_akhir,            warna: "#e02424" },
    { label: "Solusi Buruk Diterima", nilai: hasil.jumlah_diterima_buruk, warna: "#7e3af2" },
    { label: "Waktu",          nilai: hasil.waktu_eksekusi, satuan: "dtk", warna: "#94a3b8" },
  ]);

  renderGrafikKonvergensi(`${panelId}-chart-f`, hasil.riwayat, "Simulated Annealing", "iterasi");
  renderKurvaSuhu(`${panelId}-chart-t`, hasil.riwayat);
  renderTabelJadwal(`${panelId}-tabel`, hasil.jadwal_terbaik);
}

function renderHasilGA(panelId, hasil) {
  document.getElementById(panelId).innerHTML = `
    <div id="${panelId}-stat"></div>
    ${hasil.solusi_sempurna
      ? `<div class="notif-sukses mb-3">✓ Solusi sempurna, tidak ada pelanggaran constraint!</div>`
      : ""}
    <div class="card mb-3">
      <div class="card-header">📈 Evolusi Populasi per Generasi</div>
      <div class="card-body">
        <p style="font-size:11px;color:#64748b;margin-bottom:10px;">Tiga metrik per generasi: fitness terbaik global (hijau), fitness generasi ini (biru), dan rata-rata populasi (kuning). Jarak biru–kuning mencerminkan keberagaman populasi.</p>
        <div class="chart-box-tall"><canvas id="${panelId}-chart"></canvas></div>
      </div>
    </div>
    <div class="card">
      <div class="card-header">
        📅 Jadwal Terbaik yang Ditemukan
        ${buatTombolEkspor(hasil.jadwal_terbaik, "Genetic Algorithm", hasil.fitness_akhir, hasil.pelanggaran_akhir)}
      </div>
      <div class="card-body" id="${panelId}-tabel"></div>
    </div>`;

  renderStatistik(`${panelId}-stat`, [
    { label: "Fitness",     nilai: hasil.fitness_akhir,             warna: "#0e9f6e" },
    { label: "Pelanggaran", nilai: hasil.pelanggaran_akhir,         warna: hasil.pelanggaran_akhir === 0 ? "#0e9f6e" : "#e02424" },
    { label: "Generasi",    nilai: hasil.total_generasi,            warna: "#e3a008" },
    { label: "Populasi",    nilai: hasil.parameter.ukuran_populasi, warna: "#16bdca" },
    { label: "Elitisme",    nilai: hasil.parameter.jumlah_elit,     warna: "#7e3af2" },
    { label: "Waktu",       nilai: hasil.waktu_eksekusi, satuan: "dtk", warna: "#94a3b8" },
  ]);

  renderGrafikKonvergensi(`${panelId}-chart`, hasil.riwayat, "Genetic Algorithm", "generasi");
  renderTabelJadwal(`${panelId}-tabel`, hasil.jadwal_terbaik);
}

function renderHasilKomp(panelId, data) {
  document.getElementById(panelId).innerHTML = `
    <div class="card mb-3">
      <div class="card-header">📊 Perbandingan Metrik B.5 · Waktu Konvergensi · Kualitas Solusi · Jumlah Iterasi</div>
      <div class="card-body" id="${panelId}-tabel"></div>
    </div>
    <div class="row g-3 mb-3">
      <div class="col-12 col-md-8">
        <div class="card h-100">
          <div class="card-header">📈 Fitness & Pelanggaran Semua Algoritma</div>
          <div class="card-body">
            <p style="font-size:11px;color:#64748b;margin-bottom:10px;">Bar biru = fitness akhir (maks 1.0, makin tinggi makin baik). Bar merah = pelanggaran constraint (idealnya 0). Algoritma dengan bar biru tinggi dan merah 0 adalah terbaik.</p>
            <div class="chart-box-tall"><canvas id="${panelId}-chart-bar"></canvas></div>
          </div>
        </div>
      </div>
      <div class="col-12 col-md-4">
        <div class="card h-100">
          <div class="card-header">⏱️ Waktu Konvergensi</div>
          <div class="card-body">
            <p style="font-size:11px;color:#64748b;margin-bottom:10px;">Perbandingan waktu eksekusi dalam detik. Bar lebih pendek = lebih cepat. HC biasanya tercepat karena hanya kelola satu solusi, GA lebih lambat karena proses seluruh populasi.</p>
            <div class="chart-box-tall"><canvas id="${panelId}-chart-waktu"></canvas></div>
          </div>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-header">📅 Jadwal Terbaik · Algoritma Pemenang</div>
      <div class="card-body" id="${panelId}-jadwal"></div>
    </div>`;

  renderTabelKomparatif(`${panelId}-tabel`, data.ringkasan);
  renderGrafikKomparatif(`${panelId}-chart-bar`, data.ringkasan);
  renderGrafikWaktu(`${panelId}-chart-waktu`, data.ringkasan);

  const pemenang = data.ringkasan.reduce((a, b) => a.fitness > b.fitness ? a : b);
  const MAP = {
    "Simple Hill Climbing":          "hill_climbing_simple",
    "Steepest-Ascent Hill Climbing": "hill_climbing_steepest",
    "Stochastic Hill Climbing":      "hill_climbing_stochastic",
    "Simulated Annealing":           "simulated_annealing",
    "Genetic Algorithm":             "genetic_algorithm",
  };

  const judulJadwal = `<span style="color:#e2e8f0;font-weight:600;">${pemenang.algoritma}</span>
    <span style="color:#94a3b8;font-size:12px;"> · Fitness: ${pemenang.fitness} | Pelanggaran: ${pemenang.pelanggaran}</span>`;

  renderTabelJadwal(`${panelId}-jadwal`,
    data.detail[MAP[pemenang.algoritma]]?.jadwal_terbaik,
    judulJadwal);
}

/* ══════════════════════════════════════════════
   HANDLER UTAMA PER ALGORITMA
   ══════════════════════════════════════════════ */

async function jalankanHC() {
  const panelId = "hc-panel-hasil";
  tampilLoading(panelId, `Hill Climbing (${varianHC}) menghitung...`);

  try {
    const data  = await apiHillClimbing(varianHC, getNilai("hc-iterasi"));
    const hasil = data.hasil;
    jalankanAnimasi(panelId, hasil.riwayat, () => renderHasilHC(panelId, hasil));
  } catch (err) { tampilError(panelId, err.message); }
}

async function jalankanSA() {
  const panelId = "sa-panel-hasil";
  tampilLoading(panelId, "Simulated Annealing menghitung...");

  try {
    const data  = await apiSimulatedAnnealing(
      getNilai("sa-suhu"), getNilai("sa-alpha"),
      getNilai("sa-suhu-min"), getNilai("sa-iterasi")
    );
    const hasil = data.hasil;
    jalankanAnimasi(panelId, hasil.riwayat, () => renderHasilSA(panelId, hasil));
  } catch (err) { tampilError(panelId, err.message); }
}

async function jalankanGA() {
  const panelId = "ga-panel-hasil";
  tampilLoading(panelId, "Genetic Algorithm berevolusi...");

  try {
    const data  = await apiGeneticAlgorithm(
      getNilai("ga-populasi"), getNilai("ga-generasi"),
      getNilai("ga-crossover"), getNilai("ga-mutasi"),
      getNilai("ga-elit"), getNilai("ga-tournament")
    );
    const hasil = data.hasil;
    jalankanAnimasi(panelId, hasil.riwayat, () => renderHasilGA(panelId, hasil));
  } catch (err) { tampilError(panelId, err.message); }
}

async function jalankanKomp() {
  const panelId = "komp-panel-hasil";
  tampilLoading(panelId, "Menjalankan semua algoritma...");

  try {
    const data = await apiKomparatif(getNilai("komp-iterasi"));
    /* Untuk komparatif, langsung tampil tanpa animasi karena 5 algoritma */
    renderHasilKomp(panelId, data);
  } catch (err) { tampilError(panelId, err.message); }
}

/* ══════════════════════════════════════════════
   EKSPOR JADWAL
   ══════════════════════════════════════════════ */

/**
 * Membuat baris tombol ekspor CSV dan PDF untuk jadwal tertentu.
 * @param {Array}  jadwal    - Matriks jadwal
 * @param {string} algoritma - Nama algoritma
 * @param {number} fitness   - Nilai fitness
 * @param {number} pelanggaran - Jumlah pelanggaran
 */
function buatTombolEkspor(jadwal, algoritma, fitness, pelanggaran) {
  /* Simpan data ke window store untuk menghindari masalah quoting di onclick */
  window._eksporStore = window._eksporStore || {};
  const key = "ekspor_" + Date.now() + "_" + Math.random().toString(36).slice(2);
  window._eksporStore[key] = { jadwal, algoritma, fitness, pelanggaran };

  return `
    <div class="d-flex gap-2 mt-3 flex-wrap">
      <button class="btn-ekspor" data-ekspor-key="${key}" data-ekspor-tipe="csv">
        📥 Unduh CSV
      </button>
      <button class="btn-ekspor" data-ekspor-key="${key}" data-ekspor-tipe="pdf">
        🖨️ Cetak / PDF
      </button>
    </div>`;
}

async function eksporCSV(jadwal, algoritma) {
  try {
    const res = await fetch("/api/ekspor/csv", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ jadwal, algoritma }),
    });
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `jadwal_${algoritma.replace(/\s+/g, "_").toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert("Gagal mengunduh CSV: " + err.message);
  }
}

async function eksporPDF(jadwal, algoritma, fitness, pelanggaran) {
  try {
    const res = await fetch("/api/ekspor/pdf", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ jadwal, algoritma, fitness, pelanggaran }),
    });
    const html = await res.text();
    const win  = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
  } catch (err) {
    alert("Gagal membuka cetak: " + err.message);
  }
}

/* ══════════════════════════════════════════════
   KELOLA KARYAWAN
   ══════════════════════════════════════════════ */

/* State lokal daftar karyawan yang sedang diedit */
let _daftarKaryawanEdit = [];

async function muatKaryawan() {
  try {
    const res  = await fetch("/api/karyawan");
    const data = await res.json();
    _daftarKaryawanEdit = [...data.karyawan];
    KARYAWAN_AKTIF = [...data.karyawan];
    renderDaftarKaryawan();
    document.getElementById("karyawan-jumlah").textContent = data.jumlah;
    const statusEl = document.getElementById("karyawan-status");
    statusEl.textContent = data.jumlah >= 7 ? "Siap" : "Kurang";
    statusEl.style.color = data.jumlah >= 7 ? "var(--hijau)" : "var(--merah)";
  } catch (err) {
    console.error("Gagal memuat karyawan:", err);
  }
}

function renderDaftarKaryawan() {
  const container = document.getElementById("karyawan-list");
  if (!container) return;

  container.innerHTML = _daftarKaryawanEdit.map((nama, idx) => `
    <div class="karyawan-item">
      <span class="karyawan-nomor">${idx + 1}</span>
      <input
        class="karyawan-input"
        type="text"
        value="${nama}"
        maxlength="30"
        oninput="_daftarKaryawanEdit[${idx}] = this.value"
        placeholder="Nama karyawan"
      />
      <button class="karyawan-hapus" onclick="hapusKaryawan(${idx})" title="Hapus">✕</button>
    </div>
  `).join("");
}

function hapusKaryawan(idx) {
  if (_daftarKaryawanEdit.length <= 7) {
    tampilPesanKaryawan("Minimal 7 karyawan, tidak bisa dihapus lagi.", "error");
    return;
  }
  _daftarKaryawanEdit.splice(idx, 1);
  renderDaftarKaryawan();
}

function tambahKaryawan() {
  if (_daftarKaryawanEdit.length >= 20) {
    tampilPesanKaryawan("Maksimal 20 karyawan.", "error");
    return;
  }
  _daftarKaryawanEdit.push(`Karyawan ${_daftarKaryawanEdit.length + 1}`);
  renderDaftarKaryawan();
  /* Scroll ke bawah agar item baru terlihat */
  const list = document.getElementById("karyawan-list");
  if (list) list.lastElementChild?.scrollIntoView({ behavior: "smooth" });
}

async function simpanKaryawan() {
  /* Ambil nilai terkini dari input */
  const inputs = document.querySelectorAll(".karyawan-input");
  const daftar = Array.from(inputs).map(i => i.value.trim()).filter(Boolean);

  try {
    const res  = await fetch("/api/karyawan", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ karyawan: daftar }),
    });
    const data = await res.json();
    if (data.error) {
      tampilPesanKaryawan(data.error, "error");
      return;
    }
    _daftarKaryawanEdit = [...data.karyawan];
    KARYAWAN_AKTIF = [...data.karyawan];
    renderDaftarKaryawan();
    document.getElementById("karyawan-jumlah").textContent = data.jumlah;
    const statusEl = document.getElementById("karyawan-status");
    statusEl.textContent = "Tersimpan";
    statusEl.style.color = "var(--hijau)";
    tampilPesanKaryawan(
      `Berhasil disimpan. ${data.jumlah} karyawan aktif. Jalankan simulasi ulang untuk hasil baru.`,
      "sukses"
    );
  } catch (err) {
    tampilPesanKaryawan("Gagal menyimpan: " + err.message, "error");
  }
}

async function resetKaryawan() {
  try {
    const res  = await fetch("/api/karyawan/reset", { method: "POST" });
    const data = await res.json();
    _daftarKaryawanEdit = [...data.karyawan];
    KARYAWAN_AKTIF = [...data.karyawan];
    renderDaftarKaryawan();
    document.getElementById("karyawan-jumlah").textContent = data.jumlah;
    tampilPesanKaryawan("Berhasil direset ke daftar karyawan default.", "sukses");
  } catch (err) {
    tampilPesanKaryawan("Gagal reset: " + err.message, "error");
  }
}

function tampilPesanKaryawan(teks, tipe) {
  const el = document.getElementById("karyawan-pesan");
  if (!el) return;
  el.className = tipe === "sukses" ? "notif-sukses" : "notif-error";
  el.textContent = teks;
  setTimeout(() => { el.textContent = ""; el.className = ""; }, 5000);
}



function initSlider() {
  const persen  = (v) => `${Math.round(v * 100)}%`;
  const persen1 = (v) => `${(v * 100).toFixed(1)}%`;

  hubungkanSlider("hc-iterasi",    "hc-iterasi-val");
  hubungkanSlider("sa-suhu",       "sa-suhu-val");
  hubungkanSlider("sa-alpha",      "sa-alpha-val",    persen);
  hubungkanSlider("sa-suhu-min",   "sa-suhu-min-val");
  hubungkanSlider("sa-iterasi",    "sa-iterasi-val");
  hubungkanSlider("ga-populasi",   "ga-populasi-val");
  hubungkanSlider("ga-generasi",   "ga-generasi-val");
  hubungkanSlider("ga-crossover",  "ga-crossover-val",  persen);
  hubungkanSlider("ga-mutasi",     "ga-mutasi-val",     persen1);
  hubungkanSlider("ga-elit",       "ga-elit-val");
  hubungkanSlider("ga-tournament", "ga-tournament-val");
  hubungkanSlider("komp-iterasi",  "komp-iterasi-val");
}

function initVarianHC() {
  document.querySelectorAll(".btn-varian").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".btn-varian").forEach((b) => b.classList.remove("aktif"));
      btn.classList.add("aktif");
      varianHC = btn.dataset.varian;
    });
  });
}

function initSinkronTab() {
  const MAP = {
    "tab-hc":       "hasil-hc",
    "tab-sa":       "hasil-sa",
    "tab-ga":       "hasil-ga",
    "tab-komp":     "hasil-komp",
    "tab-tentang":  "hasil-tentang",
    "tab-panduan":  "hasil-panduan",
    "tab-karyawan": "hasil-karyawan",
  };

  document.querySelectorAll("#nav-algoritma .nav-link").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = MAP[btn.id];
      if (!targetId) return;

      /* Sembunyikan semua panel */
      document.querySelectorAll(".tab-panel").forEach((p) => {
        p.classList.add("d-none");
      });

      /* Tampilkan panel yang sesuai */
      const panel = document.getElementById(targetId);
      if (panel) panel.classList.remove("d-none");

      /* Aktifkan styling nav */
      document.querySelectorAll("#nav-algoritma .nav-link").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      /* Muat karyawan saat tab karyawan dibuka */
      if (btn.id === "tab-karyawan") muatKaryawan();
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initSlider();
  initVarianHC();
  initSinkronTab();

  document.getElementById("btn-hc")?.addEventListener("click",   jalankanHC);
  document.getElementById("btn-sa")?.addEventListener("click",   jalankanSA);
  document.getElementById("btn-ga")?.addEventListener("click",   jalankanGA);
  document.getElementById("btn-komp")?.addEventListener("click", jalankanKomp);

  /* Kelola karyawan */
  document.getElementById("btn-tambah-karyawan")?.addEventListener("click", tambahKaryawan);
  document.getElementById("btn-reset-karyawan")?.addEventListener("click",  resetKaryawan);
  document.getElementById("btn-simpan-karyawan")?.addEventListener("click", simpanKaryawan);

  /* Muat karyawan di awal agar jumlah tampil benar */
  muatKaryawan();

  /* Event delegation untuk tombol ekspor (menghindari masalah JSON quoting di onclick) */
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-ekspor-key]");
    if (!btn) return;
    const key  = btn.dataset.eksporKey;
    const tipe = btn.dataset.eksporTipe;
    const d    = window._eksporStore?.[key];
    if (!d) { alert("Data ekspor tidak ditemukan, jalankan ulang simulasi."); return; }
    if (tipe === "csv") eksporCSV(d.jadwal, d.algoritma);
    if (tipe === "pdf") eksporPDF(d.jadwal, d.algoritma, d.fitness, d.pelanggaran);
  });
});
