/**
 * SAHABAT GURU MENGAJAR v2
 * AI Engine — Gemini API Integration
 * API Key dikelola Admin. Pengguna tidak pernah tahu/isi API Key.
 * Generasi 5 Tahap + Quality Check Otomatis
 */

class AIEngine {
  constructor() {
    this.baseURL = 'https://generativelanguage.googleapis.com/v1beta/models';
    this.primaryModel = 'gemini-2.5-pro';
    this.fallbackModel = 'gemini-2.5-flash';
    this.abortController = null;
  }

  // ─── API Key dari Admin (global, bukan dari user) ─────────────────────────
  getApiKey() {
    return db.getSharedApiKey();
  }

  // ─── Sintaks Model Pembelajaran ───────────────────────────────────────────
  getModelSyntax(model) {
    const map = {
      'Problem Based Learning (PBL)': {
        desc: 'pembelajaran berbasis masalah nyata yang mendorong berpikir kritis',
        tahapan: ['Orientasi pada Masalah', 'Mengorganisasi Peserta Didik', 'Membimbing Investigasi', 'Mengembangkan dan Menyajikan Hasil Karya', 'Menganalisis dan Mengevaluasi Proses Pemecahan Masalah'],
      },
      'Project Based Learning (PjBL)': {
        desc: 'pembelajaran berbasis proyek nyata yang bermakna',
        tahapan: ['Penentuan Pertanyaan Mendasar', 'Mendesain Perencanaan Proyek', 'Menyusun Jadwal', 'Memonitor Kemajuan Proyek', 'Menguji Hasil', 'Mengevaluasi Pengalaman Belajar'],
      },
      'Contextual Teaching and Learning (CTL)': {
        desc: 'pembelajaran kontekstual yang menghubungkan materi dengan kehidupan nyata',
        tahapan: ['Kontekstualisasi & Membangun Pengetahuan', 'Bertanya dan Inkuiri', 'Masyarakat Belajar', 'Pemodelan', 'Refleksi', 'Penilaian Autentik'],
      },
      'Discovery Learning': {
        desc: 'pembelajaran penemuan yang mendorong murid menemukan konsep sendiri',
        tahapan: ['Stimulasi (Pemberian Rangsangan)', 'Identifikasi Masalah', 'Pengumpulan Data', 'Pengolahan Data', 'Pembuktian (Verifikasi)', 'Generalisasi (Menarik Kesimpulan)'],
      },
      'Inquiry Learning': {
        desc: 'pembelajaran inkuiri yang membangun kemampuan investigasi ilmiah',
        tahapan: ['Orientasi & Merumuskan Masalah', 'Merumuskan Hipotesis', 'Mengumpulkan Data & Informasi', 'Menguji Hipotesis', 'Merumuskan Kesimpulan'],
      },
      'Cooperative Learning': {
        desc: 'pembelajaran kooperatif yang mengembangkan kerja sama antar murid',
        tahapan: ['Penyampaian Tujuan & Motivasi', 'Pembagian Kelompok Heterogen', 'Presentasi Guru (Input)', 'Kegiatan Belajar Kelompok', 'Evaluasi & Kuis', 'Penghargaan Kelompok'],
      },
      'STEM': {
        desc: 'pembelajaran terintegrasi sains, teknologi, teknik, dan matematika',
        tahapan: ['Observasi & Identifikasi Masalah STEM', 'Pembentukan Pengetahuan Baru', 'Desain Solusi', 'Pembuatan Prototipe', 'Pengujian & Evaluasi', 'Presentasi & Komunikasi'],
      },
      'STEAM': {
        desc: 'pembelajaran STEM yang diperkaya dengan seni untuk kreativitas holistik',
        tahapan: ['Observasi Fenomena & Eksplorasi Seni', 'Riset & Pembentukan Pengetahuan', 'Ideasi Kreatif', 'Integrasi Seni dalam Solusi', 'Prototype & Pengujian', 'Presentasi Karya & Refleksi'],
      },
      'Scientific Learning (5M)': {
        desc: 'pendekatan saintifik 5M sesuai Kurikulum Merdeka',
        tahapan: ['Mengamati (Observing)', 'Menanya (Questioning)', 'Mengumpulkan Informasi / Mencoba (Experimenting)', 'Mengolah Informasi / Mengasosiasikan (Associating)', 'Mengomunikasikan (Communicating)'],
      },
      'Problem Solving': {
        desc: 'pembelajaran pemecahan masalah sistematis',
        tahapan: ['Identifikasi & Pemahaman Masalah', 'Analisis Masalah & Faktor Penyebab', 'Menyusun Alternatif Solusi', 'Implementasi Solusi Terbaik', 'Evaluasi & Refleksi Solusi', 'Generalisasi & Transfer Pengetahuan'],
      },
      'Flipped Classroom': {
        desc: 'kelas terbalik di mana murid belajar mandiri di rumah, diperdalam di kelas',
        tahapan: ['Pre-Class: Penugasan Mandiri di Rumah', 'Opening: Diskusi Pembuka & Klarifikasi', 'In-Class: Pendalaman Interaktif', 'Collaborative Problem Solving', 'Presentasi & Peer Teaching', 'Asesmen & Sintesis'],
      },
      'Think Pair Share': {
        desc: 'strategi berpikir-berpasangan-berbagi yang melatih kemandirian dan kolaborasi',
        tahapan: ['Think: Berpikir Mandiri', 'Pair: Berdiskusi Berpasangan', 'Share: Berbagi kepada Seluruh Kelas', 'Penguatan & Konsolidasi Guru'],
      },
      'Group Investigation': {
        desc: 'investigasi kelompok untuk mengembangkan kemampuan penelitian',
        tahapan: ['Identifikasi Topik & Pembentukan Kelompok', 'Perencanaan Investigasi', 'Pelaksanaan Investigasi', 'Persiapan Laporan Akhir', 'Presentasi Laporan', 'Evaluasi Bersama'],
      },
      'Experiential Learning': {
        desc: 'pembelajaran melalui pengalaman langsung dan refleksi mendalam',
        tahapan: ['Concrete Experience (Pengalaman Konkret)', 'Reflective Observation (Observasi Reflektif)', 'Abstract Conceptualization (Konseptualisasi Abstrak)', 'Active Experimentation (Eksperimentasi Aktif)'],
      },
      'Blended Learning': {
        desc: 'perpaduan pembelajaran daring dan tatap muka yang optimal',
        tahapan: ['Online Pre-Learning (Eksplorasi Mandiri)', 'Synchronous Opening (Pembukaan Sinkron)', 'Online Collaborative Activity', 'Face-to-Face Deepening (Pendalaman Tatap Muka)', 'Online Practice & Assessment', 'Refleksi & Sintesis Terintegrasi'],
      },
    };
    return map[model] || { desc: model, tahapan: ['Persiapan', 'Pelaksanaan', 'Evaluasi'] };
  }

