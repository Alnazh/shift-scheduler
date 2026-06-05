/**
 * grafik.js
 * =========
 * Modul render grafik menggunakan Chart.js.
 * Mencakup:
 *   - Grafik konvergensi fitness (line chart)
 *   - Kurva suhu SA (cooling schedule)
 *   - Bar chart perbandingan komparatif
 *   - Animasi step-by-step playback riwayat
 */

/* Simpan instance chart aktif agar bisa di-destroy sebelum dibuat ulang */
const CHART_INSTANCES = {};

/* Warna tema konsisten */
const WARNA = {
  aksen:  "#16bdca",
  hijau:  "#0e9f6e",
  kuning: "#e3a008",
  merah:  "#e02424",
  ungu:   "#7e3af2",
  muted:  "#64748b",
  border: "rgba(51,65,85,0.5)",
  bg:     "#273548",
};

/* Opsi default axis */
const AXIS_STYLE = {
  ticks: { color: "#64748b", font: { size: 10 } },
  grid:  { color: WARNA.border },
};

/**
 * Menghapus instance chart lama pada canvas tertentu.
 * @param {string} id - ID canvas
 */
function hapusGrafik(id) {
  if (CHART_INSTANCES[id]) {
    CHART_INSTANCES[id].destroy();
    delete CHART_INSTANCES[id];
  }
}

/* ──────────────────────────────────────────────
   1. GRAFIK KONVERGENSI FITNESS (Line Chart)
   ────────────────────────────────────────────── */

/**
 * Merender grafik konvergensi fitness per iterasi/generasi.
 * @param {string} canvasId  - ID elemen canvas
 * @param {Array}  riwayat   - Data riwayat dari backend
 * @param {string} algoritma - Nama algoritma untuk label
 * @param {string} tipeX     - "iterasi" | "generasi"
 */
function renderGrafikKonvergensi(canvasId, riwayat, algoritma, tipeX) {
  hapusGrafik(canvasId);
  const canvas = document.getElementById(canvasId);
  if (!canvas || !riwayat || riwayat.length === 0) return;

  const kunciX = tipeX === "generasi" ? "generasi" : "iterasi";
  const labels = riwayat.map((d) => d[kunciX]);
  const datasets = [];

  /* Dataset fitness utama */
  datasets.push({
    label:           "Fitness",
    data:            riwayat.map((d) => d.fitness),
    borderColor:     WARNA.aksen,
    backgroundColor: "rgba(22,189,202,0.07)",
    borderWidth: 2, pointRadius: 0, tension: 0.3, fill: true,
  });

  /* Fitness terbaik global (GA & SA) */
  if (riwayat[0]?.fitness_terbaik !== undefined) {
    datasets.push({
      label:       "Fitness Terbaik Global",
      data:        riwayat.map((d) => d.fitness_terbaik),
      borderColor: WARNA.hijau, borderWidth: 2,
      borderDash: [5, 3], pointRadius: 0, tension: 0.3, fill: false,
    });
  }

  /* Rata-rata populasi (GA) */
  if (riwayat[0]?.fitness_rata !== undefined) {
    datasets.push({
      label:       "Rata-rata Populasi",
      data:        riwayat.map((d) => d.fitness_rata),
      borderColor: WARNA.kuning, borderWidth: 1.5,
      borderDash: [3, 2], pointRadius: 0, tension: 0.3, fill: false,
    });
  }

  CHART_INSTANCES[canvasId] = new Chart(canvas, {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 300 },
      plugins: {
        legend: { labels: { color: "#94a3b8", font: { size: 11 }, boxWidth: 18 } },
        tooltip: {
          backgroundColor: WARNA.bg, titleColor: "#94a3b8",
          bodyColor: "#e2e8f0", borderColor: "#334155", borderWidth: 1,
          callbacks: {
            title: (i) => `${tipeX === "generasi" ? "Generasi" : "Iterasi"} ke-${i[0].label}`,
            label: (i) => ` ${i.dataset.label}: ${parseFloat(i.raw).toFixed(4)}`,
          },
        },
      },
      scales: {
        x: { ...AXIS_STYLE, title: { display: true, text: tipeX === "generasi" ? "Generasi" : "Iterasi", color: WARNA.muted, font: { size: 11 } } },
        y: { ...AXIS_STYLE, min: 0, max: 1,
             ticks: { ...AXIS_STYLE.ticks, callback: (v) => v.toFixed(2) },
             title: { display: true, text: "Fitness (0–1)", color: WARNA.muted, font: { size: 11 } } },
      },
    },
  });
}

