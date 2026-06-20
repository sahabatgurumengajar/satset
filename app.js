/**
 * SAHABAT GURU MENGAJAR v2
 * Main Application — SPA, Auth, Wizard (3 Langkah), Dashboard, Generator
 * Pengguna TIDAK pernah melihat/isi API Key.
 * Smart Template + Auto-Save 30 detik
 */

// ─── App State ─────────────────────────────────────────────────────────────
const AppState = {
  currentPage: null,
  currentUser: null,
  currentProfile: null,
  currentRPM: null,
  isGenerating: false,
  sidebarOpen: false,
  theme: 'light',
  autoSaveTimer: null,
};

// ─── Router ────────────────────────────────────────────────────────────────
const Router = {
  pages: {},
  register(name, fn) { this.pages[name] = fn; },
  navigate(page, params = {}) {
    AppState.currentPage = page;
    const fn = this.pages[page];
    if (fn) fn(params);
    else console.warn('Page not found:', page);
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === page);
    });
    if (window.innerWidth <= 768) UI.closeSidebar();
    const content = document.getElementById('page-content');
    if (content) content.scrollTop = 0;
  },
};

// ─── UI Helpers ────────────────────────────────────────────────────────────
const UI = {
  show(id) { document.getElementById(id)?.classList.remove('hidden'); },
  hide(id) { document.getElementById(id)?.classList.add('hidden'); },
  showPage(pageId) {
    document.querySelectorAll('.app-page').forEach(p => p.classList.add('hidden'));
    const page = document.getElementById(pageId);
    if (page) { page.classList.remove('hidden'); page.style.animation = 'fadeIn 0.3s ease'; }
  },
  setContent(id, html) { const el = document.getElementById(id); if (el) el.innerHTML = html; },

  toast(message, type = 'info', duration = 3500) {
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const id = 'toast_' + Date.now();
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.id = id;
    t.innerHTML = `<span class="toast-icon">${icons[type]}</span><span class="toast-message">${message}</span><button class="toast-close" onclick="this.parentElement.remove()">✕</button>`;
    document.getElementById('toast-container').appendChild(t);
    setTimeout(() => { const el = document.getElementById(id); if (el) { el.style.opacity = '0'; el.style.transform = 'translateX(100%)'; el.style.transition = 'all 0.3s'; setTimeout(() => el.remove(), 300); } }, duration);
  },

  confirm(message, onConfirm) {
    document.getElementById('confirm-message').textContent = message;
    document.getElementById('confirm-modal').classList.remove('hidden');
    document.getElementById('confirm-ok').onclick = () => {
      document.getElementById('confirm-modal').classList.add('hidden');
      onConfirm();
    };
    document.getElementById('confirm-cancel').onclick = () => document.getElementById('confirm-modal').classList.add('hidden');
  },

  openSidebar() {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sidebar-overlay').classList.add('visible');
    AppState.sidebarOpen = true;
  },
  closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('visible');
    AppState.sidebarOpen = false;
  },

  updateUserUI() {
    const user = AppState.currentUser;
    const profile = AppState.currentProfile;
    if (!user) return;
    const initials = (profile?.namaGuru || user.namaLengkap || user.email).split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
    document.querySelectorAll('.user-avatar-text').forEach(el => el.textContent = initials);
    document.querySelectorAll('.user-name-display').forEach(el => el.textContent = profile?.namaGuru || user.namaLengkap || 'Pengguna');
    document.querySelectorAll('.user-email-display').forEach(el => el.textContent = user.email);
    document.querySelectorAll('.school-name-display').forEach(el => el.textContent = profile?.namaSekolah || 'Sekolah belum diatur');
    if (db.isAdmin(user.email)) document.getElementById('nav-admin')?.classList.remove('hidden');
  },

  updatePageTitle(title, subtitle = '') {
    const t = document.getElementById('header-page-title');
    const s = document.getElementById('header-page-subtitle');
    if (t) t.textContent = title;
    if (s) { s.textContent = subtitle; s.style.display = subtitle ? 'block' : 'none'; }
  },

  formatDate(iso) {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  },
  formatDateTime(iso) {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  },

  escHtml(str) { const d = document.createElement('div'); d.textContent = str || ''; return d.innerHTML; },
};

// ─── Theme Manager ─────────────────────────────────────────────────────────
const ThemeManager = {
  init() {
    const user = db.getCurrentUser();
    const theme = user ? db.getTheme(user.id) : (localStorage.getItem('sgm_theme_guest') || 'light');
    this.apply(theme);
  },
  apply(theme) {
    AppState.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    const icon = document.getElementById('theme-icon');
    if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
    const lc = document.getElementById('theme-light-card');
    const dc = document.getElementById('theme-dark-card');
    if (lc) lc.style.border = theme === 'light' ? '2px solid var(--primary)' : '1.5px solid var(--border)';
    if (dc) dc.style.border = theme === 'dark' ? '2px solid var(--primary)' : '1.5px solid var(--border)';
  },
  toggle() {
    const newTheme = AppState.theme === 'light' ? 'dark' : 'light';
    this.apply(newTheme);
    const user = AppState.currentUser;
    if (user) db.saveSettings(user.id, { theme: newTheme });
    else localStorage.setItem('sgm_theme_guest', newTheme);
  },
};

// ─── Auth Controller ────────────────────────────────────────────────────────
const Auth = {
  init() {
    const user = db.getCurrentUser();
    if (user) {
      AppState.currentUser = user;
      AppState.currentProfile = db.getProfile(user.id);
      this.enterApp();
    } else {
      this.showAuth();
    }
  },

  showAuth() {
    UI.showPage('page-auth');
    document.getElementById('app-layout-wrapper').classList.add('hidden');
    document.getElementById('page-wizard').classList.add('hidden');
  },

  enterApp() {
    const user = AppState.currentUser;
    if (!user) return;
    ThemeManager.init();
    if (!user.profileComplete) { this.showWizard(); return; }
    UI.hide('page-auth');
    UI.hide('page-wizard');
    UI.show('app-layout-wrapper');
    UI.updateUserUI();
    Router.navigate(db.isAdmin(user.email) ? 'admin' : 'dashboard');
  },

  showWizard() {
    UI.hide('page-auth');
    UI.hide('app-layout-wrapper');
    UI.show('page-wizard');
    Wizard.init();
  },

  logout() {
    UI.confirm('Apakah Anda yakin ingin keluar?', () => {
      clearInterval(AppState.autoSaveTimer);
      db.logout();
      AppState.currentUser = null;
      AppState.currentProfile = null;
      AppState.currentRPM = null;
      this.showAuth();
    });
  },

  handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btn = document.getElementById('login-btn');
    btn.disabled = true; btn.innerHTML = '<span style="animation:spin 1s linear infinite;display:inline-block">⏳</span> Masuk...';
    const result = db.loginUser(email, password);
    if (result.success) {
      AppState.currentUser = result.user;
      AppState.currentProfile = db.getProfile(result.user.id);
      UI.toast(`Selamat datang, ${result.user.namaLengkap || 'Guru'}! 👋`, 'success');
      this.enterApp();
    } else {
      UI.toast(result.message, 'error');
      btn.disabled = false; btn.innerHTML = 'Masuk ke Aplikasi';
    }
  },

  handleRegister(e) {
    e.preventDefault();
    const namaLengkap = document.getElementById('reg-nama').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirm = document.getElementById('reg-confirm').value;
    if (!namaLengkap || !email || !password) { UI.toast('Semua field wajib diisi.', 'error'); return; }
    if (password.length < 6) { UI.toast('Password minimal 6 karakter.', 'error'); return; }
    if (password !== confirm) { UI.toast('Password tidak cocok.', 'error'); return; }
    const btn = document.getElementById('reg-btn');
    btn.disabled = true; btn.innerHTML = '<span style="animation:spin 1s linear infinite;display:inline-block">⏳</span> Mendaftar...';
    const result = db.registerUser({ namaLengkap, email, password });
    if (result.success) {
      db.loginUser(email, password);
      AppState.currentUser = db.getCurrentUser();
      AppState.currentProfile = null;
      UI.toast('Akun berhasil dibuat! Selamat datang 🎉', 'success');
      this.showWizard();
    } else {
      UI.toast(result.message, 'error');
      btn.disabled = false; btn.innerHTML = '🚀 Daftar Sekarang';
    }
  },
};