  // ─── Master Prompt RPM (5 Tahap + Quality Check) ─────────────────────────
  buildRPMPrompt(formData, profile) {
    const { fase, kelas, semester, mapel, materi, waktu, cp, tp, model } = formData;
    const namaSekolah = profile?.namaSekolah || 'Sekolah';
    const namaGuru = profile?.namaGuru || 'Guru';
    const modelInfo = this.getModelSyntax(model);

    return `Anda adalah tim ahli pembelajaran yang terdiri dari:
• Pengembang Kurikulum Nasional Kemdikbud-Ristek
• Guru Penggerak Berprestasi Nasional
• Pengawas Sekolah Senior (30 tahun pengalaman)
• Fasilitator Deep Learning (Pembelajaran Mendalam)
• Penyusun Modul Ajar Profesional Kurikulum Merdeka

KONTEKS PEMBELAJARAN:
- Sekolah: ${namaSekolah}
- Guru: ${namaGuru}
- Fase: ${fase} | Kelas: ${kelas} | Semester: ${semester}
- Mata Pelajaran: ${mapel}
- Materi Pokok: ${materi}
- Alokasi Waktu: ${waktu}
- Capaian Pembelajaran: ${cp || `Sesuai CP Kurikulum Merdeka Fase ${fase} mata pelajaran ${mapel}`}
- Tujuan Pembelajaran: ${tp || `Dirumuskan dalam format SMART dan ABCD sesuai CP`}
- Model Pembelajaran: ${model}
- Filosofi Model: ${modelInfo.desc}
- Sintaks Tahapan: ${modelInfo.tahapan.join(' → ')}

INSTRUKSI GENERASI 5 TAHAP:

TAHAP 1 — ANALISIS MENDALAM:
Analisis konteks pembelajaran secara mendalam: karakteristik murid Fase ${fase}/Kelas ${kelas}, kompleksitas materi "${materi}", relevansi dengan kehidupan nyata murid Indonesia.

TAHAP 2 — DESAIN PEMBELAJARAN:
Tentukan tujuan SMART+ABCD, praktik pedagogis terbaik, dimensi Profil Pelajar Pancasila yang relevan, lingkungan belajar optimal, dan pemanfaatan teknologi digital.

TAHAP 3 — PENYUSUNAN PENGALAMAN BELAJAR SANGAT RINCI:
Buat alur pembelajaran yang sangat detail sesuai sintaks ${model} dengan kalimat guru yang natural, hangat, dan inspiratif.

TAHAP 4 — ASESMEN AUTENTIK:
Rancang instrumen asesmen awal (diagnostik), proses (formatif), dan akhir (sumatif) yang benar-benar mengukur kompetensi.

TAHAP 5 — QUALITY CHECK INTERNAL:
Periksa konsistensi: apakah TP selaras dengan CP? Apakah kegiatan inti sesuai sintaks ${model}? Apakah asesmen mengukur TP? Perbaiki jika ada ketidaksesuaian sebelum output final.

PERSYARATAN MINIMUM WAJIB:
- Pendahuluan: MINIMAL 10 langkah detail
- Kegiatan Inti: MINIMAL 25 langkah mengikuti PERSIS sintaks ${model}: ${modelInfo.tahapan.join(' → ')}
- Penutup: MINIMAL 10 langkah (termasuk refleksi, penguatan karakter, tindak lanjut, pelibatan keluarga)
- Asesmen Awal: TEPAT 10 pertanyaan pemantik yang mendalam dan kontekstual
- Rubrik Proses: MINIMAL 5 aspek dengan 4 level kriteria
- Soal Akhir: MINIMAL 5 soal uraian HOTS dengan kunci jawaban lengkap
- Semua kalimat guru: NATURAL, HANGAT, KONTEKSTUAL, PROFESIONAL (bukan kalimat robot)
- Dimensi Profil Lulusan: Pilih 2-4 yang PALING RELEVAN saja

OUTPUT FORMAT JSON (hasilkan HANYA JSON valid, tanpa teks lain sebelum/sesudah):
{
  "qualityCheck": {
    "konsistensiTP": "Penjelasan singkat hasil QC",
    "kesesuaianModel": "Penjelasan singkat",
    "kesesuaianAsesmen": "Penjelasan singkat",
    "skorKualitas": "A/B/C",
    "catatan": "Catatan QC jika ada perbaikan"
  },
  "identifikasi": {
    "kesiapanMurid": ["poin 1 sangat spesifik", "poin 2", "poin 3", "poin 4", "poin 5", "poin 6"],
    "karakteristikMateri": ["poin 1 tentang ${materi}", "poin 2", "poin 3", "poin 4", "poin 5", "poin 6"],
    "dimensiProfilLulusan": [
      { "dimensi": "Nama Dimensi", "deskripsi": "Penjelasan relevansi mendalam", "indikator": "Indikator konkret dan terukur" }
    ]
  },
  "desainPembelajaran": {
    "tujuanPembelajaran": [
      {
        "nomor": 1,
        "rumusan": "Rumusan TP format ABCD yang lengkap dan operasional",
        "smart": { "specific": "...", "measurable": "...", "achievable": "...", "relevant": "...", "timebound": "..." }
      }
    ],
    "praktikPedagogis": ["praktik 1 spesifik", "praktik 2", "praktik 3", "praktik 4", "praktik 5", "praktik 6"],
    "kemitraanPembelajaran": [
      { "pihak": "Nama pihak", "peran": "Peran konkret", "bentukKolaborasi": "Cara kolaborasi spesifik" }
    ],
    "lingkunganBelajar": ["lingkungan 1 spesifik", "lingkungan 2", "lingkungan 3", "lingkungan 4", "lingkungan 5"],
    "pemanfaatanDigital": [
      { "platform": "Nama platform/aplikasi", "fungsi": "Fungsi spesifik", "caraPenggunaan": "Cara penggunaan konkret" }
    ]
  },
  "pengalamanBelajar": {
    "pendahuluan": [
      {
        "langkah": 1,
        "aktivitasGuru": "Deskripsi sangat rinci dan operasional apa yang dilakukan guru",
        "aktivitasMurid": "Deskripsi sangat rinci respons dan aktivitas murid",
        "estimasiWaktu": "X menit",
        "kalimatGuru": "Kalimat lengkap yang benar-benar diucapkan guru dengan bahasa yang hangat, natural, dan menginspirasi murid"
      }
    ],
    "inti": [
      {
        "langkah": 1,
        "fase": "Nama fase ${model} sesuai sintaks",
        "aktivitasGuru": "Deskripsi sangat rinci aktivitas guru",
        "aktivitasMurid": "Deskripsi sangat rinci aktivitas murid",
        "media": "Media/alat/bahan yang digunakan",
        "tujuanAktivitas": "Tujuan spesifik dari langkah ini",
        "profilLulusan": "Dimensi profil yang dikembangkan",
        "estimasiWaktu": "X menit",
        "kalimatGuru": "Kalimat lengkap guru yang natural dan kontekstual",
        "buktiKinerjaMurid": "Bukti nyata yang menunjukkan murid berhasil menyelesaikan langkah ini"
      }
    ],
    "penutup": [
      {
        "langkah": 1,
        "aktivitasGuru": "Deskripsi sangat rinci",
        "aktivitasMurid": "Deskripsi sangat rinci",
        "estimasiWaktu": "X menit",
        "kalimatGuru": "Kalimat lengkap guru yang memotivasi dan menguatkan"
      }
    ]
  },
  "asesmen": {
    "asesmenAwal": {
      "tujuan": "Tujuan diagnostik spesifik",
      "instrumen": "Jenis instrumen",
      "pertanyaan": [
        { "nomor": 1, "pertanyaan": "Pertanyaan pemantik mendalam tentang ${materi}", "tujuanDiagnostik": "Apa yang ingin diketahui" }
      ]
    },
    "asesmenProses": {
      "tujuan": "Tujuan asesmen formatif",
      "teknik": "Teknik yang digunakan",
      "rubrik": [
        {
          "aspek": "Nama aspek",
          "indikator": "Indikator yang dinilai",
          "sangat_baik": "Deskripsi kriteria Sangat Baik (4)",
          "baik": "Deskripsi kriteria Baik (3)",
          "cukup": "Deskripsi kriteria Cukup (2)",
          "perlu_bimbingan": "Deskripsi kriteria Perlu Bimbingan (1)",
          "bobot": "X%"
        }
      ]
    },
    "asesmenAkhir": {
      "tujuan": "Tujuan asesmen sumatif",
      "bentuk": "Bentuk asesmen",
      "soal": [
        {
          "nomor": 1,
          "soal": "Soal uraian HOTS yang mendalam dan kontekstual tentang ${materi}",
          "kunciJawaban": "Kunci jawaban lengkap dan detail",
          "rubrikPenskoran": {
            "skor4": "Kriteria Sangat Baik",
            "skor3": "Kriteria Baik",
            "skor2": "Kriteria Cukup",
            "skor1": "Kriteria Perlu Bimbingan"
          },
          "bobotSoal": "X%"
        }
      ],
      "pengolahanNilai": "Formula penghitungan nilai akhir"
    }
  },
  "refleksi": {
    "guruRefleksi": ["Pertanyaan refleksi guru 1", "2", "3", "4"],
    "muridRefleksi": ["Pertanyaan refleksi murid 1", "2", "3", "4"],
    "pelibatanKeluarga": "Deskripsi konkret cara melibatkan keluarga dalam materi ${materi}",
    "tindakLanjut": {
      "pengayaan": "Program pengayaan spesifik untuk murid yang sudah mencapai TP",
      "remedial": "Program remedial spesifik untuk murid yang belum mencapai TP"
    }
  }
}`;
  }