/* ──────────────────────────────────────────────
   2. KURVA SUHU SA (Cooling Schedule)
   ────────────────────────────────────────────── */

/**
 * Merender kurva penurunan suhu SA.
 * @param {string} canvasId - ID elemen canvas
 * @param {Array}  riwayat  - Data riwayat SA dari backend
 */
function renderKurvaSuhu(canvasId, riwayat) {
  hapusGrafik(canvasId);
  const canvas = document.getElementById(canvasId);
  if (!canvas || !riwayat || riwayat.length === 0) return;

  const labels    = riwayat.map((d) => d.iterasi);
  const dataSuhu  = riwayat.map((d) => d.suhu);
  const dataProb  = riwayat.map((d) => d.probabilitas_terakhir);

  CHART_INSTANCES[canvasId] = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label:       "Suhu (T)",
          data:        dataSuhu,
          borderColor: WARNA.merah, backgroundColor: "rgba(224,36,36,0.07)",
          borderWidth: 2, pointRadius: 0, tension: 0.2, fill: true,
          yAxisID: "ySuhu",
        },
        {
          label:       "P(terima solusi buruk)",
          data:        dataProb,
          borderColor: WARNA.ungu,
          borderWidth: 1.5, pointRadius: 0, tension: 0.2, fill: false,
          borderDash: [4, 3], yAxisID: "yProb",
        },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 300 },
      plugins: {
        legend: { labels: { color: "#94a3b8", font: { size: 11 }, boxWidth: 18 } },
        tooltip: {
          backgroundColor: WARNA.bg, titleColor: "#94a3b8",
          bodyColor: "#e2e8f0", borderColor: "#334155", borderWidth: 1,
        },
      },
      scales: {
        x: { ...AXIS_STYLE, title: { display: true, text: "Iterasi", color: WARNA.muted, font: { size: 11 } } },
        ySuhu: {
          position: "left", ...AXIS_STYLE,
          title: { display: true, text: "Suhu (T)", color: WARNA.merah, font: { size: 11 } },
          ticks: { color: WARNA.merah, font: { size: 10 } },
        },
        yProb: {
          position: "right", min: 0, max: 1,
          ticks: { color: "#a78bfa", font: { size: 10 }, callback: (v) => v.toFixed(2) },
          grid: { drawOnChartArea: false },
          title: { display: true, text: "Probabilitas Boltzmann", color: "#a78bfa", font: { size: 11 } },
        },
      },
    },
  });
}

/* ──────────────────────────────────────────────
   3. BAR CHART KOMPARATIF
   ────────────────────────────────────────────── */

/**
 * Merender bar chart perbandingan semua algoritma.
 * @param {string} canvasId  - ID elemen canvas
 * @param {Array}  ringkasan - Array ringkasan hasil tiap algoritma
 */
function renderGrafikKomparatif(canvasId, ringkasan) {
  hapusGrafik(canvasId);
  const canvas = document.getElementById(canvasId);
  if (!canvas || !ringkasan) return;

  const labels  = ringkasan.map((r) => r.algoritma.replace(" Hill Climbing", "\nHC").replace("Simulated ", ""));
  const fitness = ringkasan.map((r) => r.fitness);
  const pelanggaran = ringkasan.map((r) => r.pelanggaran);
  const waktu   = ringkasan.map((r) => r.waktu);

  CHART_INSTANCES[canvasId] = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label:           "Fitness Akhir",
          data:            fitness,
          backgroundColor: "rgba(22,189,202,0.55)",
          borderColor:     WARNA.aksen, borderWidth: 1,
          yAxisID: "y",
        },
        {
          label:           "Pelanggaran",
          data:            pelanggaran,
          backgroundColor: "rgba(224,36,36,0.45)",
          borderColor:     WARNA.merah, borderWidth: 1,
          yAxisID: "y2",
        },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 400 },
      plugins: {
        legend: { labels: { color: "#94a3b8", font: { size: 11 }, boxWidth: 16 } },
        tooltip: {
          backgroundColor: WARNA.bg, titleColor: "#94a3b8",
          bodyColor: "#e2e8f0", borderColor: "#334155", borderWidth: 1,
        },
      },
      scales: {
        x: { ticks: { color: "#94a3b8", font: { size: 10 } }, grid: { color: WARNA.border } },
        y: {
          position: "left", min: 0, max: 1,
          ticks: { color: WARNA.aksen, font: { size: 10 } },
          grid: { color: "rgba(22,189,202,0.1)" },
          title: { display: true, text: "Fitness", color: WARNA.aksen, font: { size: 11 } },
        },
        y2: {
          position: "right",
          ticks: { color: WARNA.merah, font: { size: 10 } },
          grid: { drawOnChartArea: false },
          title: { display: true, text: "Pelanggaran", color: WARNA.merah, font: { size: 11 } },
        },
      },
    },
  });
}

