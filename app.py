from flask import Flask, render_template, jsonify, request, send_file
from flask_cors import CORS
import io
import csv

from models.jadwal import (
    KARYAWAN_DEFAULT, NAMA_HARI, NAMA_SHIFT, SHIFT,
    get_karyawan, set_karyawan
)
from algorithms.hill_climbing import jalankan_hill_climbing
from algorithms.simulated_annealing import jalankan_simulated_annealing
from algorithms.genetic_algorithm import jalankan_genetic_algorithm

app = Flask(__name__)
CORS(app)


# ─────────────────────────────────────────────
# HELPER: VALIDASI PARAMETER INPUT
# ─────────────────────────────────────────────

def ambil_int(data, kunci, default, minimum, maksimum):
    """Ambil nilai integer dari JSON request dengan batas aman."""
    try:
        return max(minimum, min(maksimum, int(data.get(kunci, default))))
    except (TypeError, ValueError):
        return default


def ambil_float(data, kunci, default, minimum, maksimum):
    """Ambil nilai float dari JSON request dengan batas aman."""
    try:
        return max(minimum, min(maksimum, float(data.get(kunci, default))))
    except (TypeError, ValueError):
        return default


# ─────────────────────────────────────────────
# HALAMAN UTAMA
# ─────────────────────────────────────────────

@app.route("/")
def index():
    """Menampilkan halaman simulasi utama."""
    return render_template("index.html")


# ─────────────────────────────────────────────
# API: DATA MASTER
# ─────────────────────────────────────────────

@app.route("/api/info", methods=["GET"])
def info_data():
    """Mengembalikan data master: karyawan aktif, shift, dan hari."""
    return jsonify({
        "karyawan":   get_karyawan(),
        "shift":      SHIFT,
        "nama_shift": NAMA_SHIFT,
        "hari":       NAMA_HARI,
    })


@app.route("/api/health", methods=["GET"])
def health_check():
    """Endpoint health check untuk memastikan server berjalan."""
    return jsonify({"status": "ok"})


# ─────────────────────────────────────────────
# API: KELOLA KARYAWAN
# ─────────────────────────────────────────────

@app.route("/api/karyawan", methods=["GET"])
def get_daftar_karyawan():
    """Mengembalikan daftar karyawan yang sedang aktif."""
    return jsonify({
        "karyawan": get_karyawan(),
        "jumlah":   len(get_karyawan()),
        "default":  KARYAWAN_DEFAULT,
    })


@app.route("/api/karyawan", methods=["POST"])
def update_daftar_karyawan():
    """
    Mengganti daftar karyawan aktif.

    Body JSON:
        { "karyawan": ["Andi", "Budi", ...] }

    Minimal 5 karyawan, maksimal 20 karyawan.
    """
    data = request.get_json() or {}
    daftar = data.get("karyawan", [])

    try:
        set_karyawan(daftar)
        return jsonify({
            "status":   "sukses",
            "karyawan": get_karyawan(),
            "jumlah":   len(get_karyawan()),
        })
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/karyawan/reset", methods=["POST"])
def reset_karyawan():
    """Mengembalikan daftar karyawan ke default (10 orang)."""
    set_karyawan(KARYAWAN_DEFAULT)
    return jsonify({
        "status":   "sukses",
        "karyawan": get_karyawan(),
        "jumlah":   len(get_karyawan()),
    })


# ─────────────────────────────────────────────
# API: EKSPOR JADWAL
# ─────────────────────────────────────────────

@app.route("/api/ekspor/csv", methods=["POST"])
def ekspor_csv():
    """
    Mengekspor jadwal terbaik ke format CSV.

    Body JSON:
        {
            "jadwal":    [[...], [...], ...],   (matriks jadwal)
            "algoritma": "Genetic Algorithm"
        }
    """
    data      = request.get_json() or {}
    jadwal    = data.get("jadwal", [])
    algoritma = data.get("algoritma", "Algoritma")
    karyawan  = get_karyawan()

    if not jadwal:
        return jsonify({"error": "Data jadwal kosong"}), 400

    # Buat file CSV di memori
    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow(["Karyawan"] + NAMA_HARI)

    # Data per karyawan
    for i, nama in enumerate(karyawan):
        if i < len(jadwal):
            writer.writerow([nama] + jadwal[i])

    output.seek(0)
    # Kirim sebagai file download
    return send_file(
        io.BytesIO(output.getvalue().encode("utf-8-sig")),  # utf-8-sig agar Excel baca dengan benar
        mimetype="text/csv",
        as_attachment=True,
        download_name=f"jadwal_{algoritma.replace(' ', '_').lower()}.csv",
    )