  // ─── Generate RPM dengan Streaming ───────────────────────────────────────
  async generateRPM(formData, profile, onStage, onChunk, onComplete, onError) {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      onError('Sistem AI belum dikonfigurasi oleh administrator. Silakan hubungi admin aplikasi.');
      return;
    }

    this.abortController = new AbortController();
    const prompt = this.buildRPMPrompt(formData, profile);
    const models = [this.primaryModel, this.fallbackModel];

    // Notifikasi progress per tahap
    const stages = [
      'Menganalisis konteks pembelajaran...',
      'Merancang desain pembelajaran...',
      'Menyusun pengalaman belajar mendalam...',
      'Membuat instrumen asesmen...',
      'Melakukan quality check & finalisasi...',
    ];

    let stageIdx = 0;
    const stageTimer = setInterval(() => {
      if (stageIdx < stages.length) { onStage(stageIdx, stages[stageIdx]); stageIdx++; }
    }, 8000);

    onStage(0, stages[0]);

    for (const model of models) {
      try {
        await this._callStreamAPI(model, apiKey, prompt, onChunk, (fullText) => {
          clearInterval(stageTimer);
          onStage(4, stages[4]);
          onComplete(fullText);
        });
        return;
      } catch (err) {
        if (err.name === 'AbortError') {
          clearInterval(stageTimer);
          onError('Proses dihentikan.');
          return;
        }
        console.warn(`Model ${model} gagal, fallback...`, err.message);
      }
    }

