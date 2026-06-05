/**
 * tabel.js
 * ========
 * Modul render tabel ke dalam DOM:
 *   - Tabel jadwal shift karyawan (berwarna)
 *   - Kartu statistik ringkas
 *   - Tabel perbandingan komparatif semua algoritma
 */

/* KARYAWAN_AKTIF diisi oleh app.js setiap kali data karyawan dimuat/disimpan.
   Tidak boleh di-hardcode di sini agar karyawan baru langsung terbaca. */
let KARYAWAN_AKTIF = ["Andi","Budi","Citra","Dewi","Eko","Fitri","Gilang","Hana","Irfan","Joko"];
const HARI         = ["Senin","Selasa","Rabu","Kamis","Jumat","Sabtu","Minggu"];

/* Kode chip warna berdasarkan nama shift */
const KODE_CHIP = { Pagi: "P", Siang: "S", Malam: "M", Libur: "L" };

/**
 * Membuat elemen chip shift berwarna.
 * @param {string} namaShift - Nama shift ("Pagi"|"Siang"|"Malam"|"Libur")
 * @returns {string} HTML string
 */
function buatChip(namaShift) {
  const kode = KODE_CHIP[namaShift] ?? namaShift[0];
  return `<span class="chip chip-${kode}" title="${namaShift}">${kode}</span>`;
}

/* ──────────────────────────────────────────────
   1. TABEL JADWAL SHIFT
   ────────────────────────────────────────────── */

/**
 * Merender tabel jadwal shift ke dalam container.
 * @param {string}       containerId - ID elemen target
 * @param {Array<Array>} jadwal      - Matriks jadwal [karyawan][hari]
 * @param {string}       judul       - Judul tabel (opsional)
 */
function renderTabelJadwal(containerId, jadwal, judul) {
  const el = document.getElementById(containerId);
  if (!el || !jadwal) return;

  let html = "";

  if (judul) {
    html += `<p class="mb-3" style="font-size:12px;font-weight:600;">${judul}</p>`;
  }

  html += `<div style="overflow-x:auto;">
    <table class="tabel-jadwal">
      <thead>
        <tr>
          <th>Karyawan</th>
          ${HARI.map((h) => `<th>${h.slice(0, 3)}</th>`).join("")}
        </tr>
      </thead>
      <tbody>`;

  KARYAWAN_AKTIF.forEach((nama, idxK) => {
    html += `<tr><td>${nama}</td>`;
    HARI.forEach((_, idxH) => {
      html += `<td>${buatChip(jadwal[idxK][idxH])}</td>`;
    });
    html += `</tr>`;
  });

  html += `</tbody></table></div>`;

  /* Legenda */
  html += `<div class="legenda">
    ${["Pagi","Siang","Malam","Libur"].map((s) =>
      `<div class="legenda-item">${buatChip(s)}<span>${s}</span></div>`
    ).join("")}
  </div>`;

  el.innerHTML = html;
}

/* ──────────────────────────────────────────────
   2. KARTU STATISTIK
   ────────────────────────────────────────────── */

/**
 * Merender baris kartu statistik ke dalam container.
 * @param {string} containerId - ID elemen target
 * @param {Array}  stats - Array { label, nilai, satuan?, warna? }
 */
function renderStatistik(containerId, stats) {
  const el = document.getElementById(containerId);
  if (!el) return;

  el.innerHTML = `<div class="stat-grid">
    ${stats.map((s) => {
      /* Nama algoritma yang panjang → font mono dikecilkan */
      const isAlgoritma = s.label === "Algoritma";
      const fontStyle   = isAlgoritma
        ? "font-size:14px;font-weight:700;line-height:1.4;"
        : "";
      return `
      <div class="stat-card${isAlgoritma ? " stat-card--wide" : ""}">
        <div class="s-label">${s.label}</div>
        <div class="s-nilai" style="color:${s.warna || "#16bdca"};${fontStyle}">
          ${s.nilai}${s.satuan ? `<span class="s-satuan">${s.satuan}</span>` : ""}
        </div>
      </div>`;
    }).join("")}
  </div>`;
}

/* ──────────────────────────────────────────────
   3. TABEL KOMPARATIF (B.5)
   ────────────────────────────────────────────── */

/**
 * Merender tabel perbandingan semua algoritma sesuai metrik B.5:
 * waktu konvergensi, kualitas solusi, jumlah iterasi.
 * @param {string} containerId - ID elemen target
 * @param {Array}  ringkasan   - Array ringkasan hasil tiap algoritma
 */
function renderTabelKomparatif(containerId, ringkasan) {
  const el = document.getElementById(containerId);
  if (!el || !ringkasan) return;

  /* Tentukan nilai terbaik per kolom */
  const fitnessTerbaik     = Math.max(...ringkasan.map((r) => r.fitness));
  const pelanggaranTerbaik = Math.min(...ringkasan.map((r) => r.pelanggaran));
  const waktuTerbaik       = Math.min(...ringkasan.map((r) => r.waktu));
  const iterasiTerbaik     = Math.min(...ringkasan.map((r) => r.iterasi));

  let html = `<div style="overflow-x:auto;">
    <table class="tabel-komp w-100">
      <thead>
        <tr>
          <th>Algoritma</th>
          <th>Fitness Akhir ↑</th>
          <th>Pelanggaran ↓</th>
          <th>Iterasi/Generasi ↓</th>
          <th>Waktu Konvergensi ↓</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>`;

  ringkasan.forEach((r) => {
    const cF = r.fitness === fitnessTerbaik           ? "sel-terbaik" : "";
    const cP = r.pelanggaran === pelanggaranTerbaik   ? "sel-terbaik" : "";
    const cI = r.iterasi === iterasiTerbaik           ? "sel-terbaik" : "";
    const cW = r.waktu === waktuTerbaik               ? "sel-terbaik" : "";

    const badge = r.sempurna
      ? `<span style="font-size:11px;padding:2px 8px;border-radius:10px;background:rgba(14,159,110,0.15);color:#34d399;border:1px solid rgba(14,159,110,0.4);">✓ Optimal</span>`
      : `<span style="font-size:11px;padding:2px 8px;border-radius:10px;background:rgba(227,160,8,0.15);color:#fbbf24;border:1px solid rgba(227,160,8,0.4);">Belum Optimal</span>`;

    html += `<tr>
      <td style="font-weight:500;">${r.algoritma}</td>
      <td class="${cF}">${r.fitness}</td>
      <td class="${cP}">${r.pelanggaran}</td>
      <td class="${cI}">${r.iterasi}</td>
      <td class="${cW}">${r.waktu} dtk</td>
      <td>${badge}</td>
    </tr>`;
  });

  html += `</tbody></table></div>
    <p style="font-size:10px;color:#475569;margin-top:8px;">
      ↑ Semakin tinggi semakin baik &nbsp;·&nbsp; ↓ Semakin kecil semakin baik &nbsp;·&nbsp;
      <span style="color:#0e9f6e;font-weight:600;">Hijau</span> = terbaik di kategori tersebut
    </p>`;

  el.innerHTML = html;
}