@app.route("/api/ekspor/pdf", methods=["POST"])
def ekspor_pdf():
    """
    Mengekspor jadwal terbaik ke format PDF sederhana menggunakan HTML.
    Dikirim sebagai HTML yang bisa di-print ke PDF oleh browser.

    Body JSON:
        {
            "jadwal":    [[...], [...], ...],
            "algoritma": "Genetic Algorithm",
            "fitness":   1.0,
            "pelanggaran": 0
        }
    """
    data         = request.get_json() or {}
    jadwal       = data.get("jadwal", [])
    algoritma    = data.get("algoritma", "Algoritma")
    fitness      = data.get("fitness", "-")
    pelanggaran  = data.get("pelanggaran", "-")
    karyawan     = get_karyawan()

    if not jadwal:
        return jsonify({"error": "Data jadwal kosong"}), 400

    # Warna per shift
    warna_shift = {
        "Pagi":  ("#fef3c7", "#92400e"),
        "Siang": ("#dbeafe", "#1e3a8a"),
        "Malam": ("#ede9fe", "#4c1d95"),
        "Libur": ("#f1f5f9", "#475569"),
    }

    # Buat HTML untuk di-print
    baris_tabel = ""
    for i, nama in enumerate(karyawan):
        if i >= len(jadwal):
            break
        baris_tabel += f"<tr><td><strong>{nama}</strong></td>"
        for shift in jadwal[i]:
            bg, fg = warna_shift.get(shift, ("#fff", "#000"))
            baris_tabel += f'<td><span style="background:{bg};color:{fg};padding:2px 8px;border-radius:4px;font-size:12px;">{shift[0]}</span></td>'
        baris_tabel += "</tr>"

    html_print = f"""<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Jadwal Shift - {algoritma}</title>
<style>
  body {{ font-family: Arial, sans-serif; padding: 20px; }}
  h2 {{ color: #1e293b; }}
  .info {{ color: #64748b; font-size: 13px; margin-bottom: 16px; }}
  table {{ width: 100%; border-collapse: collapse; }}
  th {{ background: #1e293b; color: white; padding: 8px 10px; text-align: center; font-size: 12px; }}
  th:first-child {{ text-align: left; }}
  td {{ padding: 7px 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 13px; }}
  td:first-child {{ text-align: left; }}
  @media print {{ body {{ padding: 0; }} }}
</style>
</head>
<body>
<h2>Jadwal Shift Karyawan</h2>
<p class="info">
  Algoritma: <strong>{algoritma}</strong> |
  Fitness: <strong>{fitness}</strong> |
  Pelanggaran: <strong>{pelanggaran}</strong>
</p>
<table>
  <thead>
    <tr>
      <th>Karyawan</th>
      {"".join(f"<th>{h}</th>" for h in NAMA_HARI)}
    </tr>
  </thead>
  <tbody>
    {baris_tabel}
  </tbody>
</table>
<p style="font-size:11px;color:#94a3b8;margin-top:20px;">
  Dibuat oleh Shift Scheduler - Simulasi Optimasi Penjadwalan
</p>
<script>window.onload = function() {{ window.print(); }}</script>
</body>
</html>"""

    return send_file(
        io.BytesIO(html_print.encode("utf-8")),
        mimetype="text/html",
        as_attachment=False,
    )



@app.route("/api/hill-climbing", methods=["POST"])
def endpoint_hill_climbing():
    """
    Menjalankan Hill Climbing dengan varian yang dipilih.

    Body JSON:
        varian       : "simple" | "steepest" | "stochastic"
        maks_iterasi : 100–2000
    """
    data         = request.get_json() or {}
    varian       = data.get("varian", "simple")
    maks_iterasi = ambil_int(data, "maks_iterasi", 5000, 500, 5000)

    if varian not in ("simple", "steepest", "stochastic"):
        return jsonify({"error": "Varian tidak valid. Pilih: simple, steepest, stochastic"}), 400

    hasil = jalankan_hill_climbing(maks_iterasi=maks_iterasi, varian=varian)
    return jsonify({"status": "sukses", "hasil": hasil})


# ─────────────────────────────────────────────
# API: SIMULATED ANNEALING
# ─────────────────────────────────────────────

@app.route("/api/simulated-annealing", methods=["POST"])
def endpoint_simulated_annealing():
    """
    Menjalankan Simulated Annealing.

    Body JSON:
        suhu_awal        : 10–500
        laju_pendinginan : 0.80–0.99
        suhu_minimum     : 0.01–5.0
        maks_iterasi     : 100–3000
    """
    data             = request.get_json() or {}
    suhu_awal        = ambil_float(data, "suhu_awal",        10.0,  1.0,  50.0)
    laju_pendinginan = ambil_float(data, "laju_pendinginan", 0.995, 0.90, 0.999)
    suhu_minimum     = ambil_float(data, "suhu_minimum",     0.001, 0.0001, 1.0)
    maks_iterasi     = ambil_int  (data, "maks_iterasi",     3000,  500,  10000)

    hasil = jalankan_simulated_annealing(
        suhu_awal=suhu_awal,
        laju_pendinginan=laju_pendinginan,
        suhu_minimum=suhu_minimum,
        maks_iterasi=maks_iterasi,
    )
    return jsonify({"status": "sukses", "hasil": hasil})


