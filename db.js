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
    this.initIndexedDB();
    this.seedAdmin();
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
    if (this.ready) return;
    await this.initIndexedDB();
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
      email: data.email,
      password: data.password,
      namaLengkap: data.namaLengkap,
      createdAt: new Date().toISOString(),
      isActive: true,
      profileComplete: false,
    };
    users.push(newUser);
    this.saveUsers(users);
    return { success: true, user: newUser };
  }

  loginUser(email, password) {
    const users = this.getUsers();
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) return { success: false, message: 'Email atau password salah.' };
    if (!user.isActive) return { success: false, message: 'Akun tidak aktif. Hubungi administrator.' };
    this.lsSet('sgm_current_user', user.id);
    return { success: true, user };
  }

  logout() { this.lsDel('sgm_current_user'); }

  getCurrentUser() {
    const userId = this.lsGet('sgm_current_user');
    if (!userId) return null;
    return this.getUsers().find(u => u.id === userId) || null;
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
    const users = this.getUsers();
    const adminEmail = 'adm.andrisuwandi@gmail.com';
    if (!users.find(u => u.email === adminEmail)) {
      const adminUser = {
        id: 'usr_admin',
        email: adminEmail,
        password: 'sahabatguru',
        namaLengkap: 'Admin Sahabat Guru',
        createdAt: new Date().toISOString(),
        isActive: true,
        profileComplete: true,
      };
      users.push(adminUser);
      this.saveUsers(users);

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
