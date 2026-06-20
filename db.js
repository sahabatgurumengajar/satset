/**
 * SAHABAT GURU MENGAJAR v2
 * Database Management Layer
 * LocalStorage + IndexedDB
 * API Key dikelola Admin — User tidak pernah melihat API Key
 */

const DB_NAME = 'SahabatGuruDB';
const DB_VERSION = 2;
const STORE_RPM = 'rpm_documents';

class Database {
  constructor() {
    this.db = null;
    this.ready = false;
    this.dbPromise = this.initIndexedDB();
    this.seedAdmin();
    this.migrateUsers();
  }

  // ─── IndexedDB Init ───────────────────────────────────────────────────────
  async initIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_RPM)) {
          const store = db.createObjectStore(STORE_RPM, { keyPath: 'id' });
          store.createIndex('userId', 'userId', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('mapel', 'mapel', { unique: false });
        }
      };
      request.onsuccess = (e) => {
        this.db = e.target.result;
        this.ready = true;
        resolve(this.db);
      };
      request.onerror = (e) => {
        console.error('IndexedDB error:', e.target.error);
        reject(e.target.error);
      };
    });
  }

  async ensureReady() {
    await this.dbPromise;
  }

  // ─── LocalStorage Helpers ────────────────────────────────────────────────
  lsGet(key) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; }
  }
  lsSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
  }
  lsDel(key) { localStorage.removeItem(key); }

  // ─── SHARED API KEY (Admin-only, global untuk semua user) ─────────────────
  // API Key hanya dikelola admin. Pengguna biasa tidak pernah tahu / mengisi API Key.
  getSharedApiKey() {
    return this.lsGet('sgm_shared_api_key') || '';
  }
  saveSharedApiKey(key) {
    this.lsSet('sgm_shared_api_key', key);
  }
  hasApiKey() {
    return !!this.getSharedApiKey();
  }

  // ─── Auth ────────────────────────────────────────────────────────────────
  getUsers() { return this.lsGet('sgm_users') || []; }
  saveUsers(users) { this.lsSet('sgm_users', users); }

  registerUser(data) {
    const users = this.getUsers();
    if (users.find(u => u.email === data.email)) return { success: false, message: 'Email sudah terdaftar.' };
    const newUser = {
      id: 'usr_' + Date.now() + Math.random().toString(36).substr(2, 5),
      nama: data.nama || data.namaLengkap || '',
      namaLengkap: data.namaLengkap || data.nama || '',
      email: data.email,
      password: data.password,
      role: this.isAdmin(data.email) ? 'admin' : (data.role || 'guru'),
      status: 'aktif',
      createdAt: new Date().toISOString(),
      isActive: true,
      profileComplete: false,
    };
    users.push(newUser);
    this.saveUsers(users);
    return { success: true, user: newUser };
  }

  loginUser(email, password) {
    // 1. Simulasikan cek koneksi database
    if (!this.db && !this.ready) {
      return { success: false, message: 'Koneksi database gagal.' };
    }
    const users = this.getUsers();

    // 2. Cari akun berdasarkan email
    const user = users.find(u => u.email === email);
    if (!user) {
      return { success: false, message: 'Akun tidak ditemukan.' };
    }

    // 3. Verifikasi password
    if (user.password !== password) {
      return { success: false, message: 'Password salah.' };
    }

    // 4. Validasi status
    const status = user.status || (user.isActive ? 'aktif' : 'nonaktif');
    if (status !== 'aktif') {
      return { success: false, message: 'Akun belum aktif.' };
    }

    // 5. Cek schema fields (id, nama, email, password, role, status)
    const nama = user.nama || user.namaLengkap || 'Guru';
    const role = user.role || 'guru';
    if (!user.id || !nama || !user.email || !user.password || !role || status !== 'aktif') {
      return { success: false, message: 'Session gagal dibuat.' };
    }

    const cleanUser = {
      id: user.id,
      nama: nama,
      email: user.email,
      password: user.password,
      role: role,
      status: status
    };

    // Set active session in local storage
    this.lsSet('auth_user', cleanUser);
    this.lsSet('sgm_current_user', cleanUser.id);

    return { success: true, user: cleanUser };
  }

  logout() {
    this.lsDel('auth_user');
    this.lsDel('sgm_current_user');
  }

  getCurrentUser() {
    // Baca session dari localStorage "auth_user"
    const user = this.lsGet('auth_user');
    if (!user) return null;

    // Validasi data session (Auto Recovery jika rusak)
    if (!user.id || !user.nama || !user.email || !user.password || !user.role || user.status !== 'aktif') {
      console.warn("Session rusak, lakukan auto recovery.");
      this.logout();
      return null;
    }

    // Pastikan user masih terdaftar dan aktif di DB lokal
    const dbUser = this.getUsers().find(u => u.id === user.id);
    if (!dbUser || dbUser.status !== 'aktif') {
      this.logout();
      return null;
    }

    return dbUser;
  }

  updateUser(userId, updates) {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) return false;
    users[idx] = { ...users[idx], ...updates };
    this.saveUsers(users);
    return true;
  }

  // ─── Profile ─────────────────────────────────────────────────────────────
  getProfile(userId) { return this.lsGet(`sgm_profile_${userId}`) || null; }
  saveProfile(userId, profileData) {
    this.lsSet(`sgm_profile_${userId}`, { ...profileData, updatedAt: new Date().toISOString() });
    this.updateUser(userId, { profileComplete: true });
  }

  // ─── Settings (Theme only — no API Key for users) ─────────────────────────
  getSettings(userId) { return this.lsGet(`sgm_settings_${userId}`) || { theme: 'light' }; }
  saveSettings(userId, settings) {
    const existing = this.getSettings(userId);
    this.lsSet(`sgm_settings_${userId}`, { ...existing, ...settings });
  }
  getTheme(userId) { return this.getSettings(userId).theme || 'light'; }

  // ─── Smart Template (Preferensi mengajar otomatis) ────────────────────────
  // Disimpan setiap selesai generate RPM. Otomatis mengisi form berikutnya.
  getSmartTemplate(userId) {
    return this.lsGet(`sgm_template_${userId}`) || null;
  }
  saveSmartTemplate(userId, formData) {
    const template = {
      fase: formData.fase,
      kelas: formData.kelas,
      semester: formData.semester,
      mapel: formData.mapel,
      waktu: formData.waktu,
      model: formData.model,
      savedAt: new Date().toISOString(),
    };
    this.lsSet(`sgm_template_${userId}`, template);
  }

  // ─── RPM Documents (IndexedDB) ───────────────────────────────────────────
  async saveRPM(userId, rpmData) {
    await this.ensureReady();
    const doc = {
      id: rpmData.id || 'rpm_' + Date.now() + Math.random().toString(36).substr(2, 5),
      userId,
      ...rpmData,
      updatedAt: new Date().toISOString(),
      createdAt: rpmData.createdAt || new Date().toISOString(),
    };
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE_RPM, 'readwrite');
      const req = tx.objectStore(STORE_RPM).put(doc);
      req.onsuccess = () => resolve(doc);
      req.onerror = () => reject(req.error);
    });
  }

  async getRPMList(userId) {
    await this.ensureReady();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE_RPM, 'readonly');
      const req = tx.objectStore(STORE_RPM).index('userId').getAll(userId);
      req.onsuccess = () => resolve((req.result || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      req.onerror = () => reject(req.error);
    });
  }

  async getRPM(id) {
    await this.ensureReady();
    return new Promise((resolve, reject) => {
      const req = this.db.transaction(STORE_RPM, 'readonly').objectStore(STORE_RPM).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async deleteRPM(id) {
    await this.ensureReady();
    return new Promise((resolve, reject) => {
      const req = this.db.transaction(STORE_RPM, 'readwrite').objectStore(STORE_RPM).delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  async getRPMCount(userId) { return (await this.getRPMList(userId)).length; }
  async getRPMThisMonth(userId) {
    const list = await this.getRPMList(userId);
    const now = new Date();
    return list.filter(r => {
      const d = new Date(r.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }

  // ─── Download Log ────────────────────────────────────────────────────────
  logDownload(userId, rpmId, format) {
    const key = `sgm_downloads_${userId}`;
    const logs = this.lsGet(key) || [];
    logs.unshift({ rpmId, format, at: new Date().toISOString() });
    this.lsSet(key, logs.slice(0, 200));
  }
  getDownloadCount(userId) { return (this.lsGet(`sgm_downloads_${userId}`) || []).length; }

  // ─── Draft Auto-Save (setiap 30 detik) ───────────────────────────────────
  saveDraft(userId, draftData) {
    this.lsSet(`sgm_draft_${userId}`, { ...draftData, savedAt: new Date().toISOString() });
  }
  getDraft(userId) { return this.lsGet(`sgm_draft_${userId}`) || null; }
  clearDraft(userId) { this.lsDel(`sgm_draft_${userId}`); }

  // ─── Admin ───────────────────────────────────────────────────────────────
  isAdmin(email) { return email === 'adm.andrisuwandi@gmail.com'; }
  seedAdmin() {
    let users = this.getUsers();
    const adminEmail = 'adm.andrisuwandi@gmail.com';
    let admin = users.find(u => u.email === adminEmail);
    if (!admin) {
      admin = {
        id: 'usr_admin',
        email: adminEmail,
        password: 'sahabatguru',
        nama: 'Admin Sahabat Guru',
        namaLengkap: 'Admin Sahabat Guru',
        role: 'admin',
        status: 'aktif',
        createdAt: new Date().toISOString(),
        isActive: true,
        profileComplete: true,
      };
      users.push(admin);
      this.saveUsers(users);
    } else {
      let updated = false;
      if (!admin.nama) { admin.nama = admin.namaLengkap || 'Admin Sahabat Guru'; updated = true; }
      if (!admin.role) { admin.role = 'admin'; updated = true; }
      if (!admin.status) { admin.status = 'aktif'; updated = true; }
      if (updated) {
        this.saveUsers(users);
      }
    }

    const profileKey = `sgm_profile_usr_admin`;
    if (!this.lsGet(profileKey)) {
      this.lsSet(profileKey, {
        namaGuru: 'Admin Sahabat Guru',
        namaSekolah: 'Sahabat Guru Mengajar',
        nipGuru: '-',
        namaKepsek: '-',
        nipKepsek: '-',
        faseSering: 'D',
        kelasSering: '7',
        mapelUtama: 'Matematika',
        updatedAt: new Date().toISOString()
      });
    }
  }

  migrateUsers() {
    const users = this.getUsers();
    let updated = false;
    users.forEach(u => {
      if (!u.nama) {
        u.nama = u.namaLengkap || 'Guru';
        updated = true;
      }
      if (!u.role) {
        u.role = this.isAdmin(u.email) ? 'admin' : 'guru';
        updated = true;
      }
      if (!u.status) {
        u.status = u.isActive ? 'aktif' : 'nonaktif';
        updated = true;
      }
    });
    if (updated) {
      this.saveUsers(users);
    }
  }
  getAllUsers() { return this.getUsers(); }
  adminUpdateUser(userId, updates) { return this.updateUser(userId, updates); }
  adminDeleteUser(userId) {
    this.saveUsers(this.getUsers().filter(u => u.id !== userId));
  }
  adminResetPassword(userId, newPassword) { return this.updateUser(userId, { password: newPassword }); }

  // ─── Platform Stats ───────────────────────────────────────────────────────
  async getPlatformStats() {
    const users = this.getAllUsers();
    await this.ensureReady();
    return new Promise((resolve, reject) => {
      const req = this.db.transaction(STORE_RPM, 'readonly').objectStore(STORE_RPM).getAll();
      req.onsuccess = () => {
        const allRPM = req.result || [];
        const now = new Date();
        resolve({
          totalUsers: users.length,
          activeUsers: users.filter(u => u.isActive).length,
          totalRPM: allRPM.length,
          rpmThisMonth: allRPM.filter(r => {
            const d = new Date(r.createdAt);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
          }).length,
          hasApiKey: this.hasApiKey(),
        });
      };
      req.onerror = () => reject(req.error);
    });
  }
}

// Singleton
const db = new Database();

// ─── RPMSanitizer Utility ───────────────────────────────────────────────────
const RPMSanitizer = {
  dictionary: new Set([
    "pertanyaan", "pembelajaran", "kelompok", "mengevaluasi", "aktivitas", "pendahuluan",
    "kegiatan", "pelaksanaan", "pancasila", "profil", "pelajar", "sekolah", "guru", "murid",
    "siswa", "evaluasi", "rencana", "pelaksana", "capaian", "tujuan", "metode", "model",
    "asesmen", "refleksi", "umpan", "balik", "remedial", "pengayaan", "materi", "waktu",
    "semester", "kelas", "fase", "digital", "pedagogis", "kemitraan", "lingkungan",
    "kolaborasi", "karakteristik", "kompleksitas", "mengorganisasi", "orientasi", "investigasi",
    "menyajikan", "karya", "menganalisis", "pemecahan", "masalah", "penentuan", "jadwal",
    "memonitor", "menguji", "menghubungkan", "karakter", "tindak", "lanjut", "keluarga",
    "pelibatan", "interaktif", "diskusi", "pemantik", "autentik", "indikator",
    "kriteria", "rubrik", "bobot", "sumatif", "formatif", "diagnostik", "penugasan", "presentasi",
    "saintifik", "pendekatan", "sains", "teknologi", "teknik", "matematika", "seni", "kreativitas",
    "kemampuan", "ilmiah", "hipotesis", "kesimpulan", "kooperatif", "tujuan", "motivasi",
    "kelompok", "heterogen", "penghargaan", "sistematis", "solusi", "implementasi", "terbalik",
    "mandiri", "pendalaman", "strategi", "pasangan", "berbagi", "penelitian", "pengalaman",
    "konkret", "observasi", "abstrak", "konseptualisasi", "eksperimentasi", "daring", "tatap",
    "muka", "sinkron", "praktik", "konsolidasi", "laporan", "proses", "hasil"
  ]),

  commonSplits: {
    "pert anyaan": "pertanyaan",
    "pe rtanyaan": "pertanyaan",
    "kelo mpok": "kelompok",
    "mengevalu asi": "mengevaluasi",
    "pembel ajaran": "pembelajaran",
    "aktiv itas": "aktivitas",
    "pendah uluan": "pendahuluan",
    "keg iatan": "kegiatan",
    "eval uasi": "evaluasi",
    "karakter istik": "karakteristik",
    "inves tigasi": "investigasi",
    "mengan alisis": "menganalisis",
    "pemec ahan": "pemecahan",
    "penc apaian": "pencapaian",
    "indik ator": "indikator",
    "aut entik": "autentik",
    "diag nostik": "diagnostik",
    "form atif": "formatif",
    "sum atif": "sumatif",
    "kooper atif": "kooperatif",
    "kolabo rasi": "kolaborasi",
    "pedagog is": "pedagogis",
    "lingk ungan": "lingkungan"
  },

  sanitizeText(str) {
    if (typeof str !== 'string') return str;

    // 1. Pembersihan karakter rusak
    let result = str
      .replace(/%¶/g, ' • ')
      .replace(/¶/g, ' ')
      .replace(//g, '')
      .replace(/[\uFFFD\uE000-\uF8FF]/g, '');

    // 2. Perbaiki spasi ganda
    result = result.replace(/\s+/g, ' ');

    // 3. Gabungkan kata yang terpotong (common splits)
    for (const [split, merged] of Object.entries(this.commonSplits)) {
      const regex = new RegExp(split.replace(/ /g, '\\s+'), 'gi');
      result = result.replace(regex, merged);
    }

    // 4. Gabungkan kata terpotong berdasarkan kamus (rule-based)
    result = result.replace(/\b([a-zA-Z]{2,})\s+([a-zA-Z]{2,})\b/g, (match, w1, w2) => {
      const combined = (w1 + w2).toLowerCase();
      if (this.dictionary.has(combined)) {
        const isUpper = w1[0] === w1[0].toUpperCase();
        return isUpper ? combined[0].toUpperCase() + combined.slice(1) : combined;
      }
      return match;
    });

    // 5. Perbaiki spasi di sekitar tanda baca (contoh: "halo , dunia ." -> "halo, dunia.")
    result = result
      .replace(/\s+([.,;:?!])/g, '$1') // hapus spasi sebelum tanda baca
      .replace(/([.,;:?!])([a-zA-Z])/g, '$1 $2'); // tambahkan spasi setelah tanda baca jika menempel ke huruf

    // 6. Rapikan kapitalisasi awal kalimat
    result = result.replace(/(^\s*|[.!?]\s+)([a-z])/g, (match, separator, char) => {
      return separator + char.toUpperCase();
    });

    // 7. Rapikan bullet points jika ada di dalam teks
    result = result.replace(/•\s*/g, '• ');

    return result.trim();
  },

  sanitizeObject(obj) {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string') {
      return this.sanitizeText(obj);
    }
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }
    if (typeof obj === 'object') {
      const newObj = {};
      for (const key in obj) {
        newObj[key] = this.sanitizeObject(obj[key]);
      }
      return newObj;
    }
    return obj;
  },

  validateRPMData(rpmData) {
    const issues = [];
    if (!rpmData) {
      issues.push("Data RPM kosong.");
      return { valid: false, issues };
    }

    // Check sections
    if (!rpmData.identifikasi) issues.push("Bagian A (Identifikasi) kosong.");
    if (!rpmData.desainPembelajaran) issues.push("Bagian B (Desain Pembelajaran) kosong.");
    if (!rpmData.pengalamanBelajar) issues.push("Bagian C (Pengalaman Belajar) kosong.");
    if (!rpmData.asesmen) issues.push("Bagian D (Asesmen) kosong.");
    if (!rpmData.refleksi) issues.push("Bagian E (Refleksi) kosong.");

    // Check empty columns in tables
    if (rpmData.pengalamanBelajar?.pendahuluan?.some(a => !a.aktivitasGuru || !a.aktivitasMurid)) {
      issues.push("Ada kolom kosong pada tabel Pendahuluan.");
    }
    if (rpmData.pengalamanBelajar?.inti?.some(a => !a.aktivitasGuru || !a.aktivitasMurid)) {
      issues.push("Ada kolom kosong pada tabel Kegiatan Inti.");
    }
    if (rpmData.pengalamanBelajar?.penutup?.some(a => !a.aktivitasGuru || !a.aktivitasMurid)) {
      issues.push("Ada kolom kosong pada tabel Penutup.");
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }
};