# ─────────────────────────────────────────────
# API: GENETIC ALGORITHM
# ─────────────────────────────────────────────

@app.route("/api/genetic-algorithm", methods=["POST"])
def endpoint_genetic_algorithm():
    """
    Menjalankan Genetic Algorithm.

    Body JSON:
        ukuran_populasi        : 10–200
        jumlah_generasi        : 10–500
        probabilitas_crossover : 0.1–1.0
        probabilitas_mutasi    : 0.001–0.3
        jumlah_elit            : 0–10
        tournament_k           : 2–10
    """
    data           = request.get_json() or {}
    ukuran_pop     = ambil_int  (data, "ukuran_populasi",        50,   10,    200)
    jumlah_gen     = ambil_int  (data, "jumlah_generasi",        100,  10,    500)
    prob_crossover = ambil_float(data, "probabilitas_crossover", 0.8,  0.1,   1.0)
    prob_mutasi    = ambil_float(data, "probabilitas_mutasi",    0.02, 0.001, 0.3)
    jumlah_elit    = ambil_int  (data, "jumlah_elit",            2,    0,     10)
    tournament_k   = ambil_int  (data, "tournament_k",           3,    2,     10)

    hasil = jalankan_genetic_algorithm(
        ukuran_populasi=ukuran_pop,
        jumlah_generasi=jumlah_gen,
        probabilitas_crossover=prob_crossover,
        probabilitas_mutasi=prob_mutasi,
        jumlah_elit=jumlah_elit,
        tournament_k=tournament_k,
    )
    return jsonify({"status": "sukses", "hasil": hasil})


# ─────────────────────────────────────────────
# API: MODE KOMPARATIF (B.5)
# ─────────────────────────────────────────────

@app.route("/api/komparatif", methods=["POST"])
def endpoint_komparatif():
    """
    Menjalankan semua algoritma sekaligus pada masalah yang sama
    untuk perbandingan performa (sesuai syarat B.5).

    Metrik yang dibandingkan:
        - Waktu konvergensi
        - Kualitas solusi (fitness & pelanggaran)
        - Jumlah iterasi/generasi

    Body JSON:
        maks_iterasi : 1000–5000
        Default 5000 agar semua algoritma konsisten mencapai solusi optimal.
        HC Simple & Steepest biasanya selesai jauh lebih cepat (< 300 iterasi),
        SA membutuhkan sekitar 3000 iterasi, Stochastic HC sekitar 3000-5000.
    """
    data         = request.get_json() or {}
    maks_iterasi = ambil_int(data, "maks_iterasi", 5000, 1000, 5000)

    hc_simple     = jalankan_hill_climbing(maks_iterasi=maks_iterasi, varian="simple")
    hc_steepest   = jalankan_hill_climbing(maks_iterasi=maks_iterasi, varian="steepest")
    hc_stochastic = jalankan_hill_climbing(maks_iterasi=maks_iterasi, varian="stochastic")
    sa            = jalankan_simulated_annealing(maks_iterasi=maks_iterasi)
    # GA diberi generasi yang cukup (iterasi // 5 agar proporsional)
    ga            = jalankan_genetic_algorithm(jumlah_generasi=max(100, maks_iterasi // 5))

    def buat_ringkasan(h, kunci_iterasi="total_iterasi"):
        return {
            "algoritma":   h["algoritma"],
            "pelanggaran": h["pelanggaran_akhir"],
            "fitness":     h["fitness_akhir"],
            "iterasi":     h.get(kunci_iterasi, h.get("total_generasi", 0)),
            "waktu":       h["waktu_eksekusi"],
            "sempurna":    h["solusi_sempurna"],
        }

    ringkasan = [
        buat_ringkasan(hc_simple),
        buat_ringkasan(hc_steepest),
        buat_ringkasan(hc_stochastic),
        buat_ringkasan(sa),
        buat_ringkasan(ga, "total_generasi"),
    ]

    return jsonify({
        "status":    "sukses",
        "ringkasan": ringkasan,
        "detail": {
            "hill_climbing_simple":     hc_simple,
            "hill_climbing_steepest":   hc_steepest,
            "hill_climbing_stochastic": hc_stochastic,
            "simulated_annealing":      sa,
            "genetic_algorithm":        ga,
        },
    })


# ─────────────────────────────────────────────
# JALANKAN SERVER
# ─────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 52)
    print("  Shift Scheduler — Kecerdasan Buatan (B.5)")
    print("  Buka browser di: http://localhost:5000")
    print("  Tekan Ctrl+C untuk menghentikan")
    print("=" * 52)
    app.run(debug=True, host="0.0.0.0", port=5000)