    clearInterval(stageTimer);
    onError('Layanan AI tidak dapat dijangkau. Periksa koneksi internet Anda.');
  }

  async _callStreamAPI(modelName, apiKey, prompt, onChunk, onComplete) {
    const url = `${this.baseURL}/${modelName}:streamGenerateContent?key=${apiKey}&alt=sse`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.65,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 65536,
          responseMimeType: 'application/json',
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ],
      }),
      signal: this.abortController?.signal,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error?.message || `HTTP ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') continue;
        try {
          const text = JSON.parse(jsonStr)?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (text) { fullText += text; onChunk(text); }
        } catch { /* ignore */ }
      }
    }

    onComplete(fullText);
  }

  // ─── Generate Non-Stream (untuk regenerate) ────────────────────────────────
  async generateRPMDirect(formData, profile) {
    const apiKey = this.getApiKey();
    if (!apiKey) throw new Error('Sistem AI belum dikonfigurasi.');
    const prompt = this.buildRPMPrompt(formData, profile);
    for (const model of [this.primaryModel, this.fallbackModel]) {
      try {
        const res = await fetch(`${this.baseURL}/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.8, maxOutputTokens: 65536, responseMimeType: 'application/json' },
          }),
        });
        if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `HTTP ${res.status}`); }
        return (await res.json())?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      } catch (err) { console.warn(model, 'gagal:', err.message); }
    }
    throw new Error('Semua model gagal. Silakan coba lagi.');
  }

  stopGeneration() {
    this.abortController?.abort();
    this.abortController = null;
  }

  parseRPMJSON(rawText) {
    try {
      let text = rawText.trim();
      const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) text = match[1].trim();
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start !== -1 && end !== -1) text = text.slice(start, end + 1);
      return JSON.parse(text);
    } catch (e) {
      throw new Error('Format output AI tidak valid. Silakan tekan "Generate Ulang".');
    }
  }
}

// Singleton
const aiEngine = new AIEngine();
