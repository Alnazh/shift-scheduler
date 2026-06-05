"""
algorithms/hill_climbing.py
============================
Implementasi algoritma Hill Climbing untuk optimasi jadwal shift.

Ide dasarnya sederhana:
  Mulai dari jadwal acak → coba jadwal tetangga yang sedikit berbeda
  → kalau lebih baik, pindah ke sana → ulangi sampai tidak ada lagi
  yang bisa diperbaiki atau iterasi habis.

Ada tiga varian yang diimplementasikan:
  1. Simple         - evaluasi 1 tetangga, langsung pindah kalau lebih baik
  2. Steepest-Ascent - bandingkan banyak tetangga, pilih yang terbaik
  3. Stochastic     - pilih tetangga acak, pindah hanya kalau lebih baik

Catatan Steepest-Ascent:
  Mengevaluasi 80 tetangga per iterasi untuk keputusan yang lebih baik.
  Menggunakan random restart jika stagnan untuk menghindari local optimum.

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
# MEMBUAT JADWAL TETANGGA
# ──────────────────────────────────────────────

def buat_tetangga(jadwal):
    """
    Membuat satu jadwal 'tetangga' dengan mengubah shift
    satu karyawan pada satu hari secara acak.

    Ini yang disebut 'gerak' (move) dalam pencarian lokal.
    Perubahan kecil ini memungkinkan algoritma menjelajahi
    ruang solusi sedikit demi sedikit.
    """
    tetangga         = salin_jadwal(jadwal)
    karyawan_dipilih = random.choice(get_karyawan())
    hari_dipilih     = random.choice(NAMA_HARI)
    shift_baru       = random.choice(NAMA_SHIFT)
    tetangga[karyawan_dipilih][hari_dipilih] = shift_baru
    return tetangga


def buat_banyak_tetangga(jadwal, jumlah=80):
    """
    Membuat beberapa jadwal tetangga sekaligus.
    Dipakai oleh Steepest-Ascent untuk membandingkan
    lebih banyak opsi sebelum memilih yang terbaik.
    Jumlah 80 dipilih agar lebih representatif dari ruang tetangga.
    """
    return [buat_tetangga(jadwal) for _ in range(jumlah)]


# ──────────────────────────────────────────────
# VARIAN 1: SIMPLE HILL CLIMBING
# ──────────────────────────────────────────────

def simple_hill_climbing(maks_iterasi=500):
    """
    Varian paling dasar dari Hill Climbing.

    Cara kerja:
    - Setiap langkah buat 1 jadwal tetangga
    - Kalau tetangga >= solusi sekarang → pindah
    - Kalau tidak → tetap di tempat
    - Berhenti saat iterasi habis atau jadwal sudah sempurna
    """
    waktu_mulai  = time.time()
    solusi       = buat_jadwal_acak()
    fitness_kini = hitung_fitness(solusi)
    riwayat      = []

    for i in range(maks_iterasi):
        tetangga         = buat_tetangga(solusi)
        fitness_tetangga = hitung_fitness(tetangga)

        # Pindah jika tetangga sama baik atau lebih baik
        if fitness_tetangga >= fitness_kini:
            solusi       = tetangga
            fitness_kini = fitness_tetangga

        pelanggaran = hitung_pelanggaran(solusi)
        riwayat.append({
            "iterasi":     i + 1,
            "fitness":     round(fitness_kini, 4),
            "pelanggaran": pelanggaran,
        })

        if pelanggaran == 0:
            break

    return _format_hasil("Simple Hill Climbing", solusi, riwayat, waktu_mulai)


# ──────────────────────────────────────────────
# VARIAN 2: STEEPEST-ASCENT HILL CLIMBING
# ──────────────────────────────────────────────

def steepest_ascent_hill_climbing(maks_iterasi=300):
    """
    Varian yang lebih cermat — membandingkan banyak tetangga
    sebelum memutuskan ke mana akan bergerak.

    Cara kerja:
    - Setiap langkah buat 80 jadwal tetangga
    - Pilih tetangga dengan fitness tertinggi
    - Pindah hanya kalau tetangga terbaik lebih baik dari sekarang
    - Jika stagnan (tidak ada kemajuan 30 langkah), lakukan random restart
      dari titik awal yang baru untuk menghindari local optimum
    """
    waktu_mulai      = time.time()
    solusi           = buat_jadwal_acak()
    fitness_kini     = hitung_fitness(solusi)
    solusi_terbaik   = salin_jadwal(solusi)
    fitness_terbaik  = fitness_kini
    riwayat          = []
    stagnan          = 0   # Hitung berapa langkah tanpa kemajuan

    for i in range(maks_iterasi):
        daftar_tetangga = buat_banyak_tetangga(solusi, 80)
        tetangga_terbaik = max(daftar_tetangga, key=hitung_fitness)
        fitness_kandidat = hitung_fitness(tetangga_terbaik)

        if fitness_kandidat > fitness_kini:
            solusi       = tetangga_terbaik
            fitness_kini = fitness_kandidat
            stagnan      = 0  # Ada kemajuan, reset penghitung
        else:
            stagnan += 1

        # Perbarui solusi terbaik global
        if fitness_kini > fitness_terbaik:
            solusi_terbaik  = salin_jadwal(solusi)
            fitness_terbaik = fitness_kini

        pelanggaran = hitung_pelanggaran(solusi_terbaik)
        riwayat.append({
            "iterasi":     i + 1,
            "fitness":     round(fitness_terbaik, 4),
            "pelanggaran": pelanggaran,
        })

        if pelanggaran == 0:
            break

        # Random restart jika stagnan terlalu lama
        if stagnan >= 30:
            solusi       = buat_jadwal_acak()
            fitness_kini = hitung_fitness(solusi)
            stagnan      = 0

    return _format_hasil("Steepest-Ascent Hill Climbing", solusi_terbaik, riwayat, waktu_mulai)


# ──────────────────────────────────────────────
# VARIAN 3: STOCHASTIC HILL CLIMBING
# ──────────────────────────────────────────────

def stochastic_hill_climbing(maks_iterasi=3000):
    """
    Varian acak — tetangga dipilih secara random.
    Berbeda dari Simple HC: hanya pindah jika tetangga LEBIH BAIK,
    tidak menerima yang sama.

    Karena sifatnya acak, hasil tiap run bisa berbeda.
    Ini adalah perilaku normal sesuai definisi algoritma stochastic.
    Menggunakan random restart jika stagnan untuk meningkatkan peluang
    menemukan solusi optimal.
    """
    waktu_mulai     = time.time()
    solusi          = buat_jadwal_acak()
    fitness_kini    = hitung_fitness(solusi)
    solusi_terbaik  = salin_jadwal(solusi)
    fitness_terbaik = fitness_kini
    riwayat         = []
    stagnan         = 0

    for i in range(maks_iterasi):
        tetangga         = buat_tetangga(solusi)
        fitness_tetangga = hitung_fitness(tetangga)

        # Pindah HANYA jika tetangga lebih baik (bukan sama baik)
        if fitness_tetangga > fitness_kini:
            solusi       = tetangga
            fitness_kini = fitness_tetangga
            stagnan      = 0
        else:
            stagnan += 1

        if fitness_kini > fitness_terbaik:
            solusi_terbaik  = salin_jadwal(solusi)
            fitness_terbaik = fitness_kini

        pelanggaran = hitung_pelanggaran(solusi_terbaik)
        riwayat.append({
            "iterasi":     i + 1,
            "fitness":     round(fitness_terbaik, 4),
            "pelanggaran": pelanggaran,
        })

        if pelanggaran == 0:
            break

        # Random restart jika stagnan terlalu lama
        if stagnan >= 50:
            solusi       = buat_jadwal_acak()
            fitness_kini = hitung_fitness(solusi)
            stagnan      = 0

    return _format_hasil("Stochastic Hill Climbing", solusi_terbaik, riwayat, waktu_mulai)


# ──────────────────────────────────────────────
# FORMAT HASIL
# ──────────────────────────────────────────────

def _format_hasil(nama, solusi, riwayat, waktu_mulai):
    """Menyusun dict hasil yang seragam untuk semua varian HC."""
    pelanggaran_akhir = hitung_pelanggaran(solusi)
    return {
        "algoritma":         nama,
        "pelanggaran_akhir": pelanggaran_akhir,
        "fitness_akhir":     round(hitung_fitness(solusi), 4),
        "jadwal_terbaik":    jadwal_ke_list(solusi),
        "total_iterasi":     len(riwayat),
        "waktu_eksekusi":    round(time.time() - waktu_mulai, 3),
        "solusi_sempurna":   pelanggaran_akhir == 0,
        "riwayat":           riwayat,
    }


# ──────────────────────────────────────────────
# FUNGSI UTAMA (dipanggil dari app.py)
# ──────────────────────────────────────────────

def jalankan_hill_climbing(maks_iterasi=500, varian="simple"):
    """
    Jalankan salah satu varian Hill Climbing.

    Parameter:
        maks_iterasi : berapa kali maksimum algoritma mencoba perbaikan
        varian       : "simple", "steepest", atau "stochastic"
    """
    if varian == "steepest":
        return steepest_ascent_hill_climbing(maks_iterasi)
    elif varian == "stochastic":
        return stochastic_hill_climbing(maks_iterasi)
    else:
        return simple_hill_climbing(maks_iterasi)