// ─── Setup Wizard (3 Langkah — TANPA API Key) ────────────────────────────────
const Wizard = {
  step: 1,
  totalSteps: 3,
  data: {},
  logoBase64: null,

  init() {
    this.step = 1; this.data = {}; this.logoBase64 = null;
    this.renderStep();
  },

  renderStep() {
    this.updateStepIndicators();
    const content = document.getElementById('wizard-content');
    content.style.animation = 'none';
    content.offsetHeight; // trigger reflow
    content.style.animation = 'slideUp 0.35s ease';
    content.innerHTML = [this.renderStep1, this.renderStep2, this.renderStep3][this.step - 1].call(this);
    if (this.step === 1) this.initLogoUpload();
    this.updateNavButtons();
  },

  initLogoUpload() {
    const input = document.getElementById('logo-input');
    document.getElementById('logo-upload-area')?.addEventListener('click', () => input?.click());
    input?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        this.logoBase64 = ev.target.result;
        const prev = document.getElementById('logo-preview');
        if (prev) { prev.src = ev.target.result; prev.classList.remove('hidden'); }
        document.getElementById('logo-placeholder')?.classList.add('hidden');
      };
      reader.readAsDataURL(file);
    });
  },

  updateStepIndicators() {
    for (let i = 1; i <= this.totalSteps; i++) {
      const dot = document.getElementById(`step-dot-${i}`);
      const line = document.getElementById(`step-line-${i}`);
      if (dot) {
        dot.className = 'wizard-dot';
        if (i < this.step) { dot.classList.add('done'); dot.textContent = '✓'; }
        else if (i === this.step) { dot.classList.add('active'); dot.textContent = i; }
        else dot.textContent = i;
      }
      if (line) { line.className = 'wizard-line'; if (i < this.step) line.classList.add('done'); }
    }
  },

  updateNavButtons() {
    const prev = document.getElementById('wizard-prev');
    const next = document.getElementById('wizard-next');
    if (prev) prev.style.display = this.step === 1 ? 'none' : 'flex';
    if (next) next.innerHTML = this.step === this.totalSteps ? '✓ Mulai Mengajar!' : 'Lanjut →';
  },

  renderStep1() {
    return `
      <h2 class="wizard-title">🏫 Identitas Sekolah</h2>
      <p class="wizard-subtitle">Informasi ini akan tampil otomatis di setiap RPM yang Anda buat.</p>
      <div class="form-group">
        <label class="form-label">Logo Sekolah</label>
        <div class="logo-upload" id="logo-upload-area">
          <input type="file" id="logo-input" accept="image/*" style="display:none">
          <img src="" id="logo-preview" class="logo-upload-preview hidden" alt="Logo">
          <div id="logo-placeholder">
            <div style="font-size:2.5rem;margin-bottom:0.5rem">🏫</div>
            <p class="logo-upload-text">Klik untuk upload logo <span>Browse</span></p>
            <p class="logo-upload-text" style="font-size:0.75rem;margin-top:0.25rem;opacity:0.6">PNG, JPG (Maks. 2MB)</p>
          </div>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Nama Sekolah <span class="required">*</span></label>
        <input type="text" class="form-control" id="w-nama-sekolah" placeholder="Contoh: SDN 61 Singkawang" value="${this.data.namaSekolah || ''}">
      </div>
      <div class="form-grid-2">
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">NPSN <span style="opacity:0.5">(Opsional)</span></label>
          <input type="text" class="form-control" id="w-npsn" placeholder="12345678" value="${this.data.npsn || ''}">
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Kota/Kabupaten</label>
          <input type="text" class="form-control" id="w-kota" placeholder="Singkawang" value="${this.data.namaKota || ''}">
        </div>
      </div>
      <div class="form-group" style="margin-top:0.875rem">
        <label class="form-label">Alamat Sekolah</label>
        <textarea class="form-control" id="w-alamat" placeholder="Jl. ..." style="min-height:70px">${this.data.alamatSekolah || ''}</textarea>
      </div>
      <div class="form-grid-2">
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Telepon <span style="opacity:0.5">(Opsional)</span></label>
          <input type="text" class="form-control" id="w-telepon" placeholder="0561-..." value="${this.data.teleponSekolah || ''}">
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Email Sekolah <span style="opacity:0.5">(Opsional)</span></label>
          <input type="email" class="form-control" id="w-email-sekolah" placeholder="sekolah@gmail.com" value="${this.data.emailSekolah || ''}">
        </div>
      </div>
    `;
  },

  renderStep2() {
    return `
      <h2 class="wizard-title">👤 Identitas Guru & Kepala Sekolah</h2>
      <p class="wizard-subtitle">Data ini digunakan untuk tanda tangan di setiap dokumen RPM.</p>
      <div style="background:rgba(79,172,254,0.1);border:1px solid rgba(79,172,254,0.2);border-radius:12px;padding:0.875rem;margin-bottom:1.25rem">
        <p style="color:rgba(255,255,255,0.8);font-size:0.82rem;line-height:1.6">📝 <strong>Data Guru (Anda)</strong></p>
      </div>
      <div class="form-group">
        <label class="form-label">Nama Lengkap Guru <span class="required">*</span></label>
        <input type="text" class="form-control" id="w-nama-guru" placeholder="Contoh: Andri Suwandi, S.Pd." value="${this.data.namaGuru || AppState.currentUser?.namaLengkap || ''}">
      </div>
      <div class="form-group">
        <label class="form-label">NIP <span style="opacity:0.5">(Opsional)</span></label>
        <input type="text" class="form-control" id="w-nip-guru" placeholder="19900101 201501 1 001" value="${this.data.nipGuru || ''}">
      </div>
      <div style="background:rgba(79,172,254,0.1);border:1px solid rgba(79,172,254,0.2);border-radius:12px;padding:0.875rem;margin:1.25rem 0">
        <p style="color:rgba(255,255,255,0.8);font-size:0.82rem">🏛️ <strong>Kepala Sekolah</strong></p>
      </div>
      <div class="form-group">
        <label class="form-label">Nama Kepala Sekolah <span class="required">*</span></label>
        <input type="text" class="form-control" id="w-nama-kepsek" placeholder="Contoh: Drs. Budi Santoso, M.Pd." value="${this.data.namaKepsek || ''}">
      </div>
      <div class="form-group">
        <label class="form-label">NIP Kepala Sekolah <span style="opacity:0.5">(Opsional)</span></label>
        <input type="text" class="form-control" id="w-nip-kepsek" placeholder="19800101 200501 1 001" value="${this.data.nipKepsek || ''}">
      </div>
    `;
  },

  renderStep3() {
    const fases = ['A', 'B', 'C', 'D', 'E', 'F'].map(f =>
      `<option value="${f}" ${this.data.faseSering === f ? 'selected' : ''}>Fase ${f}</option>`).join('');
    const kelas = Array.from({length: 12}, (_, i) => i + 1).map(k =>
      `<option value="${k}" ${this.data.kelasSering == k ? 'selected' : ''}>Kelas ${k}</option>`).join('');
    const mapels = ['Matematika','Bahasa Indonesia','Bahasa Inggris','IPA','IPS','PPKn','Seni Budaya','Pendidikan Jasmani','Agama Islam','Agama Kristen','Agama Katolik','Agama Hindu','Agama Buddha','Prakarya','Informatika','Ekonomi','Geografi','Sejarah','Sosiologi','Fisika','Kimia','Biologi','Bahasa Jawa','Bahasa Sunda','Bahasa Bali','Lainnya'].map(m =>
      `<option value="${m}" ${this.data.mapelUtama === m ? 'selected' : ''}>${m}</option>`).join('');
    return `
      <h2 class="wizard-title">📚 Profil Mengajar</h2>
      <p class="wizard-subtitle">Preferensi ini akan mengisi form RPM secara otomatis untuk Anda.</p>
      
      <div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.2);border-radius:12px;padding:1rem;margin-bottom:1.5rem">
        <div style="color:rgba(255,255,255,0.9);font-size:0.85rem;font-weight:600;margin-bottom:0.25rem">✨ Smart Template Aktif</div>
        <div style="color:rgba(255,255,255,0.65);font-size:0.8rem;line-height:1.5">Setiap kali Anda selesai membuat RPM, sistem akan mengingat preferensi Anda dan mengisi form berikutnya secara otomatis. Anda cukup ganti materi saja!</div>
      </div>
      
      <div class="form-grid-2">
        <div class="form-group">
          <label class="form-label">Fase Utama</label>
          <select class="form-control" id="w-fase">${fases}</select>
        </div>
        <div class="form-group">
          <label class="form-label">Kelas Utama</label>
          <select class="form-control" id="w-kelas">${kelas}</select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Mata Pelajaran Utama <span class="required">*</span></label>
        <select class="form-control" id="w-mapel">${mapels}</select>
      </div>
      <div class="form-group">
        <label class="form-label">Mapel Lain yang Diajar <span style="opacity:0.5">(Opsional)</span></label>
        <input type="text" class="form-control" id="w-mapel-lain" placeholder="Contoh: Matematika, IPA" value="${this.data.mapelLain || ''}">
      </div>
      
      <div style="background:rgba(79,172,254,0.1);border:1px solid rgba(79,172,254,0.2);border-radius:12px;padding:1rem;margin-top:0.5rem">
        <div style="color:rgba(255,255,255,0.85);font-size:0.82rem;line-height:1.6">
          🤖 <strong>AI siap digunakan!</strong> Sistem AI sudah terhubung. Anda langsung bisa mulai membuat RPM setelah setup selesai.
        </div>
      </div>
    `;
  },

  collectStep1() {
    const nama = document.getElementById('w-nama-sekolah')?.value.trim();
    if (!nama) { UI.toast('Nama sekolah wajib diisi.', 'error'); return false; }
    this.data.namaSekolah = nama;
    this.data.npsn = document.getElementById('w-npsn')?.value.trim();
    this.data.namaKota = document.getElementById('w-kota')?.value.trim();
    this.data.alamatSekolah = document.getElementById('w-alamat')?.value.trim();
    this.data.teleponSekolah = document.getElementById('w-telepon')?.value.trim();
    this.data.emailSekolah = document.getElementById('w-email-sekolah')?.value.trim();
    if (this.logoBase64) this.data.logoBase64 = this.logoBase64;
    return true;
  },

  collectStep2() {
    const namaGuru = document.getElementById('w-nama-guru')?.value.trim();
    const namaKepsek = document.getElementById('w-nama-kepsek')?.value.trim();
    if (!namaGuru) { UI.toast('Nama guru wajib diisi.', 'error'); return false; }
    if (!namaKepsek) { UI.toast('Nama kepala sekolah wajib diisi.', 'error'); return false; }
    this.data.namaGuru = namaGuru;
    this.data.nipGuru = document.getElementById('w-nip-guru')?.value.trim();
    this.data.namaKepsek = namaKepsek;
    this.data.nipKepsek = document.getElementById('w-nip-kepsek')?.value.trim();
    return true;
  },

  collectStep3() {
    this.data.faseSering = document.getElementById('w-fase')?.value;
    this.data.kelasSering = document.getElementById('w-kelas')?.value;
    this.data.mapelUtama = document.getElementById('w-mapel')?.value;
    this.data.mapelLain = document.getElementById('w-mapel-lain')?.value.trim();
    return true;
  },

  next() {
    const ok = [this.collectStep1, this.collectStep2, this.collectStep3][this.step - 1].call(this);
    if (!ok) return;
    if (this.step === this.totalSteps) { this.complete(); return; }
    this.step++;
    this.renderStep();
  },

  prev() { if (this.step > 1) { this.step--; this.renderStep(); } },

  complete() {
    const user = AppState.currentUser;
    if (!user) return;
    db.saveProfile(user.id, this.data);
    AppState.currentProfile = this.data;
    if (this.data.namaGuru) db.updateUser(user.id, { namaLengkap: this.data.namaGuru });
    AppState.currentUser = db.getCurrentUser();
    UI.toast('Profil berhasil disimpan! Selamat menggunakan Sahabat Guru Mengajar 🎉', 'success');
    UI.hide('page-wizard');
    UI.show('app-layout-wrapper');
    UI.updateUserUI();
    Router.navigate('dashboard');
  },
};

