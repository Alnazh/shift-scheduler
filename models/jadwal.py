"""
models/jadwal.py
================
Berisi semua data dasar yang dipakai simulasi:
- Daftar nama karyawan (bisa diubah secara dinamis)
- Definisi shift dan hari kerja
- Aturan constraint jadwal
- Fungsi untuk membuat jadwal acak
- Fungsi untuk menghitung seberapa bagus sebuah jadwal (fitness)

Mata Kuliah : Kecerdasan Buatan
Topik       : Pencarian Lokal dan Optimasi (B.5)
"""

import random
import copy


# ──────────────────────────────────────────────
# DATA DASAR (BISA DIUBAH SECARA DINAMIS)
# ──────────────────────────────────────────────

# Daftar karyawan default — bisa diganti via API /api/karyawan
KARYAWAN_DEFAULT = [
    "Andi", "Budi", "Citra", "Dewi", "Eko",
    "Fitri", "Gilang", "Hana", "Irfan", "Joko"
]

# State aktif karyawan (diubah oleh endpoint /api/karyawan)
_karyawan_aktif = KARYAWAN_DEFAULT.copy()


def get_karyawan():
    """Mengembalikan daftar karyawan yang sedang aktif."""
    return _karyawan_aktif.copy()


def set_karyawan(daftar_baru):
    """
    Mengganti daftar karyawan aktif.
    Minimal 5 karyawan, maksimal 20 karyawan.
    """
    global _karyawan_aktif
    if len(daftar_baru) < 7:
        raise ValueError("Minimal 7 karyawan (agar jadwal bisa memenuhi semua constraint)")
    if len(daftar_baru) > 20:
        raise ValueError("Maksimal 20 karyawan")
    # Hapus duplikat dan nama kosong
    bersih = [str(n).strip() for n in daftar_baru if str(n).strip()]
    if len(bersih) < 5:
        raise ValueError("Minimal 5 nama karyawan valid")
    _karyawan_aktif = bersih


# Properti alias agar kode algoritma tidak perlu diubah
@property
def KARYAWAN():
    return get_karyawan()


# 4 jenis shift yang tersedia
SHIFT = {
    "Pagi":  {"jam": "07:00-15:00", "kode": "P"},
    "Siang": {"jam": "15:00-23:00", "kode": "S"},
    "Malam": {"jam": "23:00-07:00", "kode": "M"},
    "Libur": {"jam": "-",           "kode": "L"},
}

# Urutan shift dan hari yang dipakai di seluruh program
NAMA_SHIFT = ["Pagi", "Siang", "Malam", "Libur"]
NAMA_HARI  = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]


# ──────────────────────────────────────────────
# ATURAN CONSTRAINT JADWAL
# ──────────────────────────────────────────────

# Minimal berapa karyawan yang harus masuk per shift setiap hari
MINIMAL_KARYAWAN = {
    "Pagi":  2,
    "Siang": 2,
    "Malam": 1,
}

MAKS_KERJA = 5   # Maksimal hari kerja dalam seminggu per orang
MIN_LIBUR  = 2   # Minimal hari libur dalam seminggu per orang


# ──────────────────────────────────────────────
# MEMBUAT DAN MENYALIN JADWAL
# ──────────────────────────────────────────────

def buat_jadwal_acak():
    """
    Membuat satu jadwal kerja mingguan secara acak.
    Menggunakan daftar karyawan yang sedang aktif.

    Struktur jadwal: dict[nama_karyawan][nama_hari] = nama_shift
    Contoh: jadwal["Andi"]["Senin"] = "Pagi"
    """
    karyawan = get_karyawan()
    jadwal = {}
    for k in karyawan:
        jadwal[k] = {}
        for hari in NAMA_HARI:
            jadwal[k][hari] = random.choice(NAMA_SHIFT)
    return jadwal


def salin_jadwal(jadwal):
    """Membuat salinan jadwal yang benar-benar terpisah dari aslinya."""
    return copy.deepcopy(jadwal)


# ──────────────────────────────────────────────
# MENGHITUNG KUALITAS JADWAL
# ──────────────────────────────────────────────

def hitung_pelanggaran(jadwal):
    """
    Menghitung total pelanggaran aturan pada sebuah jadwal.
    Semakin kecil hasilnya, semakin bagus jadwalnya.
    Nilai 0 berarti jadwal sempurna.

    Aturan yang diperiksa:
    1. Jumlah karyawan per shift harus mencukupi
    2. Tidak boleh kerja lebih dari MAKS_KERJA hari seminggu
    3. Harus libur minimal MIN_LIBUR hari seminggu
    4. Tidak boleh shift Malam lalu langsung Pagi besoknya
    """
    karyawan    = get_karyawan()
    pelanggaran = 0

    # Aturan 1: kecukupan karyawan per shift setiap hari
    for hari in NAMA_HARI:
        for nama_shift, minimal in MINIMAL_KARYAWAN.items():
            jumlah = sum(1 for k in karyawan if jadwal[k][hari] == nama_shift)
            if jumlah < minimal:
                pelanggaran += (minimal - jumlah)

    # Aturan 2, 3, 4: per karyawan
    for k in karyawan:
        daftar_shift = [jadwal[k][h] for h in NAMA_HARI]
        jumlah_libur = daftar_shift.count("Libur")
        jumlah_kerja = len(NAMA_HARI) - jumlah_libur

        if jumlah_kerja > MAKS_KERJA:
            pelanggaran += (jumlah_kerja - MAKS_KERJA)

        if jumlah_libur < MIN_LIBUR:
            pelanggaran += (MIN_LIBUR - jumlah_libur)

        # Aturan 4: Malam diikuti Pagi besoknya
        for i in range(len(NAMA_HARI) - 1):
            if daftar_shift[i] == "Malam" and daftar_shift[i + 1] == "Pagi":
                pelanggaran += 1

    return pelanggaran


def hitung_fitness(jadwal):
    """
    Mengubah jumlah pelanggaran menjadi nilai fitness (0 sampai 1).
    Rumus: fitness = 1 / (1 + total_pelanggaran)
    """
    return 1.0 / (1.0 + hitung_pelanggaran(jadwal))


def jadwal_ke_list(jadwal):
    """
    Mengubah format jadwal (dict) menjadi list 2 dimensi.
    Dipakai untuk mengirim data ke frontend melalui JSON.
    Hasil: list[index_karyawan][index_hari] = nama_shift
    """
    karyawan = get_karyawan()
    return [
        [jadwal[k][h] for h in NAMA_HARI]
        for k in karyawan
    ]
