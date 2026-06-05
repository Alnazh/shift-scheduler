/**
 * api.js
 * ======
 * Modul komunikasi dengan Flask API backend.
 * Semua fungsi mengembalikan Promise hasil JSON dari server.
 */

/**
 * Mengirim POST request ke endpoint API Flask.
 * @param {string} endpoint - Path endpoint (mis. "/api/hill-climbing")
 * @param {object} body     - Parameter yang dikirim sebagai JSON
 * @returns {Promise<object>}
 */
async function postAPI(endpoint, body) {
  const response = await fetch(endpoint, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`);
  }

  const data = await response.json();
  if (data.status !== "sukses") {
    throw new Error(data.error || "Terjadi kesalahan pada server.");
  }

  return data;
}

/** Jalankan Hill Climbing */
async function apiHillClimbing(varian, maksIterasi) {
  return postAPI("/api/hill-climbing", {
    varian:       varian,
    maks_iterasi: maksIterasi,
  });
}

/** Jalankan Simulated Annealing */
async function apiSimulatedAnnealing(suhuAwal, lajuPendinginan, suhuMinimum, maksIterasi) {
  return postAPI("/api/simulated-annealing", {
    suhu_awal:        suhuAwal,
    laju_pendinginan: lajuPendinginan,
    suhu_minimum:     suhuMinimum,
    maks_iterasi:     maksIterasi,
  });
}

/** Jalankan Genetic Algorithm */
async function apiGeneticAlgorithm(ukuranPop, jumlahGen, probCrossover, probMutasi, jumlahElit, tournamentK) {
  return postAPI("/api/genetic-algorithm", {
    ukuran_populasi:        ukuranPop,
    jumlah_generasi:        jumlahGen,
    probabilitas_crossover: probCrossover,
    probabilitas_mutasi:    probMutasi,
    jumlah_elit:            jumlahElit,
    tournament_k:           tournamentK,
  });
}

/** Jalankan semua algoritma sekaligus (mode komparatif B.5) */
async function apiKomparatif(maksIterasi) {
  return postAPI("/api/komparatif", { maks_iterasi: maksIterasi });
}