// ─── Auto-Save Engine (30 detik) ────────────────────────────────────────────
const AutoSave = {
  start(getUserId, getFormData) {
    this.stop();
    AppState.autoSaveTimer = setInterval(() => {
      const userId = getUserId();
      const fd = getFormData();
      if (!userId || !fd?.materi) return;
      db.saveDraft(userId, { formData: fd, savedAt: new Date().toISOString() });
      this.showIndicator();
    }, 30000);
  },
  stop() {
    if (AppState.autoSaveTimer) { clearInterval(AppState.autoSaveTimer); AppState.autoSaveTimer = null; }
  },
  showIndicator() {
    const el = document.getElementById('autosave-indicator');
    if (!el) return;
    el.textContent = '💾 Draft tersimpan ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    el.style.opacity = '1';
    setTimeout(() => { el.style.opacity = '0'; }, 3000);
  },
};

// ─── Dashboard ──────────────────────────────────────────────────────────────
const Dashboard = {
  async render() {
    UI.showPage('page-dashboard');
    UI.updatePageTitle('Dashboard', 'Selamat datang di Sahabat Guru Mengajar');
    const user = AppState.currentUser;
    const profile = AppState.currentProfile;

    document.getElementById('hero-greeting').textContent =
      `Halo, ${(profile?.namaGuru || user?.namaLengkap || 'Guru').split(' ')[0]}! 👋`;
    document.getElementById('hero-school').textContent = profile?.namaSekolah || 'Atur profil sekolah Anda';

    const [total, thisMonth] = await Promise.all([
      db.getRPMCount(user.id),
      db.getRPMThisMonth(user.id),
    ]);
    const downloads = db.getDownloadCount(user.id);
    this.animateCounter('stat-total-rpm', total);
    this.animateCounter('stat-this-month', thisMonth);
    this.animateCounter('stat-downloads', downloads);

    const rpmList = await db.getRPMList(user.id);
    this.renderRecentRPM(rpmList.slice(0, 8));

    // AI Status indicator
    const hasKey = db.hasApiKey();
    const aiStatus = document.getElementById('ai-status-indicator');
    if (aiStatus) {
      aiStatus.innerHTML = hasKey
        ? `<span style="color:var(--success)">🟢 AI Aktif — Gemini 2.5 Pro</span>`
        : `<span style="color:var(--warning)">🟡 AI belum dikonfigurasi (hubungi admin)</span>`;
    }
  },

  animateCounter(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    let n = 0;
    const step = Math.max(1, Math.ceil(target / 40));
    const t = setInterval(() => { n = Math.min(n + step, target); el.textContent = n; if (n >= target) clearInterval(t); }, 25);
  },

  renderRecentRPM(list) {
    const c = document.getElementById('recent-rpm-list');
    if (!c) return;
    if (!list.length) {
      c.innerHTML = `
        <div class="empty-state" style="padding:2.5rem">
          <div style="font-size:3rem;margin-bottom:0.75rem">📄</div>
          <h3 style="margin-bottom:0.5rem">Belum ada RPM</h3>
          <p style="color:var(--text-muted);font-size:0.875rem;margin-bottom:1rem">Buat RPM pertama Anda dengan AI sekarang!</p>
          <button class="btn btn-primary" onclick="Router.navigate('generator')">✨ Buat RPM Pertama</button>
        </div>`;
      return;
    }
    c.innerHTML = list.map(rpm => `
      <div class="rpm-item" onclick="RPMHistory.openRPM('${rpm.id}')">
        <div class="rpm-item-icon">📋</div>
        <div class="rpm-item-info">
          <div class="rpm-item-title">${UI.escHtml(rpm.formData?.materi || 'RPM')}</div>
          <div class="rpm-item-meta">
            <span>📚 ${UI.escHtml(rpm.formData?.mapel || '-')}</span>
            <span>🎓 Fase ${UI.escHtml(rpm.formData?.fase || '-')} / Kelas ${UI.escHtml(String(rpm.formData?.kelas || '-'))}</span>
            <span>🤖 ${UI.escHtml(rpm.formData?.model?.split('(')[0]?.trim() || '-')}</span>
            <span>📅 ${UI.formatDate(rpm.createdAt)}</span>
          </div>
        </div>
        <div class="rpm-item-actions">
          <button class="btn btn-ghost btn-sm btn-icon" onclick="event.stopPropagation();RPMHistory.downloadPDF('${rpm.id}')" title="PDF">📄</button>
          <button class="btn btn-ghost btn-sm btn-icon" onclick="event.stopPropagation();RPMHistory.downloadWord('${rpm.id}')" title="Word">📝</button>
        </div>
      </div>
    `).join('');
  },
};