/* ──────────────────────────────────────────────
   4. GRAFIK WAKTU EKSEKUSI (Bar chart horizontal)
   ────────────────────────────────────────────── */

/**
 * Merender bar chart horizontal waktu eksekusi semua algoritma.
 * @param {string} canvasId  - ID canvas
 * @param {Array}  ringkasan - Data ringkasan komparatif
 */
function renderGrafikWaktu(canvasId, ringkasan) {
  hapusGrafik(canvasId);
  const canvas = document.getElementById(canvasId);
  if (!canvas || !ringkasan) return;

  const labels = ringkasan.map((r) => r.algoritma.replace(" Hill Climbing", " HC").replace("Simulated ", ""));
  const waktu  = ringkasan.map((r) => r.waktu);

  CHART_INSTANCES[canvasId] = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label:           "Waktu Eksekusi (detik)",
        data:            waktu,
        backgroundColor: "rgba(227,160,8,0.5)",
        borderColor:     WARNA.kuning, borderWidth: 1,
      }],
    },
    options: {
      indexAxis: "y",
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 400 },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: WARNA.bg, bodyColor: "#e2e8f0",
          borderColor: "#334155", borderWidth: 1,
          callbacks: { label: (i) => ` ${i.raw} detik` },
        },
      },
      scales: {
        x: { ticks: { color: WARNA.muted, font: { size: 10 } }, grid: { color: WARNA.border },
             title: { display: true, text: "Detik", color: WARNA.muted, font: { size: 11 } } },
        y: { ticks: { color: "#94a3b8", font: { size: 11 } }, grid: { color: WARNA.border } },
      },
    },
  });
}

/* ──────────────────────────────────────────────
   5. ANIMASI STEP-BY-STEP
   ────────────────────────────────────────────── */

/**
 * Objek untuk mengelola animasi playback riwayat iterasi.
 * Dapat dipakai untuk tab apapun (HC, SA, GA).
 */
const Animasi = {
  timer:    null,
  riwayat:  [],
  indexSaat: 0,
  kecepatan: 80,   /* ms per frame */

  /**
   * Inisialisasi animasi dengan data riwayat baru.
   * @param {Array}    riwayat     - Data riwayat dari backend
   * @param {Function} onUpdate    - Callback(frame, index, total) saat tiap frame
   * @param {string}   progressId  - ID elemen progress bar
   * @param {string}   infoId      - ID elemen teks info iterasi
   */
  init(riwayat, onUpdate, progressId, infoId) {
    this.berhenti();
    this.riwayat   = riwayat;
    this.indexSaat = riwayat.length - 1; /* Mulai dari akhir */
    this.onUpdate  = onUpdate;
    this.progressId = progressId;
    this.infoId     = infoId;
    this._perbarui(this.indexSaat);
  },

  putar() {
    if (this.riwayat.length === 0) return;
    this.berhenti();
    this.indexSaat = 0;

    this.timer = setInterval(() => {
      if (this.indexSaat >= this.riwayat.length) {
        this.berhenti();
        return;
      }
      this._perbarui(this.indexSaat);
      this.indexSaat++;
    }, this.kecepatan);
  },

  berhenti() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  },

  ke(index) {
    this.berhenti();
    this.indexSaat = Math.max(0, Math.min(index, this.riwayat.length - 1));
    this._perbarui(this.indexSaat);
  },

  _perbarui(index) {
    const frame = this.riwayat[index];
    if (!frame) return;

    /* Update progress bar */
    const persen = ((index + 1) / this.riwayat.length) * 100;
    const progressEl = document.getElementById(this.progressId);
    if (progressEl) progressEl.style.width = persen + "%";

    /* Update teks info */
    const kunciX = frame.generasi ? "Generasi" : "Iterasi";
    const nilaiX = frame.generasi ?? frame.iterasi ?? (index + 1);
    const infoEl = document.getElementById(this.infoId);
    if (infoEl) {
      infoEl.textContent =
        `${kunciX} ${nilaiX} / ${this.riwayat.length} | Fitness: ${frame.fitness?.toFixed(4) ?? "-"} | Pelanggaran: ${frame.pelanggaran ?? "-"}`;
    }

    /* Panggil callback */
    if (this.onUpdate) this.onUpdate(frame, index, this.riwayat.length);
  },
};
