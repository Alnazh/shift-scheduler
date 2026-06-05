"""
algorithms/genetic_algorithm.py
================================
Implementasi Genetic Algorithm (GA) untuk optimasi jadwal shift.

Terinspirasi dari evolusi biologis:
  - Setiap jadwal = satu individu (kromosom)
  - Kumpulan jadwal = populasi
  - Jadwal yang lebih baik → lebih mungkin dipilih sebagai induk
  - Dua induk menghasilkan anak melalui crossover
  - Anak bisa bermutasi secara acak
  - Elitisme: jadwal terbaik langsung dipertahankan ke generasi berikutnya

Komponen utama yang diimplementasikan:
  1. Inisialisasi populasi acak
  2. Seleksi tournament
  3. Crossover single-point
  4. Mutasi per-gen
  5. Elitisme

Mata Kuliah : Kecerdasan Buatan
Topik       : Pencarian Lokal dan Optimasi (B.5)
"""

import random
import time

from models.jadwal import (
    get_karyawan, NAMA_HARI, NAMA_SHIFT,
    buat_jadwal_acak, salin_jadwal,
    hitung_pelanggaran, hitung_fitness,
    jadwal_ke_list,
)


# ──────────────────────────────────────────────
# 1. INISIALISASI POPULASI
# ──────────────────────────────────────────────

def buat_populasi(ukuran):
    """
    Membuat populasi awal berisi sejumlah jadwal yang semuanya acak.
    Ini titik awal evolusi GA.
    """
    return [buat_jadwal_acak() for _ in range(ukuran)]


# ──────────────────────────────────────────────
# 2. SELEKSI TOURNAMENT
# ──────────────────────────────────────────────

def seleksi_tournament(populasi, nilai_fitness, k=3):
    """
    Pilih satu individu terbaik dari k kandidat acak.

    Cara kerja:
    - Ambil k jadwal secara acak dari populasi
    - Kembalikan yang memiliki fitness tertinggi di antara k tersebut

    Semakin besar k → tekanan seleksi lebih kuat (yang baik lebih sering terpilih)
    """
    kandidat = random.sample(range(len(populasi)), k)
    pemenang = max(kandidat, key=lambda i: nilai_fitness[i])
    return salin_jadwal(populasi[pemenang])


# ──────────────────────────────────────────────
# 3. CROSSOVER SINGLE-POINT
# ──────────────────────────────────────────────

def crossover_single_point(induk1, induk2):
    """
    Gabungkan dua jadwal induk menjadi dua jadwal anak.

    Cara kerja:
    - Bayangkan jadwal diratakan menjadi urutan panjang slot (karyawan × hari)
    - Pilih satu titik potong secara acak
    - Anak 1 = bagian kiri induk1 + bagian kanan induk2
    - Anak 2 = bagian kiri induk2 + bagian kanan induk1

    Ini menjaga karakteristik jadwal yang bagus dari kedua induk.
    """
    semua_slot   = [(k, h) for k in get_karyawan() for h in NAMA_HARI]
    titik_potong = random.randint(1, len(semua_slot) - 1)

    anak1 = salin_jadwal(induk1)
    anak2 = salin_jadwal(induk2)

    # Tukar semua slot setelah titik potong
    for k, h in semua_slot[titik_potong:]:
        anak1[k][h] = induk2[k][h]
        anak2[k][h] = induk1[k][h]

    return anak1, anak2


# ──────────────────────────────────────────────
# 4. MUTASI
# ──────────────────────────────────────────────

def mutasi(jadwal, prob_mutasi):
    """
    Ubah beberapa slot jadwal secara acak dengan probabilitas kecil.

    Fungsi mutasi mencegah populasi menjadi terlalu seragam
    dan membantu menjelajahi area baru dalam ruang solusi.

    Setiap slot (karyawan, hari) punya peluang prob_mutasi untuk diubah.
    """
    jadwal_baru = salin_jadwal(jadwal)
    for karyawan in get_karyawan():
        for hari in NAMA_HARI:
            if random.random() < prob_mutasi:
                jadwal_baru[karyawan][hari] = random.choice(NAMA_SHIFT)
    return jadwal_baru


# ──────────────────────────────────────────────
# 5. ELITISME
# ──────────────────────────────────────────────

def ambil_elit(populasi, nilai_fitness, jumlah):
    """
    Pilih n individu terbaik dari populasi untuk langsung
    dipertahankan ke generasi berikutnya tanpa diubah.

    Ini memastikan solusi terbaik yang sudah ditemukan
    tidak hilang karena crossover atau mutasi.
    """
    urutan = sorted(range(len(populasi)),
                    key=lambda i: nilai_fitness[i], reverse=True)
    return [salin_jadwal(populasi[i]) for i in urutan[:jumlah]]