// ─── RPM Generator ──────────────────────────────────────────────────────────
const Generator = {
  currentFormData: null,

  render() {
    UI.showPage('page-generator');
    UI.updatePageTitle('Buat RPM', 'Generator RPM Otomatis dengan AI');
    const profile = AppState.currentProfile;
    const user = AppState.currentUser;

    // Smart Template: Auto-fill dari template preferensi
    const template = user ? db.getSmartTemplate(user.id) : null;
    const draft = user ? db.getDraft(user.id) : null;
    const prefill = draft?.formData || template || {};

    // Isi form dari preferensi/profil
    const setSelect = (id, val) => {
      const el = document.getElementById(id);
      if (el && val) el.value = val;
    };
    const setInput = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };

    setSelect('gen-fase', prefill.fase || profile?.faseSering);
    setSelect('gen-kelas', prefill.kelas || profile?.kelasSering);
    setSelect('gen-semester', prefill.semester);
    setInput('gen-waktu', prefill.waktu);

    // Mapel: dari prefill atau profil
    const mapelVal = prefill.mapel || profile?.mapelUtama;
    const mapelSelect = document.getElementById('gen-mapel');
    if (mapelSelect && mapelVal) {
      let found = false;
      for (const opt of mapelSelect.options) {
        if (opt.value === mapelVal) { opt.selected = true; found = true; break; }
      }
      if (!found) {
        // Mapel kustom (tidak ada dalam daftar) — tampilkan input "Lainnya"
        mapelSelect.value = '__lainnya__';
        const wrap = document.getElementById('gen-mapel-custom-wrap');
        const inp = document.getElementById('gen-mapel-custom');
        if (wrap) wrap.classList.remove('hidden');
        if (inp) inp.value = mapelVal;
      }
    }

    // Model dari template
    if (prefill.model) this.selectModel(prefill.model);

    // Materi & CP & TP dari draft saja (bukan template)
    if (draft?.formData) {
      setInput('gen-materi', draft.formData.materi);
      setInput('gen-cp', draft.formData.cp);
      setInput('gen-tp', draft.formData.tp);
    }

    // Smart template indicator
    if (template) {
      const ind = document.getElementById('smart-template-indicator');
      if (ind) {
        ind.classList.remove('hidden');
        ind.innerHTML = `<span>✨ Smart Template: ${UI.escHtml(template.mapel || '')} • Fase ${UI.escHtml(template.fase || '')} • ${UI.escHtml(template.model?.split('(')[0]?.trim() || '')}</span> <button style="background:none;border:none;color:var(--primary);cursor:pointer;font-size:0.78rem;font-weight:600" onclick="Generator.clearTemplate()">Hapus</button>`;
      }
    }

    // Draft indicator
    if (draft && !template) {
      const ind = document.getElementById('smart-template-indicator');
      if (ind) {
        ind.classList.remove('hidden');
        ind.innerHTML = `<span>💾 Draft tersimpan: ${UI.formatDateTime(draft.savedAt)}</span>`;
      }
    }

    // Start auto-save
    AutoSave.start(
      () => AppState.currentUser?.id,
      () => this.getFormData()
    );

    // Show result if exists
    if (AppState.currentRPM) this.displayResult(AppState.currentRPM);
    else this.showEmpty();
  },

  clearTemplate() {
    if (AppState.currentUser) {
      localStorage.removeItem(`sgm_template_${AppState.currentUser.id}`);
      localStorage.removeItem(`sgm_draft_${AppState.currentUser.id}`);
    }
    document.getElementById('smart-template-indicator')?.classList.add('hidden');
    UI.toast('Template dihapus.', 'info');
  },

  selectModel(model) {
    document.querySelectorAll('.model-chip').forEach(c => c.classList.toggle('selected', c.dataset.model === model));
  },

  // Tampil/sembunyikan input kustom saat pilih "Lainnya"
  onMapelChange(val) {
    const wrap = document.getElementById('gen-mapel-custom-wrap');
    const inp = document.getElementById('gen-mapel-custom');
    if (val === '__lainnya__') {
      if (wrap) { wrap.classList.remove('hidden'); wrap.style.animation = 'slideDown 0.25s ease'; }
      if (inp) { inp.focus(); }
    } else {
      if (wrap) wrap.classList.add('hidden');
      if (inp) inp.value = '';
    }
  },

  // Baca nilai mapel: jika pilih "Lainnya", ambil dari input kustom
  getMapelValue() {
    const select = document.getElementById('gen-mapel');
    if (!select) return '';
    if (select.value === '__lainnya__') {
      return (document.getElementById('gen-mapel-custom')?.value?.trim()) || '';
    }
    return select.value || '';
  },

  getFormData() {
    const selectedChip = document.querySelector('.model-chip.selected');
    return {
      fase: document.getElementById('gen-fase')?.value || '',
      kelas: document.getElementById('gen-kelas')?.value || '',
      semester: document.getElementById('gen-semester')?.value || '',
      mapel: this.getMapelValue(),
      materi: document.getElementById('gen-materi')?.value?.trim() || '',
      waktu: document.getElementById('gen-waktu')?.value?.trim() || '',
      cp: document.getElementById('gen-cp')?.value?.trim() || '',
      tp: document.getElementById('gen-tp')?.value?.trim() || '',
      model: selectedChip?.dataset.model || '',
    };
  },

  validate(fd) {
    // Cek mapel kustom: jika pilih "Lainnya" tapi input kosong
    const mapelSelect = document.getElementById('gen-mapel');
    if (mapelSelect?.value === '__lainnya__' && !fd.mapel) {
      UI.toast('Tulis nama mata pelajaran Anda terlebih dahulu.', 'error');
      document.getElementById('gen-mapel-custom')?.focus();
      return false;
    }
    if (!fd.materi) { UI.toast('Materi pokok wajib diisi.', 'error'); document.getElementById('gen-materi')?.focus(); return false; }
    if (!fd.waktu) { UI.toast('Alokasi waktu wajib diisi.', 'error'); document.getElementById('gen-waktu')?.focus(); return false; }
    if (!fd.model) { UI.toast('Pilih model pembelajaran terlebih dahulu.', 'error'); return false; }
    if (!db.hasApiKey()) {
      UI.toast('Sistem AI belum dikonfigurasi. Silakan hubungi administrator aplikasi.', 'warning', 5000);
      return false;
    }

    return true;
  },

  async generate() {
    if (AppState.isGenerating) return;
    const fd = this.getFormData();
    if (!this.validate(fd)) return;

    AppState.isGenerating = true;
    this.currentFormData = fd;
    db.saveDraft(AppState.currentUser.id, { formData: fd });

    const genBtn = document.getElementById('gen-btn');
    const stopBtn = document.getElementById('stop-btn');
    genBtn.disabled = true; genBtn.classList.add('hidden');
    stopBtn.classList.remove('hidden');

    this.showGenerating(fd);
    let rawText = '';

    await aiEngine.generateRPM(
      fd,
      AppState.currentProfile,
      (stageIdx, stageText) => this.updateStage(stageIdx, stageText),
      (chunk) => { rawText += chunk; },
      async (fullText) => {
        rawText = rawText || fullText;
        try {
          const rpmData = aiEngine.parseRPMJSON(rawText);
          const rpmDoc = {
            id: AppState.currentRPM?.id || ('rpm_' + Date.now()),
            formData: fd, rpmData, rawText,
            createdAt: AppState.currentRPM?.createdAt || new Date().toISOString(),
          };
          const saved = await db.saveRPM(AppState.currentUser.id, rpmDoc);
          AppState.currentRPM = saved;
          // Save smart template
          db.saveSmartTemplate(AppState.currentUser.id, fd);
          db.clearDraft(AppState.currentUser.id);
          this.displayResult(saved);
          UI.toast('RPM berhasil dibuat! 🎉', 'success', 4000);

          // Show QC badge if available
          if (rpmData.qualityCheck?.skorKualitas) {
            const score = rpmData.qualityCheck.skorKualitas;
            const colors = { A: 'var(--success)', B: 'var(--primary)', C: 'var(--warning)' };
            UI.toast(`Quality Check: Skor ${score} — ${rpmData.qualityCheck.konsistensiTP || ''}`, 'success', 5000);
          }
        } catch (err) {
          this.showError(err.message);
          UI.toast('Gagal memproses hasil AI. Coba Generate Ulang.', 'error');
        }
        AppState.isGenerating = false;
        genBtn.disabled = false; genBtn.classList.remove('hidden');
        stopBtn.classList.add('hidden');
      },
      (errMsg) => {
        this.showError(errMsg);
        AppState.isGenerating = false;
        genBtn.disabled = false; genBtn.classList.remove('hidden');
        stopBtn.classList.add('hidden');
      }
    );
  },

  stopGeneration() {
    aiEngine.stopGeneration();
    AppState.isGenerating = false;
    const genBtn = document.getElementById('gen-btn');
    const stopBtn = document.getElementById('stop-btn');
    genBtn.disabled = false; genBtn.classList.remove('hidden');
    stopBtn.classList.add('hidden');
    this.showEmpty();
    UI.toast('Proses dihentikan.', 'warning');
  },

  updateStage(idx, text) {
    document.querySelectorAll('.progress-step').forEach((s, i) => {
      s.classList.remove('active', 'done');
      if (i < idx) s.classList.add('done');
      else if (i === idx) s.classList.add('active');
    });
    const label = document.getElementById('stage-label');
    if (label) label.textContent = text;
  },

  showGenerating(fd) {
    document.getElementById('result-body').innerHTML = `
      <div class="generating-state">
        <div class="ai-spinner">
          <span class="ai-spinner-icon">🤖</span>
        </div>
        <div style="text-align:center">
          <p class="generating-text">AI sedang menyusun RPM Anda...</p>
          <p class="generating-subtext" id="stage-label">Memulai analisis pembelajaran...</p>
          <p style="font-size:0.78rem;color:var(--text-muted);margin-top:0.5rem">
            ${UI.escHtml(fd.mapel)} • ${UI.escHtml(fd.materi)} • ${UI.escHtml(fd.model?.split('(')[0]?.trim() || '')}
          </p>
        </div>
        <div class="progress-steps">
          <div class="progress-step active"><div class="progress-step-dot"></div>Tahap 1: Analisis Konteks Pembelajaran</div>
          <div class="progress-step"><div class="progress-step-dot"></div>Tahap 2: Desain Pembelajaran & Tujuan</div>
          <div class="progress-step"><div class="progress-step-dot"></div>Tahap 3: Pengalaman Belajar Mendalam</div>
          <div class="progress-step"><div class="progress-step-dot"></div>Tahap 4: Asesmen & Rubrik Penilaian</div>
          <div class="progress-step"><div class="progress-step-dot"></div>Tahap 5: Quality Check & Finalisasi</div>
        </div>
        <p style="font-size:0.75rem;color:var(--text-muted)">⏱ Estimasi: 45–90 detik • Jangan tutup halaman</p>
      </div>
    `;
    document.getElementById('result-toolbar').innerHTML = `
      <div style="display:flex;align-items:center;gap:0.75rem;color:var(--text-secondary);font-size:0.85rem">
        <span style="animation:spin 1s linear infinite;display:inline-block;font-size:1rem">⚙️</span>
        <span>AI sedang bekerja...</span>
      </div>
      <button class="btn btn-danger btn-sm" onclick="Generator.stopGeneration()">⏹ Hentikan</button>
    `;
  },

  showEmpty() {
    document.getElementById('result-body').innerHTML = `
      <div class="empty-state">
        <div style="font-size:4rem;margin-bottom:1rem">📄</div>
        <h3>Siap Membuat RPM</h3>
        <p style="color:var(--text-muted);max-width:320px;line-height:1.6">Isi form di sebelah kiri, pilih model pembelajaran, lalu klik <strong>"Generate RPM"</strong>.</p>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;justify-content:center;margin-top:1rem">
          <span class="badge badge-primary">🤖 Gemini 2.5 Pro</span>
          <span class="badge badge-success">📋 5 Tahap Generasi</span>
          <span class="badge badge-neutral">✅ Quality Check Otomatis</span>
        </div>
      </div>
    `;
    document.getElementById('result-toolbar').innerHTML = `
      <span style="font-size:0.85rem;color:var(--text-muted)">Hasil RPM akan muncul di sini</span>
      <div id="autosave-indicator" style="font-size:0.75rem;color:var(--text-muted);opacity:0;transition:opacity 0.5s"></div>
    `;
  },

  showError(msg) {
    document.getElementById('result-body').innerHTML = `
      <div class="empty-state">
        <div style="font-size:3rem;margin-bottom:1rem">❌</div>
        <h3>Terjadi Kesalahan</h3>
        <p style="color:var(--error);font-size:0.875rem;max-width:360px;line-height:1.6">${UI.escHtml(msg)}</p>
        <div style="display:flex;gap:0.75rem;margin-top:1rem;flex-wrap:wrap;justify-content:center">
          <button class="btn btn-primary" onclick="Generator.generate()">🔄 Coba Lagi</button>
          <button class="btn btn-ghost" onclick="Generator.showEmpty()">Tutup</button>
        </div>
      </div>
    `;
  },

  displayResult(rpmDoc) {
    AppState.currentRPM = rpmDoc;
    const data = rpmDoc.rpmData;
    const fd = rpmDoc.formData;
    const qc = data?.qualityCheck;

    document.getElementById('result-toolbar').innerHTML = `
      <div style="min-width:0;flex:1">
        <div style="font-size:0.95rem;font-weight:700;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${UI.escHtml(fd?.materi || 'RPM')}</div>
        <div style="font-size:0.75rem;color:var(--text-muted);display:flex;gap:0.75rem;flex-wrap:wrap">
          <span>📚 ${UI.escHtml(fd?.mapel || '')}</span>
          <span>🎓 Fase ${UI.escHtml(fd?.fase || '')} / Kelas ${UI.escHtml(String(fd?.kelas || ''))}</span>
          ${qc?.skorKualitas ? `<span style="color:var(--success);font-weight:600">✅ QC: Skor ${UI.escHtml(qc.skorKualitas)}</span>` : ''}
        </div>
      </div>
      <div class="result-toolbar-actions">
        <button class="btn btn-ghost btn-sm" onclick="Generator.checkAndCleanLanguage()" title="Periksa & Rapikan Bahasa">✨ Rapikan Bahasa</button>
        <button class="btn btn-ghost btn-sm" onclick="Generator.regenerate()" title="Generate Ulang">🔄</button>
        <button class="btn btn-ghost btn-sm" onclick="RPMHistory.downloadPDF('${rpmDoc.id}')">📄 PDF</button>
        <button class="btn btn-success btn-sm" onclick="RPMHistory.downloadWord('${rpmDoc.id}')">📝 Word</button>
      </div>
    `;

    document.getElementById('result-body').innerHTML = RPMRenderer.render(data, fd);
  },

  async regenerate() {
    const fd = this.currentFormData || AppState.currentRPM?.formData;
    if (!fd) return;
    UI.confirm('Generate ulang RPM dengan variasi berbeda?', async () => {
      AppState.isGenerating = true;
      this.showGenerating(fd);
      try {
        const rawText = await aiEngine.generateRPMDirect(fd, AppState.currentProfile);
        const rpmData = aiEngine.parseRPMJSON(rawText);
        const rpmDoc = {
          ...(AppState.currentRPM || {}),
          id: AppState.currentRPM?.id || 'rpm_' + Date.now(),
          formData: fd, rpmData, rawText,
          updatedAt: new Date().toISOString(),
        };
        const saved = await db.saveRPM(AppState.currentUser.id, rpmDoc);
        AppState.currentRPM = saved;
        db.saveSmartTemplate(AppState.currentUser.id, fd);
        this.displayResult(saved);
        UI.toast('RPM berhasil di-regenerate! 🎉', 'success');
      } catch (err) {
        this.showError(err.message);
        UI.toast('Gagal: ' + err.message, 'error');
      }
      AppState.isGenerating = false;
    });
  },

  async checkAndCleanLanguage() {
    const rpm = AppState.currentRPM;
    if (!rpm || !rpm.rpmData) { UI.toast('Tidak ada dokumen RPM yang aktif.', 'warning'); return; }

    UI.toast('Sedang merapikan tata bahasa dan karakter...', 'info');

    // Sanitize
    rpm.rpmData = RPMSanitizer.sanitizeObject(rpm.rpmData);

    // Validate
    const check = RPMSanitizer.validateRPMData(rpm.rpmData);
    if (!check.valid) {
      UI.toast(`Peringatan: ${check.issues.join(', ')}`, 'warning', 5000);
    }

    // Save to DB
    const saved = await db.saveRPM(AppState.currentUser.id, rpm);
    AppState.currentRPM = saved;

    // Refresh display
    this.displayResult(saved);
    UI.toast('Dokumen berhasil dirapikan! ✨', 'success');
  },
};

