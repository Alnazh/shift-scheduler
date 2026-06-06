import math
import random
import time

from models.jadwal import (
    buat_jadwal_acak, salin_jadwal,
    hitung_pelanggaran, hitung_fitness,
    jadwal_ke_list,
)
from algorithms.hill_climbing import buat_tetangga


def jalankan_simulated_annealing(
    suhu_awal        = 10.0,
    laju_pendinginan = 0.995,
    suhu_minimum     = 0.001,
    maks_iterasi     = 3000,
):

    waktu_mulai = time.time()

    # Mulai dari jadwal acak
    solusi_kini      = buat_jadwal_acak()
    pelanggaran_kini = hitung_pelanggaran(solusi_kini)

    # Simpan solusi terbaik yang pernah ditemukan (tidak selalu sama
    # dengan solusi saat ini karena SA bisa bergerak ke yang lebih buruk)
    solusi_terbaik      = salin_jadwal(solusi_kini)
    pelanggaran_terbaik = pelanggaran_kini

    suhu    = suhu_awal
    riwayat = []
    iterasi = 0
    jumlah_diterima_buruk = 0

    while suhu > suhu_minimum and iterasi < maks_iterasi:
        tetangga             = buat_tetangga(solusi_kini)
        pelanggaran_tetangga = hitung_pelanggaran(tetangga)

        # Hitung selisih pelanggaran (negatif = tetangga lebih baik)
        delta = pelanggaran_tetangga - pelanggaran_kini

        if delta <= 0:
            # Tetangga sama baik atau lebih baik → selalu pindah
            solusi_kini      = tetangga
            pelanggaran_kini = pelanggaran_tetangga
        else:
            # Tetangga lebih buruk → terima dengan probabilitas Boltzmann
            # P = exp(-delta / T), semakin kecil T semakin kecil P
            probabilitas = math.exp(-delta / suhu)
            if random.random() < probabilitas:
                solusi_kini      = tetangga
                pelanggaran_kini = pelanggaran_tetangga
                jumlah_diterima_buruk += 1

        # Perbarui solusi terbaik jika ada yang lebih sedikit pelanggarannya
        if pelanggaran_kini < pelanggaran_terbaik:
            solusi_terbaik      = salin_jadwal(solusi_kini)
            pelanggaran_terbaik = pelanggaran_kini

        # Hitung probabilitas Boltzmann untuk divisualisasikan di grafik
        prob_boltzmann = math.exp(-delta / suhu) if delta > 0 else 1.0

        riwayat.append({
            "iterasi":               iterasi + 1,
            "suhu":                  round(suhu, 4),
            "fitness":               round(hitung_fitness(solusi_kini), 4),
            "fitness_terbaik":       round(hitung_fitness(solusi_terbaik), 4),
            "pelanggaran":           pelanggaran_kini,
            "probabilitas_terakhir": round(prob_boltzmann, 4),
        })

        # Turunkan suhu setiap iterasi (geometric cooling schedule: T = T × alpha)
        suhu    *= laju_pendinginan
        iterasi += 1

        # Berhenti lebih awal jika sudah sempurna
        if pelanggaran_terbaik == 0:
            break

    return {
        "algoritma":             "Simulated Annealing",
        "pelanggaran_akhir":     pelanggaran_terbaik,
        "fitness_akhir":         round(hitung_fitness(solusi_terbaik), 4),
        "jadwal_terbaik":        jadwal_ke_list(solusi_terbaik),
        "total_iterasi":         iterasi,
        "waktu_eksekusi":        round(time.time() - waktu_mulai, 3),
        "solusi_sempurna":       pelanggaran_terbaik == 0,
        "suhu_akhir":            round(suhu, 4),
        "jumlah_diterima_buruk": jumlah_diterima_buruk,
        "parameter": {
            "suhu_awal":         suhu_awal,
            "laju_pendinginan":  laju_pendinginan,
            "suhu_minimum":      suhu_minimum,
        },
        "riwayat": riwayat,
    }