# ──────────────────────────────────────────────
# FUNGSI UTAMA (dipanggil dari app.py)
# ──────────────────────────────────────────────

def jalankan_genetic_algorithm(
    ukuran_populasi       = 50,
    jumlah_generasi       = 100,
    probabilitas_crossover = 0.8,
    probabilitas_mutasi   = 0.02,
    jumlah_elit           = 2,
    tournament_k          = 3,
):
    """
    Jalankan Genetic Algorithm dari awal sampai selesai.

    Alur satu siklus generasi:
    1. Hitung fitness semua individu di populasi
    2. Simpan n individu terbaik (elitisme)
    3. Pilih pasangan induk via seleksi tournament
    4. Lakukan crossover → hasilkan anak baru
    5. Mutasi anak dengan probabilitas kecil
    6. Ulangi 3-5 sampai populasi baru penuh
    7. Ganti populasi lama dengan yang baru
    8. Ulangi seluruh proses sejumlah generasi

    Parameter:
        ukuran_populasi        : jumlah jadwal dalam satu generasi
        jumlah_generasi        : berapa kali populasi berevolusi
        probabilitas_crossover : peluang dua induk melakukan crossover
        probabilitas_mutasi    : peluang tiap slot jadwal bermutasi
        jumlah_elit            : berapa individu terbaik yang dipertahankan
        tournament_k           : ukuran grup seleksi tournament
    """
    waktu_mulai = time.time()
    populasi    = buat_populasi(ukuran_populasi)
    riwayat     = []

    solusi_terbaik_global  = None
    fitness_terbaik_global = -1.0

    for gen in range(jumlah_generasi):

        # Hitung fitness semua individu di generasi ini
        nilai_fitness     = [hitung_fitness(ind) for ind in populasi]
        jumlah_pelanggaran = [hitung_pelanggaran(ind) for ind in populasi]

        # Cari individu terbaik di generasi ini
        fitness_gen_terbaik = max(nilai_fitness)
        fitness_gen_rata    = sum(nilai_fitness) / len(nilai_fitness)
        idx_terbaik         = nilai_fitness.index(fitness_gen_terbaik)

        # Perbarui solusi terbaik global jika ada yang lebih baik
        if fitness_gen_terbaik > fitness_terbaik_global:
            fitness_terbaik_global = fitness_gen_terbaik
            solusi_terbaik_global  = salin_jadwal(populasi[idx_terbaik])

        riwayat.append({
            "generasi":               gen + 1,
            "fitness_terbaik":        round(fitness_gen_terbaik, 4),
            "fitness":                round(fitness_gen_terbaik, 4),
            "fitness_rata":           round(fitness_gen_rata, 4),
            "fitness_terbaik_global": round(fitness_terbaik_global, 4),
            "pelanggaran":            jumlah_pelanggaran[idx_terbaik],
        })

        # Berhenti lebih awal jika sudah sempurna
        if jumlah_pelanggaran[idx_terbaik] == 0:
            break

        # Bentuk populasi baru
        populasi_baru = ambil_elit(populasi, nilai_fitness, jumlah_elit)

        while len(populasi_baru) < ukuran_populasi:
            # Pilih dua induk via seleksi tournament
            induk1 = seleksi_tournament(populasi, nilai_fitness, tournament_k)
            induk2 = seleksi_tournament(populasi, nilai_fitness, tournament_k)

            # Crossover atau salin langsung
            if random.random() < probabilitas_crossover:
                anak1, anak2 = crossover_single_point(induk1, induk2)
            else:
                anak1 = salin_jadwal(induk1)
                anak2 = salin_jadwal(induk2)

            # Mutasi kedua anak
            anak1 = mutasi(anak1, probabilitas_mutasi)
            anak2 = mutasi(anak2, probabilitas_mutasi)

            populasi_baru.append(anak1)
            if len(populasi_baru) < ukuran_populasi:
                populasi_baru.append(anak2)

        populasi = populasi_baru

    pelanggaran_akhir = hitung_pelanggaran(solusi_terbaik_global)
    return {
        "algoritma":         "Genetic Algorithm",
        "pelanggaran_akhir": pelanggaran_akhir,
        "fitness_akhir":     round(fitness_terbaik_global, 4),
        "jadwal_terbaik":    jadwal_ke_list(solusi_terbaik_global),
        "total_generasi":    len(riwayat),
        "waktu_eksekusi":    round(time.time() - waktu_mulai, 3),
        "solusi_sempurna":   pelanggaran_akhir == 0,
        "parameter": {
            "ukuran_populasi":        ukuran_populasi,
            "jumlah_generasi":        jumlah_generasi,
            "probabilitas_crossover": probabilitas_crossover,
            "probabilitas_mutasi":    probabilitas_mutasi,
            "jumlah_elit":            jumlah_elit,
            "tournament_k":           tournament_k,
        },
        "riwayat": riwayat,
    }