// ─── RPM Renderer ─────────────────────────────────────────────────────────
const RPMRenderer = {
  render(data, fd) {
    if (!data) return '<div class="empty-state"><p>Data tidak valid.</p></div>';
    return `
      <div class="rpm-document">
        ${this.renderHeader(data, fd)}
        ${this.renderQC(data)}
        ${this.renderIdentifikasi(data)}
        ${this.renderDesain(data)}
        ${this.renderPengalaman(data, fd)}
        ${this.renderAsesmen(data)}
        ${this.renderRefleksi(data)}
        ${this.renderSignatures(data)}
      </div>
    `;
  },

  renderHeader(data, fd) {
    const profile = AppState.currentProfile || {};
    return `
      <div class="rpm-doc-header" style="border-bottom:2px solid var(--border);padding-bottom:1.25rem;margin-bottom:1.5rem;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);padding:1.25rem;box-shadow:var(--shadow-sm)">
        <div style="display:flex;align-items:center;gap:1.5rem;margin-bottom:1.25rem">
          ${profile.logoBase64 ? `<img src="${profile.logoBase64}" style="width:64px;height:64px;object-fit:contain;border-radius:8px;border:1px solid var(--border);padding:2px;background:white">` : '<div style="font-size:2.5rem;width:64px;height:64px;display:flex;align-items:center;justify-content:center;background:var(--primary-light);border-radius:8px">🏫</div>'}
          <div style="flex:1">
            <h2 style="font-size:1.25rem;font-weight:800;color:var(--text-primary);margin:0">${UI.escHtml(profile.namaSekolah || 'NAMA SEKOLAH')}</h2>
            <p style="font-size:0.82rem;color:var(--text-secondary);margin:2px 0 0">${UI.escHtml(profile.alamatSekolah || '')}</p>
            ${profile.npsn ? `<p style="font-size:0.78rem;color:var(--text-muted);margin:1px 0 0">NPSN: ${UI.escHtml(profile.npsn)}</p>` : ''}
          </div>
        </div>

        <div style="background:var(--gradient-navy);color:white;text-align:center;padding:0.625rem;font-weight:800;font-size:1rem;letter-spacing:0.04em;margin-bottom:1rem;border-radius:6px">
          RENCANA PELAKSANAAN PEMBELAJARAN (RPM)
        </div>

        <div class="activity-table-wrapper" style="margin-bottom:0">
          <table class="activity-table" style="font-size:0.8rem;min-width:100%">
            <tbody>
              <tr>
                <td style="font-weight:700;width:20%;background:var(--bg-hover)">Nama Guru</td>
                <td style="width:30%">${UI.escHtml(profile.namaGuru || '-')}</td>
                <td style="font-weight:700;width:20%;background:var(--bg-hover)">Mata Pelajaran</td>
                <td style="width:30%">${UI.escHtml(fd?.mapel || '-')}</td>
              </tr>
              <tr>
                <td style="font-weight:700;background:var(--bg-hover)">NIP Guru</td>
                <td>${UI.escHtml(profile.nipGuru || '-')}</td>
                <td style="font-weight:700;background:var(--bg-hover)">Fase / Kelas</td>
                <td>Fase ${UI.escHtml(fd?.fase || '-')} / Kelas ${UI.escHtml(String(fd?.kelas || '-'))}</td>
              </tr>
              <tr>
                <td style="font-weight:700;background:var(--bg-hover)">Semester</td>
                <td>Semester ${UI.escHtml(String(fd?.semester || '-'))}</td>
                <td style="font-weight:700;background:var(--bg-hover)">Alokasi Waktu</td>
                <td>${UI.escHtml(fd?.waktu || '-')}</td>
              </tr>
              <tr>
                <td style="font-weight:700;background:var(--bg-hover)">Nama Sekolah</td>
                <td>${UI.escHtml(profile.namaSekolah || '-')}</td>
                <td style="font-weight:700;background:var(--bg-hover)">Model Pembelajaran</td>
                <td>${UI.escHtml(fd?.model || '-')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderSignatures(data) {
    const profile = AppState.currentProfile || {};
    const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    return `
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);padding:1.5rem;box-shadow:var(--shadow-sm);margin-top:1.5rem;display:grid;grid-template-columns:1fr 1fr;gap:2rem;font-size:0.85rem;color:var(--text-primary)">
        <div>
          <div>Mengetahui,</div>
          <div style="font-weight:700;margin-top:0.25rem">Kepala Sekolah</div>
          <div style="height:50px"></div>
          <div style="font-weight:700;text-decoration:underline">${UI.escHtml(profile.namaKepsek || '________________________')}</div>
          <div style="font-size:0.78rem;color:var(--text-muted);margin-top:2px">NIP. ${UI.escHtml(profile.nipKepsek || '-')}</div>
        </div>
        <div>
          <div>${UI.escHtml(profile.namaKota || 'Singkawang')}, ${today}</div>
          <div style="font-weight:700;margin-top:0.25rem">Guru Mata Pelajaran</div>
          <div style="height:50px"></div>
          <div style="font-weight:700;text-decoration:underline">${UI.escHtml(profile.namaGuru || '________________________')}</div>
          <div style="font-size:0.78rem;color:var(--text-muted);margin-top:2px">NIP. ${UI.escHtml(profile.nipGuru || '-')}</div>
        </div>
      </div>
    `;
  },

  section(letter, title, body, color = null) {
    return `
      <div class="doc-section">
        <div class="doc-section-header" ${color ? `style="background:${color}"` : ''}>
          <div class="section-num">${letter}</div>
          <h3>${title}</h3>
        </div>
        <div class="doc-section-body">${body}</div>
      </div>
    `;
  },

  subsection(title, body) {
    return `<div class="doc-subsection"><div class="doc-subsection-title">${title}</div>${body}</div>`;
  },

  bulletList(items = []) {
    if (!items.length) return '<p style="color:var(--text-muted);font-size:0.85rem">Data tidak tersedia.</p>';
    return items.map(item => `
      <div class="list-item">
        <span class="list-bullet">▸</span>
        <span>${UI.escHtml(typeof item === 'string' ? item : JSON.stringify(item))}</span>
      </div>
    `).join('');
  },

  renderQC(data) {
    const qc = data.qualityCheck;
    if (!qc) return '';
    const scoreColors = { A: '#10B981', B: '#4FACFE', C: '#F59E0B' };
    const scoreColor = scoreColors[qc.skorKualitas] || '#94A3B8';
    return `
      <div style="background:linear-gradient(135deg,rgba(16,185,129,0.08),rgba(79,172,254,0.05));border:1px solid rgba(16,185,129,0.2);border-radius:var(--radius-md);padding:1.125rem 1.25rem;margin-bottom:1.5rem;display:flex;align-items:flex-start;gap:1rem">
        <div style="width:48px;height:48px;background:${scoreColor};border-radius:12px;display:flex;align-items:center;justify-content:center;color:white;font-size:1.25rem;font-weight:800;flex-shrink:0">${qc.skorKualitas || '✓'}</div>
        <div style="flex:1">
          <div style="font-weight:700;color:var(--text-primary);font-size:0.9rem;margin-bottom:0.5rem">✅ Quality Check Otomatis Selesai</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:0.5rem;font-size:0.8rem">
            ${qc.konsistensiTP ? `<div style="color:var(--text-secondary)"><strong style="color:var(--success)">TP:</strong> ${UI.escHtml(qc.konsistensiTP)}</div>` : ''}
            ${qc.kesesuaianModel ? `<div style="color:var(--text-secondary)"><strong style="color:var(--primary)">Model:</strong> ${UI.escHtml(qc.kesesuaianModel)}</div>` : ''}
            ${qc.kesesuaianAsesmen ? `<div style="color:var(--text-secondary)"><strong style="color:var(--warning)">Asesmen:</strong> ${UI.escHtml(qc.kesesuaianAsesmen)}</div>` : ''}
          </div>
        </div>
      </div>
    `;
  },

  renderIdentifikasi(data) {
    const id = data.identifikasi || {};
    let body = '';
    body += this.subsection('1. Kesiapan Murid', this.bulletList(id.kesiapanMurid));
    body += this.subsection('2. Karakteristik Materi', this.bulletList(id.karakteristikMateri));
    const dimensi = (id.dimensiProfilLulusan || []).map(d => `
      <div style="background:var(--primary-light);border-left:3px solid var(--primary);border-radius:0 var(--radius-sm) var(--radius-sm) 0;padding:0.875rem;margin-bottom:0.75rem">
        <div style="font-weight:700;color:var(--primary);margin-bottom:0.25rem">▶ ${UI.escHtml(d.dimensi || '')}</div>
        <div style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:0.2rem">${UI.escHtml(d.deskripsi || '')}</div>
        <div style="font-size:0.8rem;color:var(--text-muted)"><em>Indikator: ${UI.escHtml(d.indikator || '')}</em></div>
      </div>
    `).join('');
    body += this.subsection('3. Dimensi Profil Pelajar Pancasila', dimensi);
    return this.section('A', 'IDENTIFIKASI', body);
  },

  renderDesain(data) {
    const dp = data.desainPembelajaran || {};
    let body = '';
    const tp = (dp.tujuanPembelajaran || []).map(t => `
      <div style="background:var(--bg-input);border-radius:var(--radius);padding:1rem;margin-bottom:0.875rem;border:1px solid var(--border)">
        <div style="font-weight:700;color:var(--text-primary);margin-bottom:0.75rem">📌 TP ${t.nomor}: ${UI.escHtml(t.rumusan || '')}</div>
        ${t.smart ? `
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:0.4rem">
            ${['specific','measurable','achievable','relevant','timebound'].map(k => `
              <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:8px;padding:0.5rem">
                <div style="font-size:0.68rem;font-weight:700;color:var(--primary);text-transform:uppercase;margin-bottom:0.2rem">${k.charAt(0).toUpperCase()+k.slice(1)}</div>
                <div style="font-size:0.8rem;color:var(--text-secondary)">${UI.escHtml(t.smart[k] || '')}</div>
              </div>`).join('')}
          </div>` : ''}
      </div>
    `).join('');
    body += this.subsection('1. Tujuan Pembelajaran (SMART & ABCD)', tp);
    body += this.subsection('2. Praktik Pedagogis', this.bulletList(dp.praktikPedagogis));
    const km = (dp.kemitraanPembelajaran || []).map(k => `
      <div style="display:flex;gap:0.75rem;padding:0.75rem;background:var(--bg-input);border-radius:var(--radius-sm);margin-bottom:0.5rem">
        <span style="font-size:1.25rem;flex-shrink:0">🤝</span>
        <div><div style="font-weight:600;color:var(--text-primary)">${UI.escHtml(k.pihak||'')}</div><div style="font-size:0.82rem;color:var(--text-secondary)">Peran: ${UI.escHtml(k.peran||'')}</div><div style="font-size:0.8rem;color:var(--text-muted)">Kolaborasi: ${UI.escHtml(k.bentukKolaborasi||'')}</div></div>
      </div>`).join('');
    body += this.subsection('3. Kemitraan Pembelajaran', km);
    body += this.subsection('4. Lingkungan Belajar', this.bulletList(dp.lingkunganBelajar));
    const dig = (dp.pemanfaatanDigital || []).map(p => `
      <div style="display:flex;gap:0.875rem;padding:0.75rem;background:var(--bg-input);border-radius:var(--radius-sm);margin-bottom:0.5rem">
        <span style="font-size:1.25rem;flex-shrink:0">💻</span>
        <div><div style="font-weight:600;color:var(--primary)">${UI.escHtml(p.platform||'')}</div><div style="font-size:0.82rem;color:var(--text-secondary)">${UI.escHtml(p.fungsi||'')}</div><div style="font-size:0.8rem;color:var(--text-muted)">${UI.escHtml(p.caraPenggunaan||'')}</div></div>
      </div>`).join('');
    body += this.subsection('5. Pemanfaatan Platform Digital', dig);
    return this.section('B', 'DESAIN PEMBELAJARAN', body);
  },

  renderActivityTable(activities, cols) {
    if (!activities?.length) return '<p style="color:var(--text-muted)">Data tidak tersedia.</p>';
    return `
      <div class="activity-table-wrapper">
        <table class="activity-table">
          <thead><tr>${cols.map(c => `<th>${c.label}</th>`).join('')}</tr></thead>
          <tbody>
            ${activities.map((act, i) => `
              <tr>
                ${cols.map(c => {
                  if (c.key === 'langkah') return `<td><span class="step-num">${act.langkah || i+1}</span></td>`;
                  if (c.key === 'kalimatGuru') return `<td><div class="kalimat-guru">"${UI.escHtml(act[c.key] || '')}"</div></td>`;
                  return `<td>${UI.escHtml(act[c.key] || '')}</td>`;
                }).join('')}
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  renderPengalaman(data, fd) {
    const pb = data.pengalamanBelajar || {};
    const baseCols = [{key:'langkah',label:'No'},{key:'aktivitasGuru',label:'Aktivitas Guru'},{key:'aktivitasMurid',label:'Aktivitas Murid'},{key:'estimasiWaktu',label:'Waktu'},{key:'kalimatGuru',label:'Kalimat Guru'}];
    const intiCols = [{key:'langkah',label:'No'},{key:'fase',label:'Fase'},{key:'aktivitasGuru',label:'Aktivitas Guru'},{key:'aktivitasMurid',label:'Aktivitas Murid'},{key:'media',label:'Media'},{key:'estimasiWaktu',label:'Waktu'},{key:'kalimatGuru',label:'Kalimat Guru'},{key:'buktiKinerjaMurid',label:'Bukti Kinerja'}];
    let body = '';
    body += this.subsection(`1. Kegiatan Pendahuluan (${(pb.pendahuluan||[]).length} langkah)`, this.renderActivityTable(pb.pendahuluan, baseCols));
    body += this.subsection(`2. Kegiatan Inti — ${UI.escHtml(fd?.model||'')} (${(pb.inti||[]).length} langkah)`, this.renderActivityTable(pb.inti, intiCols));
    body += this.subsection(`3. Kegiatan Penutup (${(pb.penutup||[]).length} langkah)`, this.renderActivityTable(pb.penutup, baseCols));
    return this.section('C', 'PENGALAMAN BELAJAR', body);
  },

  renderAsesmen(data) {
    const as = data.asesmen || {};
    let body = '';
    const awalRows = (as.asesmenAwal?.pertanyaan || []).map((p, i) => `<tr><td style="font-weight:700;color:var(--primary)">${p.nomor||i+1}</td><td>${UI.escHtml(p.pertanyaan||'')}</td><td style="color:var(--text-muted);font-size:0.8rem">${UI.escHtml(p.tujuanDiagnostik||'')}</td></tr>`).join('');
    body += this.subsection('1. Asesmen Awal — Pertanyaan Pemantik', `<div style="overflow-x:auto"><table class="rubrik-table" style="min-width:500px"><thead><tr><th style="width:36px">No</th><th>Pertanyaan Pemantik</th><th>Tujuan Diagnostik</th></tr></thead><tbody>${awalRows}</tbody></table></div>`);
    const prosesRows = (as.asesmenProses?.rubrik || []).map(r => `<tr><td style="font-weight:600">${UI.escHtml(r.aspek||'')}</td><td>${UI.escHtml(r.indikator||'')}</td><td style="background:rgba(16,185,129,0.05)">${UI.escHtml(r.sangat_baik||'')}</td><td style="background:rgba(79,172,254,0.05)">${UI.escHtml(r.baik||'')}</td><td style="background:rgba(245,158,11,0.05)">${UI.escHtml(r.cukup||'')}</td><td style="background:rgba(239,68,68,0.05)">${UI.escHtml(r.perlu_bimbingan||'')}</td><td style="text-align:center;font-weight:700;color:var(--primary)">${UI.escHtml(r.bobot||'')}</td></tr>`).join('');
    body += this.subsection('2. Asesmen Proses (Formatif) — Rubrik', `<div style="overflow-x:auto"><table class="rubrik-table"><thead><tr><th>Aspek</th><th>Indikator</th><th>Sangat Baik (4)</th><th>Baik (3)</th><th>Cukup (2)</th><th>Perlu Bimbingan (1)</th><th>Bobot</th></tr></thead><tbody>${prosesRows}</tbody></table></div>`);
    const soalHtml = (as.asesmenAkhir?.soal || []).map((s, i) => `
      <div class="soal-card">
        <div class="soal-number">${s.nomor||i+1}</div>
        <div class="soal-text">${UI.escHtml(s.soal||'')}</div>
        <div class="kunci-label">📝 Kunci Jawaban:</div>
        <div class="kunci-text">${UI.escHtml(s.kunciJawaban||'')}</div>
        ${s.rubrikPenskoran ? `
          <div style="margin-top:0.75rem;padding-top:0.75rem;border-top:1px solid var(--border)">
            <div style="font-size:0.78rem;font-weight:700;color:var(--text-secondary);margin-bottom:0.5rem">📊 Rubrik:</div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:0.4rem">
              ${['skor4','skor3','skor2','skor1'].map((k,j)=>`<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:6px;padding:0.5rem"><div style="font-size:0.68rem;font-weight:700;color:${['var(--success)','var(--primary)','var(--warning)','var(--error)'][j]}">${['Skor 4','Skor 3','Skor 2','Skor 1'][j]}</div><div style="font-size:0.75rem;color:var(--text-secondary);margin-top:0.2rem">${UI.escHtml(s.rubrikPenskoran[k]||'')}</div></div>`).join('')}
            </div>
          </div>` : ''}
      </div>`).join('');
    body += this.subsection('3. Asesmen Akhir (Sumatif) — Soal Uraian HOTS', soalHtml);
    return this.section('D', 'ASESMEN', body);
  },

  renderRefleksi(data) {
    const ref = data.refleksi || {};
    let body = '';
    if (ref.guruRefleksi?.length) body += this.subsection('Refleksi Guru', this.bulletList(ref.guruRefleksi));
    if (ref.muridRefleksi?.length) body += this.subsection('Refleksi Murid', this.bulletList(ref.muridRefleksi));
    if (ref.pelibatanKeluarga) body += this.subsection('Pelibatan Keluarga', `<div style="background:var(--primary-light);border-left:3px solid var(--primary);border-radius:0 var(--radius-sm) var(--radius-sm) 0;padding:0.875rem;font-size:0.875rem;color:var(--text-secondary)">🏠 ${UI.escHtml(ref.pelibatanKeluarga)}</div>`);
    if (ref.tindakLanjut) body += this.subsection('Tindak Lanjut', `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.875rem">
        <div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);border-radius:var(--radius-sm);padding:0.875rem">
          <div style="font-weight:700;color:var(--success);font-size:0.82rem;margin-bottom:0.4rem">📈 Pengayaan</div>
          <div style="font-size:0.83rem;color:var(--text-secondary)">${UI.escHtml(ref.tindakLanjut.pengayaan||'')}</div>
        </div>
        <div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:var(--radius-sm);padding:0.875rem">
          <div style="font-weight:700;color:var(--warning);font-size:0.82rem;margin-bottom:0.4rem">🔄 Remedial</div>
          <div style="font-size:0.83rem;color:var(--text-secondary)">${UI.escHtml(ref.tindakLanjut.remedial||'')}</div>
        </div>
      </div>`);
    return this.section('E', 'REFLEKSI & TINDAK LANJUT', body);
  },
};

// ─── RPM History ────────────────────────────────────────────────────────────
const RPMHistory = {
  allRPM: [],

  async render() {
    UI.showPage('page-history');
    UI.updatePageTitle('Riwayat RPM', 'Semua RPM yang pernah dibuat');
    this.allRPM = await db.getRPMList(AppState.currentUser.id);
    this.renderList(this.allRPM);
  },

  renderList(list) {
    const c = document.getElementById('history-list');
    if (!c) return;
    if (!list.length) {
      c.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div style="font-size:3rem">📂</div><h3>Belum ada RPM</h3><p>Buat RPM pertama Anda!</p><button class="btn btn-primary" onclick="Router.navigate('generator')">✨ Buat RPM</button></div>`;
      return;
    }
    c.innerHTML = list.map(rpm => `
      <div class="rpm-card">
        <div class="rpm-card-header" onclick="RPMHistory.openRPM('${rpm.id}')">
          <span class="rpm-card-header-icon">📋</span>
          <div class="rpm-card-header-text">
            <h4>${UI.escHtml(rpm.formData?.materi || 'RPM')}</h4>
            <span>${UI.escHtml(rpm.formData?.mapel || '-')}</span>
          </div>
        </div>
        <div class="rpm-card-body">
          <div class="rpm-card-meta">
            <span class="badge badge-primary">Fase ${UI.escHtml(rpm.formData?.fase||'-')}</span>
            <span class="badge badge-neutral">Kelas ${UI.escHtml(String(rpm.formData?.kelas||'-'))}</span>
            <span class="badge badge-neutral">Sem. ${UI.escHtml(String(rpm.formData?.semester||'-'))}</span>
          </div>
          <div style="font-size:0.78rem;color:var(--text-muted);margin-top:0.25rem">🤖 ${UI.escHtml(rpm.formData?.model?.split('(')[0]?.trim()||'-')}</div>
          <div style="font-size:0.75rem;color:var(--text-muted);margin-top:0.2rem">📅 ${UI.formatDateTime(rpm.createdAt)}</div>
        </div>
        <div class="rpm-card-actions">
          <button class="btn btn-primary btn-sm" style="flex:1" onclick="RPMHistory.openRPM('${rpm.id}')">👁️ Buka</button>
          <button class="btn btn-ghost btn-sm" onclick="RPMHistory.downloadPDF('${rpm.id}')" title="PDF">📄</button>
          <button class="btn btn-success btn-sm" onclick="RPMHistory.downloadWord('${rpm.id}')" title="Word">📝</button>
          <button class="btn btn-danger btn-sm btn-icon" onclick="RPMHistory.deleteRPM('${rpm.id}')" title="Hapus">🗑</button>
        </div>
      </div>
    `).join('');
  },

  async openRPM(id) {
    const rpm = await db.getRPM(id);
    if (!rpm) { UI.toast('RPM tidak ditemukan.', 'error'); return; }
    AppState.currentRPM = rpm;
    Generator.currentFormData = rpm.formData;
    Router.navigate('generator');
  },

  async downloadPDF(id) {
    try {
      const rpm = id === AppState.currentRPM?.id ? AppState.currentRPM : await db.getRPM(id);
      if (!rpm) { UI.toast('Data tidak ditemukan.', 'error'); return; }

      // Sanitasi otomatis sebelum ekspor
      rpm.rpmData = RPMSanitizer.sanitizeObject(rpm.rpmData);

      // Simpan perbaikan sanitasi ke DB
      await db.saveRPM(AppState.currentUser.id, rpm);

      // Validasi struktur
      const check = RPMSanitizer.validateRPMData(rpm.rpmData);
      if (!check.valid) {
        console.warn('Masalah validasi terdeteksi namun dibersihkan otomatis:', check.issues);
      }

      UI.toast('Menyiapkan PDF...', 'info');
      await exportEngine.exportPDF(rpm, AppState.currentProfile);
      db.logDownload(AppState.currentUser.id, id, 'pdf');
      UI.toast('PDF berhasil diunduh! 📄', 'success');
    } catch (err) { UI.toast('Gagal: ' + err.message, 'error'); }
  },

  async downloadWord(id) {
    try {
      const rpm = id === AppState.currentRPM?.id ? AppState.currentRPM : await db.getRPM(id);
      if (!rpm) { UI.toast('Data tidak ditemukan.', 'error'); return; }

      // Sanitasi otomatis sebelum ekspor
      rpm.rpmData = RPMSanitizer.sanitizeObject(rpm.rpmData);

      // Simpan perbaikan sanitasi ke DB
      await db.saveRPM(AppState.currentUser.id, rpm);

      UI.toast('Menyiapkan Word...', 'info');
      await exportEngine.exportWord(rpm, AppState.currentProfile);
      db.logDownload(AppState.currentUser.id, id, 'word');
      UI.toast('Word berhasil diunduh! 📝', 'success');
    } catch (err) { UI.toast('Gagal: ' + err.message, 'error'); }
  },

  async deleteRPM(id) {
    UI.confirm('Hapus RPM ini secara permanen?', async () => {
      await db.deleteRPM(id);
      if (AppState.currentRPM?.id === id) AppState.currentRPM = null;
      this.allRPM = this.allRPM.filter(r => r.id !== id);
      this.renderList(this.allRPM);
      UI.toast('RPM dihapus.', 'success');
    });
  },

  filterByMapel(mapel) {
    this.renderList(mapel ? this.allRPM.filter(r => r.formData?.mapel === mapel) : this.allRPM);
  },
};

// ─── Settings ───────────────────────────────────────────────────────────────
const Settings = {
  render() {
    UI.showPage('page-settings');
    UI.updatePageTitle('Pengaturan', 'Kelola profil Anda');
    const user = AppState.currentUser;
    const profile = AppState.currentProfile || {};

    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
    setVal('s-nama-sekolah', profile.namaSekolah);
    setVal('s-npsn', profile.npsn);
    setVal('s-kota', profile.namaKota);
    setVal('s-alamat', profile.alamatSekolah);
    setVal('s-telepon', profile.teleponSekolah);
    setVal('s-email-sekolah', profile.emailSekolah);
    setVal('s-nama-guru', profile.namaGuru);
    setVal('s-nip-guru', profile.nipGuru);
    setVal('s-nama-kepsek', profile.namaKepsek);
    setVal('s-nip-kepsek', profile.nipKepsek);
    setVal('s-mapel', profile.mapelUtama);
    setVal('s-user-email', user.email);
    setVal('s-user-password', '');

    const faseEl = document.getElementById('s-fase');
    if (faseEl && profile.faseSering) faseEl.value = profile.faseSering;
    const kelasEl = document.getElementById('s-kelas');
    if (kelasEl && profile.kelasSering) kelasEl.value = profile.kelasSering;

    if (profile.logoBase64) {
      const img = document.getElementById('s-logo-preview');
      if (img) { img.src = profile.logoBase64; img.classList.remove('hidden'); }
    }

    ThemeManager.apply(AppState.theme);
  },

  saveSchool() {
    const user = AppState.currentUser;
    const profile = AppState.currentProfile || {};
    const updated = {
      ...profile,
      namaSekolah: document.getElementById('s-nama-sekolah').value.trim(),
      npsn: document.getElementById('s-npsn').value.trim(),
      namaKota: document.getElementById('s-kota').value.trim(),
      alamatSekolah: document.getElementById('s-alamat').value.trim(),
      teleponSekolah: document.getElementById('s-telepon').value.trim(),
      emailSekolah: document.getElementById('s-email-sekolah').value.trim(),
    };
    db.saveProfile(user.id, updated);
    AppState.currentProfile = updated;
    UI.updateUserUI();
    UI.toast('Data sekolah tersimpan! 🏫', 'success');
  },

  saveGuru() {
    const user = AppState.currentUser;
    const profile = AppState.currentProfile || {};
    const updated = {
      ...profile,
      namaGuru: document.getElementById('s-nama-guru').value.trim(),
      nipGuru: document.getElementById('s-nip-guru').value.trim(),
      namaKepsek: document.getElementById('s-nama-kepsek').value.trim(),
      nipKepsek: document.getElementById('s-nip-kepsek').value.trim(),
      faseSering: document.getElementById('s-fase').value,
      kelasSering: document.getElementById('s-kelas').value,
      mapelUtama: document.getElementById('s-mapel').value,
    };
    db.saveProfile(user.id, updated);
    AppState.currentProfile = updated;
    db.updateUser(user.id, { namaLengkap: updated.namaGuru });
    AppState.currentUser = db.getCurrentUser();
    UI.updateUserUI();
    UI.toast('Data guru tersimpan! 👤', 'success');
  },

  changeLogo() { document.getElementById('s-logo-input')?.click(); },
  handleLogoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target.result;
      const profile = AppState.currentProfile || {};
      const updated = { ...profile, logoBase64: base64 };
      db.saveProfile(AppState.currentUser.id, updated);
      AppState.currentProfile = updated;
      const img = document.getElementById('s-logo-preview');
      if (img) { img.src = base64; img.classList.remove('hidden'); }
      UI.toast('Logo berhasil diperbarui!', 'success');
    };
    reader.readAsDataURL(file);
  },

  changePassword() {
    const user = AppState.currentUser;
    const pwInput = document.getElementById('s-user-password');
    const pw = pwInput?.value.trim();
    if (!pw) { UI.toast('Masukkan password baru terlebih dahulu.', 'error'); return; }
    if (pw.length < 6) { UI.toast('Password minimal 6 karakter.', 'error'); return; }

    const success = db.adminResetPassword(user.id, pw);
    if (success) {
      if (pwInput) pwInput.value = '';
      AppState.currentUser = db.getCurrentUser();
      UI.toast('Password Anda berhasil diubah! 🔒', 'success');
    } else {
      UI.toast('Gagal mengubah password.', 'error');
    }
  },
};

// ─── Admin Panel ─────────────────────────────────────────────────────────────
const Admin = {
  async render() {
    UI.showPage('page-admin');
    UI.updatePageTitle('Admin Panel', 'Kelola platform Sahabat Guru Mengajar');
    const stats = await db.getPlatformStats();

    document.getElementById('admin-total-users').textContent = stats.totalUsers;
    document.getElementById('admin-active-users').textContent = stats.activeUsers;
    document.getElementById('admin-total-rpm').textContent = stats.totalRPM;
    document.getElementById('admin-rpm-month').textContent = stats.rpmThisMonth;

    // AI Status di admin
    const apiStatusEl = document.getElementById('admin-api-status');
    if (apiStatusEl) {
      apiStatusEl.innerHTML = stats.hasApiKey
        ? `<span class="badge badge-success">🟢 API Key Aktif</span>`
        : `<span class="badge badge-error">🔴 API Key Belum Diatur</span>`;
    }

    // Show current API key (masked)
    const apiKeyInput = document.getElementById('admin-api-key');
    if (apiKeyInput) {
      const key = db.getSharedApiKey();
      apiKeyInput.value = key ? key.slice(0, 8) + '...' + key.slice(-4) : '';
      apiKeyInput.placeholder = key ? 'API Key sudah diatur' : 'Masukkan Gemini API Key...';
    }

    this.renderUsersTable();
  },

  async saveApiKey() {
    const inputEl = document.getElementById('admin-api-key-input');
    const newKey = inputEl.value.trim();
    if (!newKey) { UI.toast('Masukkan API Key terlebih dahulu.', 'error'); return; }

    // Validasi panjang
    if (newKey.length < 20) {
      UI.toast('API Key terlalu pendek. Panjang minimal 20 karakter.', 'warning');
      return;
    }

    // Validasi prefix (AIza atau AQ)
    if (!newKey.startsWith('AIza') && !newKey.startsWith('AQ')) {
      UI.toast('Format API Key tidak valid. Harus diawali "AIza" atau "AQ".', 'warning');
      return;
    }

    // Dapatkan button untuk loading state
    const btn = document.querySelector('button[onclick="Admin.saveApiKey()"]');
    const originalText = btn ? btn.innerHTML : '💾 Simpan API Key';

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span style="animation:spin 1s linear infinite;display:inline-block">⏳</span> Memverifikasi...';
    }

    UI.toast('Sedang memverifikasi API Key ke Google Gemini...', 'info');

    const verification = await aiEngine.testApiKey(newKey);

    if (verification.success) {
      db.saveSharedApiKey(newKey);
      inputEl.value = '';
      UI.toast('API Key valid dan berhasil disimpan! Semua pengguna kini dapat menggunakan AI. 🎉', 'success', 5000);
      await this.render();
    } else {
      UI.toast(`Verifikasi Gagal: ${verification.message}`, 'error', 6000);
    }

    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  },

  renderUsersTable() {
    const tbody = document.getElementById('admin-users-tbody');
    if (!tbody) return;
    tbody.innerHTML = db.getAllUsers().map(u => `
      <tr>
        <td>
          <div style="font-weight:600">${UI.escHtml(u.namaLengkap||'-')}</div>
          <div style="font-size:0.75rem;color:var(--text-muted)">${UI.escHtml(u.email)}</div>
        </td>
        <td>${UI.formatDate(u.createdAt)}</td>
        <td><span class="badge ${u.isActive?'badge-success':'badge-error'}">${u.isActive?'Aktif':'Nonaktif'}</span></td>
        <td>${db.isAdmin(u.email)?'<span class="badge badge-warning">Admin</span>':'<span class="badge badge-neutral">Guru</span>'}</td>
        <td>
          <div style="display:flex;gap:0.4rem;flex-wrap:wrap">
            <button class="btn btn-ghost btn-sm" onclick="Admin.toggleActive('${u.id}',${u.isActive})">${u.isActive?'⏸ Nonaktif':'▶ Aktif'}</button>
            <button class="btn btn-ghost btn-sm" onclick="Admin.resetPwPrompt('${u.id}')">🔑</button>
            ${!db.isAdmin(u.email)?`<button class="btn btn-danger btn-sm" onclick="Admin.deleteUser('${u.id}')">🗑</button>`:''}
          </div>
        </td>
      </tr>
    `).join('');
  },

  toggleActive(userId, isActive) {
    db.adminUpdateUser(userId, { isActive: !isActive });
    UI.toast('Status diperbarui.', 'success');
    this.renderUsersTable();
  },

  resetPwPrompt(userId) {
    const modal = document.getElementById('reset-password-modal');
    modal.classList.remove('hidden');
    document.getElementById('reset-pw-confirm').onclick = () => {
      const pw = document.getElementById('reset-pw-input').value;
      if (!pw || pw.length < 6) { UI.toast('Password minimal 6 karakter.', 'error'); return; }
      db.adminResetPassword(userId, pw);
      modal.classList.add('hidden');
      document.getElementById('reset-pw-input').value = '';
      UI.toast('Password direset.', 'success');
    };
  },

  deleteUser(userId) {
    UI.confirm('Hapus akun ini secara permanen?', () => {
      db.adminDeleteUser(userId);
      this.renderUsersTable();
      UI.toast('Akun dihapus.', 'success');
    });
  },

  addUser(e) {
    e.preventDefault();
    const namaLengkap = document.getElementById('admin-new-name').value.trim();
    const email = document.getElementById('admin-new-email').value.trim();
    const password = document.getElementById('admin-new-password').value;

    if (!namaLengkap || !email || !password) { UI.toast('Semua field wajib diisi.', 'error'); return; }
    if (password.length < 6) { UI.toast('Password minimal 6 karakter.', 'error'); return; }

    const result = db.registerUser({ namaLengkap, email, password });
    if (result.success) {
      UI.toast('Akun guru berhasil didaftarkan! 🎉', 'success');
      document.getElementById('admin-new-name').value = '';
      document.getElementById('admin-new-email').value = '';
      document.getElementById('admin-new-password').value = '';
      this.render();
    } else {
      UI.toast(result.message, 'error');
    }
  },
};

// ─── Init App ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  Router.register('dashboard', () => Dashboard.render());
  Router.register('generator', () => Generator.render());
  Router.register('history', () => RPMHistory.render());
  Router.register('settings', () => Settings.render());
  Router.register('admin', () => Admin.render());

  ThemeManager.init();
  Auth.init();

  // Keyboard: Escape to close modals/sidebar
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
      if (AppState.sidebarOpen) UI.closeSidebar();
    }
  });
});
