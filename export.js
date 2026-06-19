/**
 * SAHABAT GURU MENGAJAR
 * Export Engine — PDF + Microsoft Word
 */

class ExportEngine {
  constructor() {
    this.jsPDFLoaded = false;
    this.docxLoaded = false;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  async loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  formatDate(iso) {
    const d = new Date(iso || Date.now());
    return d.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  // ─── PDF Export ───────────────────────────────────────────────────────────
  async exportPDF(rpmDoc, profile) {
    await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // Colors
    const PRIMARY = [79, 172, 254];
    const NAVY = [15, 23, 42];
    const GRAY = [100, 116, 139];
    const LIGHT = [248, 250, 252];

    let y = 10;
    const pageW = 210;
    const margin = 18;
    const contentW = pageW - 2 * margin;

    const addPage = () => { doc.addPage(); y = 18; };
    const checkPage = (needed = 20) => { if (y + needed > 280) addPage(); };

    // ── Header ──
    // Logo area
    if (profile?.logoBase64) {
      try {
        doc.addImage(profile.logoBase64, 'PNG', margin, y, 22, 22);
      } catch { /* skip */ }
    }

    // School header
    doc.setFillColor(...PRIMARY);
    doc.roundedRect(margin + 26, y, contentW - 26, 24, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(profile?.namaSekolah || 'SEKOLAH', margin + 30, y + 9);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(profile?.alamatSekolah || '', margin + 30, y + 15);
    if (profile?.npsn) doc.text('NPSN: ' + profile.npsn, margin + 30, y + 20);

    y += 28;

    // Title
    doc.setFillColor(...NAVY);
    doc.rect(margin, y, contentW, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('RENCANA PELAKSANAAN PEMBELAJARAN (RPM)', pageW / 2, y + 8, { align: 'center' });
    y += 16;

    // Info table
    doc.setTextColor(...NAVY);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    const infoData = [
      ['Nama Guru', profile?.namaGuru || '-', 'Mata Pelajaran', rpmDoc.formData?.mapel || '-'],
      ['NIP', profile?.nipGuru || '-', 'Fase / Kelas', `${rpmDoc.formData?.fase || '-'} / ${rpmDoc.formData?.kelas || '-'}`],
      ['Semester', rpmDoc.formData?.semester || '-', 'Alokasi Waktu', rpmDoc.formData?.waktu || '-'],
      ['Materi', rpmDoc.formData?.materi || '-', 'Model', rpmDoc.formData?.model || '-'],
    ];

    doc.autoTable({
      startY: y,
      head: [],
      body: infoData,
      margin: { left: margin, right: margin },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 32, fillColor: LIGHT },
        1: { cellWidth: 55 },
        2: { fontStyle: 'bold', cellWidth: 32, fillColor: LIGHT },
        3: { cellWidth: 55 },
      },
      styles: { fontSize: 8.5, cellPadding: 2.5, lineColor: [226, 232, 240], lineWidth: 0.3 },
      theme: 'grid',
    });

    y = doc.lastAutoTable.finalY + 6;

    const data = rpmDoc.rpmData;
    if (!data) { doc.save(`RPM_${rpmDoc.formData?.materi || 'dokumen'}.pdf`); return; }

    // ── Section helper ──
    const sectionTitle = (title) => {
      checkPage(14);
      doc.setFillColor(...PRIMARY);
      doc.roundedRect(margin, y, contentW, 8, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(title, margin + 4, y + 5.5);
      doc.setTextColor(...NAVY);
      doc.setFont('helvetica', 'normal');
      y += 11;
    };

    const subTitle = (title) => {
      checkPage(10);
      doc.setFillColor(226, 232, 240);
      doc.rect(margin, y, contentW, 7, 'F');
      doc.setTextColor(...NAVY);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(title, margin + 3, y + 4.8);
      doc.setFont('helvetica', 'normal');
      y += 9;
    };

    const bullet = (text, indent = 0) => {
      checkPage(8);
      const lines = doc.splitTextToSize(`• ${text}`, contentW - indent - 6);
      doc.setFontSize(8.5);
      doc.setTextColor(...NAVY);
      doc.text(lines, margin + indent + 3, y);
      y += lines.length * 4.5 + 1;
    };

    const numberedItem = (n, text, indent = 0) => {
      checkPage(8);
      const lines = doc.splitTextToSize(`${n}. ${text}`, contentW - indent - 6);
      doc.setFontSize(8.5);
      doc.setTextColor(...NAVY);
      doc.text(lines, margin + indent + 3, y);
      y += lines.length * 4.5 + 1;
    };

    const para = (text) => {
      checkPage(8);
      const lines = doc.splitTextToSize(text, contentW - 6);
      doc.setFontSize(8.5);
      doc.setTextColor(...GRAY);
      doc.text(lines, margin + 3, y);
      y += lines.length * 4.5 + 2;
    };

    // ── A. IDENTIFIKASI ──
    sectionTitle('A. IDENTIFIKASI');

    subTitle('1. Kesiapan Murid');
    (data.identifikasi?.kesiapanMurid || []).forEach(p => bullet(p));
    y += 2;

    subTitle('2. Karakteristik Materi');
    (data.identifikasi?.karakteristikMateri || []).forEach(p => bullet(p));
    y += 2;

    subTitle('3. Dimensi Profil Pelajar Pancasila');
    (data.identifikasi?.dimensiProfilLulusan || []).forEach(d => {
      checkPage(16);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...PRIMARY);
      doc.text(`▶ ${d.dimensi}`, margin + 3, y); y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...NAVY);
      para(d.deskripsi);
      doc.setTextColor(...GRAY);
      para('Indikator: ' + d.indikator);
      y += 1;
    });

    // ── B. DESAIN PEMBELAJARAN ──
    sectionTitle('B. DESAIN PEMBELAJARAN');

    subTitle('1. Tujuan Pembelajaran (Format SMART & ABCD)');
    (data.desainPembelajaran?.tujuanPembelajaran || []).forEach((tp, i) => {
      checkPage(20);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...NAVY);
      doc.text(`TP ${tp.nomor || i + 1}: ${tp.rumusan || ''}`, margin + 3, y);
      y += 5;
      if (tp.smart) {
        const smartItems = [
          ['S-Specific', tp.smart.specific],
          ['M-Measurable', tp.smart.measurable],
          ['A-Achievable', tp.smart.achievable],
          ['R-Relevant', tp.smart.relevant],
          ['T-Time Bound', tp.smart.timebound],
        ];
        smartItems.forEach(([label, val]) => {
          checkPage(6);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...PRIMARY);
          doc.text(`  ${label}: `, margin + 5, y);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...GRAY);
          const x = margin + 5 + doc.getTextWidth(`  ${label}: `);
          const lines = doc.splitTextToSize(val || '', contentW - x + margin - 3);
          doc.text(lines, x, y);
          y += lines.length * 4 + 1;
        });
      }
      y += 2;
    });

    subTitle('2. Praktik Pedagogis');
    (data.desainPembelajaran?.praktikPedagogis || []).forEach(p => bullet(p));
    y += 2;

    subTitle('3. Kemitraan Pembelajaran');
    (data.desainPembelajaran?.kemitraanPembelajaran || []).forEach(k => {
      checkPage(12);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...NAVY);
      doc.text(`• ${k.pihak}`, margin + 3, y); y += 4.5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...GRAY);
      para(`  Peran: ${k.peran}`);
      para(`  Bentuk: ${k.bentukKolaborasi}`);
      y += 1;
    });

    subTitle('4. Lingkungan Belajar');
    (data.desainPembelajaran?.lingkunganBelajar || []).forEach(l => bullet(l));
    y += 2;

    subTitle('5. Pemanfaatan Platform Digital');
    const digitalData = (data.desainPembelajaran?.pemanfaatanDigital || []).map(p => [
      p.platform, p.fungsi, p.caraPenggunaan
    ]);
    if (digitalData.length) {
      doc.autoTable({
        startY: y,
        head: [['Platform/Aplikasi', 'Fungsi', 'Cara Penggunaan']],
        body: digitalData,
        margin: { left: margin, right: margin },
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: PRIMARY, textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: LIGHT },
        theme: 'grid',
      });
      y = doc.lastAutoTable.finalY + 6;
    }

    // ── C. PENGALAMAN BELAJAR ──
    sectionTitle('C. PENGALAMAN BELAJAR');

    // Pendahuluan
    subTitle('1. Kegiatan Pendahuluan');
    const pendData = (data.pengalamanBelajar?.pendahuluan || []).map(l => [
      l.langkah,
      l.aktivitasGuru || '',
      l.aktivitasMurid || '',
      l.estimasiWaktu || '',
      l.kalimatGuru || '',
    ]);
    if (pendData.length) {
      doc.autoTable({
        startY: y,
        head: [['No', 'Aktivitas Guru', 'Aktivitas Murid', 'Waktu', 'Kalimat Guru']],
        body: pendData,
        margin: { left: margin, right: margin },
        columnStyles: {
          0: { cellWidth: 8 },
          1: { cellWidth: 38 },
          2: { cellWidth: 38 },
          3: { cellWidth: 16 },
          4: { cellWidth: 70 },
        },
        styles: { fontSize: 7.5, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [79, 172, 254], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: LIGHT },
        theme: 'grid',
      });
      y = doc.lastAutoTable.finalY + 6;
    }

    // Inti
    subTitle('2. Kegiatan Inti');
    const intiData = (data.pengalamanBelajar?.inti || []).map(l => [
      l.langkah,
      l.fase || '',
      l.aktivitasGuru || '',
      l.aktivitasMurid || '',
      l.estimasiWaktu || '',
      l.kalimatGuru || '',
      l.buktiKinerjaMurid || '',
    ]);
    if (intiData.length) {
      doc.autoTable({
        startY: y,
        head: [['No', 'Fase', 'Aktivitas Guru', 'Aktivitas Murid', 'Waktu', 'Kalimat Guru', 'Bukti Kinerja']],
        body: intiData,
        margin: { left: margin, right: margin },
        columnStyles: {
          0: { cellWidth: 7 },
          1: { cellWidth: 22 },
          2: { cellWidth: 28 },
          3: { cellWidth: 28 },
          4: { cellWidth: 12 },
          5: { cellWidth: 43 },
          6: { cellWidth: 30 },
        },
        styles: { fontSize: 7, cellPadding: 1.8, overflow: 'linebreak' },
        headStyles: { fillColor: [79, 172, 254], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: LIGHT },
        theme: 'grid',
      });
      y = doc.lastAutoTable.finalY + 6;
    }

    // Penutup
    subTitle('3. Kegiatan Penutup');
    const penutupData = (data.pengalamanBelajar?.penutup || []).map(l => [
      l.langkah,
      l.aktivitasGuru || '',
      l.aktivitasMurid || '',
      l.estimasiWaktu || '',
      l.kalimatGuru || '',
    ]);
    if (penutupData.length) {
      doc.autoTable({
        startY: y,
        head: [['No', 'Aktivitas Guru', 'Aktivitas Murid', 'Waktu', 'Kalimat Guru']],
        body: penutupData,
        margin: { left: margin, right: margin },
        columnStyles: {
          0: { cellWidth: 8 },
          1: { cellWidth: 38 },
          2: { cellWidth: 38 },
          3: { cellWidth: 16 },
          4: { cellWidth: 70 },
        },
        styles: { fontSize: 7.5, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [79, 172, 254], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: LIGHT },
        theme: 'grid',
      });
      y = doc.lastAutoTable.finalY + 6;
    }

    // ── D. ASESMEN ──
    sectionTitle('D. ASESMEN');

    // Asesmen Awal
    subTitle('1. Asesmen Awal (Diagnostik)');
    const awalPertanyaan = (data.asesmen?.asesmenAwal?.pertanyaan || []).map(p => [
      p.nomor, p.pertanyaan || '', p.tujuanDiagnostik || ''
    ]);
    if (awalPertanyaan.length) {
      doc.autoTable({
        startY: y,
        head: [['No', 'Pertanyaan Pemantik', 'Tujuan Diagnostik']],
        body: awalPertanyaan,
        margin: { left: margin, right: margin },
        columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 90 }, 2: { cellWidth: 74 } },
        styles: { fontSize: 8, cellPadding: 2.5, overflow: 'linebreak' },
        headStyles: { fillColor: PRIMARY, textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: LIGHT },
        theme: 'grid',
      });
      y = doc.lastAutoTable.finalY + 6;
    }

    // Asesmen Proses
    subTitle('2. Asesmen Proses (Formatif)');
    const prosesData = (data.asesmen?.asesmenProses?.rubrik || []).map(r => [
      r.aspek, r.indikator, r.sangat_baik, r.baik, r.cukup, r.perlu_bimbingan, r.bobot
    ]);
    if (prosesData.length) {
      doc.autoTable({
        startY: y,
        head: [['Aspek', 'Indikator', 'Sangat Baik (4)', 'Baik (3)', 'Cukup (2)', 'Perlu Bimbingan (1)', 'Bobot']],
        body: prosesData,
        margin: { left: margin, right: margin },
        styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: PRIMARY, textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: LIGHT },
        theme: 'grid',
      });
      y = doc.lastAutoTable.finalY + 6;
    }

    // Asesmen Akhir
    subTitle('3. Asesmen Akhir (Sumatif)');
    (data.asesmen?.asesmenAkhir?.soal || []).forEach((s, i) => {
      checkPage(30);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...NAVY);
      const soalLines = doc.splitTextToSize(`${s.nomor || i + 1}. ${s.soal}`, contentW - 6);
      doc.text(soalLines, margin + 3, y);
      y += soalLines.length * 4.5 + 2;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...PRIMARY);
      doc.text('Kunci Jawaban:', margin + 6, y); y += 4.5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...GRAY);
      const kunciLines = doc.splitTextToSize(s.kunciJawaban || '', contentW - 12);
      doc.text(kunciLines, margin + 6, y);
      y += kunciLines.length * 4.5 + 4;
    });

    // ── Refleksi ──
    sectionTitle('E. REFLEKSI & TINDAK LANJUT');
    const ref = data.refleksi || {};
    if (ref.guruRefleksi?.length) {
      subTitle('Refleksi Guru');
      ref.guruRefleksi.forEach(r => bullet(r));
      y += 2;
    }
    if (ref.muridRefleksi?.length) {
      subTitle('Refleksi Murid');
      ref.muridRefleksi.forEach(r => bullet(r));
      y += 2;
    }
    if (ref.pelibatanKeluarga) {
      subTitle('Pelibatan Keluarga');
      para(ref.pelibatanKeluarga);
      y += 2;
    }
    if (ref.tindakLanjut) {
      subTitle('Tindak Lanjut');
      if (ref.tindakLanjut.pengayaan) { bullet('Pengayaan: ' + ref.tindakLanjut.pengayaan); }
      if (ref.tindakLanjut.remedial) { bullet('Remedial: ' + ref.tindakLanjut.remedial); }
    }

    // ── Signature ──
    checkPage(40);
    y += 8;
    const dateStr = this.formatDate(rpmDoc.createdAt);
    doc.setFontSize(9);
    doc.setTextColor(...NAVY);
    doc.text(`Mengetahui,`, margin, y);
    doc.text(`${profile?.namaKota || 'Singkawang'}, ${dateStr}`, margin + 100, y);
    y += 5;
    doc.text('Kepala Sekolah', margin, y);
    doc.text('Guru Mata Pelajaran', margin + 100, y);
    y += 24;
    doc.setFont('helvetica', 'bold');
    doc.text(profile?.namaKepsek || '________________________', margin, y);
    doc.text(profile?.namaGuru || '________________________', margin + 100, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text(`NIP. ${profile?.nipKepsek || '-'}`, margin, y);
    doc.text(`NIP. ${profile?.nipGuru || '-'}`, margin + 100, y);

    // Page numbers
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(...GRAY);
      doc.text(`Halaman ${i} dari ${pageCount}`, pageW / 2, 292, { align: 'center' });
      doc.text('SAHABAT GURU MENGAJAR — Dibuat dengan AI', pageW / 2, 295, { align: 'center' });
    }

    const filename = `RPM_${(rpmDoc.formData?.mapel || 'dokumen').replace(/\s+/g, '_')}_${(rpmDoc.formData?.materi || '').replace(/\s+/g, '_').slice(0, 30)}.pdf`;
    doc.save(filename);
  }

  // ─── Word Export ──────────────────────────────────────────────────────────
  async exportWord(rpmDoc, profile) {
    await this.loadScript('https://unpkg.com/docx@8.5.0/build/index.js');

    const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun,
      AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType } = window.docx;

    const data = rpmDoc.rpmData;
    const f = rpmDoc.formData || {};

    const NAVY_HEX = '0F172A';
    const BLUE_HEX = '4FACFE';
    const GRAY_HEX = '64748B';

    const heading = (text, level = 1) => new Paragraph({
      text,
      heading: level === 1 ? HeadingLevel.HEADING_1 : level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
      spacing: { before: 200, after: 100 },
    });

    const para = (text, bold = false, color = NAVY_HEX) => new Paragraph({
      children: [new TextRun({ text, bold, color, font: 'Arial', size: 22 })],
      spacing: { after: 60 },
    });

    const bullet = (text) => new Paragraph({
      children: [new TextRun({ text: `• ${text}`, font: 'Arial', size: 22, color: NAVY_HEX })],
      spacing: { after: 40 },
      indent: { left: 360 },
    });

    const tableCell = (text, header = false, width = 2000) => new TableCell({
      children: [new Paragraph({
        children: [new TextRun({
          text: text || '',
          font: 'Arial',
          size: 18,
          bold: header,
          color: header ? 'FFFFFF' : NAVY_HEX,
        })],
      })],
      width: { size: width, type: WidthType.DXA },
      shading: header ? { type: ShadingType.CLEAR, fill: BLUE_HEX } : undefined,
    });

    const children = [];

    // Title
    children.push(new Paragraph({
      children: [new TextRun({
        text: 'RENCANA PELAKSANAAN PEMBELAJARAN (RPM)',
        bold: true, font: 'Arial', size: 28, color: NAVY_HEX,
      })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }));

    // School info
    children.push(para(`Sekolah: ${profile?.namaSekolah || '-'}`, true));
    children.push(para(`Guru: ${profile?.namaGuru || '-'}   |   NIP: ${profile?.nipGuru || '-'}`, false));
    children.push(para(`Mata Pelajaran: ${f.mapel || '-'}   |   Fase/Kelas: ${f.fase || '-'}/${f.kelas || '-'}   |   Semester: ${f.semester || '-'}`, false));
    children.push(para(`Materi: ${f.materi || '-'}   |   Alokasi Waktu: ${f.waktu || '-'}   |   Model: ${f.model || '-'}`, false));
    children.push(new Paragraph({ text: '', spacing: { after: 200 } }));

    if (!data) {
      const buf = await Packer.toBlob(new Document({ sections: [{ children }] }));
      this._downloadBlob(buf, 'RPM.docx');
      return;
    }

    // A. Identifikasi
    children.push(heading('A. IDENTIFIKASI'));
    children.push(heading('1. Kesiapan Murid', 2));
    (data.identifikasi?.kesiapanMurid || []).forEach(p => children.push(bullet(p)));

    children.push(heading('2. Karakteristik Materi', 2));
    (data.identifikasi?.karakteristikMateri || []).forEach(p => children.push(bullet(p)));

    children.push(heading('3. Dimensi Profil Pelajar Pancasila', 2));
    (data.identifikasi?.dimensiProfilLulusan || []).forEach(d => {
      children.push(para(d.dimensi, true, BLUE_HEX));
      children.push(para(d.deskripsi));
      children.push(para(`Indikator: ${d.indikator}`, false, GRAY_HEX));
    });

    // B. Desain Pembelajaran
    children.push(heading('B. DESAIN PEMBELAJARAN'));
    children.push(heading('1. Tujuan Pembelajaran', 2));
    (data.desainPembelajaran?.tujuanPembelajaran || []).forEach(tp => {
      children.push(para(`TP ${tp.nomor}: ${tp.rumusan}`, true));
      if (tp.smart) {
        ['specific', 'measurable', 'achievable', 'relevant', 'timebound'].forEach(k => {
          children.push(para(`  ${k.toUpperCase()}: ${tp.smart[k] || ''}`, false, GRAY_HEX));
        });
      }
      children.push(new Paragraph({ text: '' }));
    });

    children.push(heading('2. Praktik Pedagogis', 2));
    (data.desainPembelajaran?.praktikPedagogis || []).forEach(p => children.push(bullet(p)));

    children.push(heading('3. Kemitraan Pembelajaran', 2));
    (data.desainPembelajaran?.kemitraanPembelajaran || []).forEach(k => {
      children.push(para(k.pihak, true));
      children.push(para(`Peran: ${k.peran}`, false, GRAY_HEX));
      children.push(para(`Bentuk Kolaborasi: ${k.bentukKolaborasi}`, false, GRAY_HEX));
    });

    children.push(heading('4. Lingkungan Belajar', 2));
    (data.desainPembelajaran?.lingkunganBelajar || []).forEach(l => children.push(bullet(l)));

    children.push(heading('5. Pemanfaatan Platform Digital', 2));
    (data.desainPembelajaran?.pemanfaatanDigital || []).forEach(p => {
      children.push(para(`${p.platform}: ${p.fungsi}`, false, NAVY_HEX));
    });

    // C. Pengalaman Belajar — Pendahuluan
    children.push(heading('C. PENGALAMAN BELAJAR'));
    children.push(heading('1. Kegiatan Pendahuluan', 2));

    const pendRows = [
      new TableRow({
        children: [tableCell('No', true, 500), tableCell('Aktivitas Guru', true, 2500), tableCell('Aktivitas Murid', true, 2500), tableCell('Waktu', true, 800), tableCell('Kalimat Guru', true, 3000)],
      }),
      ...(data.pengalamanBelajar?.pendahuluan || []).map(l => new TableRow({
        children: [tableCell(String(l.langkah), false, 500), tableCell(l.aktivitasGuru, false, 2500), tableCell(l.aktivitasMurid, false, 2500), tableCell(l.estimasiWaktu, false, 800), tableCell(l.kalimatGuru, false, 3000)],
      })),
    ];
    children.push(new Table({ rows: pendRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
    children.push(new Paragraph({ text: '', spacing: { after: 200 } }));

    // Inti
    children.push(heading('2. Kegiatan Inti', 2));
    const intiRows = [
      new TableRow({
        children: [tableCell('No', true, 400), tableCell('Fase', true, 1500), tableCell('Aktivitas Guru', true, 2000), tableCell('Aktivitas Murid', true, 2000), tableCell('Waktu', true, 700), tableCell('Kalimat Guru', true, 2500), tableCell('Bukti Kinerja', true, 1700)],
      }),
      ...(data.pengalamanBelajar?.inti || []).map(l => new TableRow({
        children: [tableCell(String(l.langkah), false, 400), tableCell(l.fase, false, 1500), tableCell(l.aktivitasGuru, false, 2000), tableCell(l.aktivitasMurid, false, 2000), tableCell(l.estimasiWaktu, false, 700), tableCell(l.kalimatGuru, false, 2500), tableCell(l.buktiKinerjaMurid, false, 1700)],
      })),
    ];
    children.push(new Table({ rows: intiRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
    children.push(new Paragraph({ text: '', spacing: { after: 200 } }));

    // Penutup
    children.push(heading('3. Kegiatan Penutup', 2));
    const penutupRows = [
      new TableRow({
        children: [tableCell('No', true, 500), tableCell('Aktivitas Guru', true, 2500), tableCell('Aktivitas Murid', true, 2500), tableCell('Waktu', true, 800), tableCell('Kalimat Guru', true, 3000)],
      }),
      ...(data.pengalamanBelajar?.penutup || []).map(l => new TableRow({
        children: [tableCell(String(l.langkah), false, 500), tableCell(l.aktivitasGuru, false, 2500), tableCell(l.aktivitasMurid, false, 2500), tableCell(l.estimasiWaktu, false, 800), tableCell(l.kalimatGuru, false, 3000)],
      })),
    ];
    children.push(new Table({ rows: penutupRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
    children.push(new Paragraph({ text: '', spacing: { after: 200 } }));

    // D. Asesmen
    children.push(heading('D. ASESMEN'));
    children.push(heading('1. Asesmen Awal (Diagnostik)', 2));
    const awalRows = [
      new TableRow({ children: [tableCell('No', true, 400), tableCell('Pertanyaan Pemantik', true, 5000), tableCell('Tujuan Diagnostik', true, 4000)] }),
      ...(data.asesmen?.asesmenAwal?.pertanyaan || []).map(p => new TableRow({
        children: [tableCell(String(p.nomor), false, 400), tableCell(p.pertanyaan, false, 5000), tableCell(p.tujuanDiagnostik, false, 4000)],
      })),
    ];
    children.push(new Table({ rows: awalRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
    children.push(new Paragraph({ text: '' }));

    children.push(heading('2. Asesmen Proses (Formatif)', 2));
    const prosesRows = [
      new TableRow({ children: [tableCell('Aspek', true, 1500), tableCell('Indikator', true, 2000), tableCell('Sangat Baik (4)', true, 2000), tableCell('Baik (3)', true, 2000), tableCell('Cukup (2)', true, 1500), tableCell('Perlu Bimbingan (1)', true, 1500)] }),
      ...(data.asesmen?.asesmenProses?.rubrik || []).map(r => new TableRow({
        children: [tableCell(r.aspek, false, 1500), tableCell(r.indikator, false, 2000), tableCell(r.sangat_baik, false, 2000), tableCell(r.baik, false, 2000), tableCell(r.cukup, false, 1500), tableCell(r.perlu_bimbingan, false, 1500)],
      })),
    ];
    children.push(new Table({ rows: prosesRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
    children.push(new Paragraph({ text: '' }));

    children.push(heading('3. Asesmen Akhir (Sumatif)', 2));
    (data.asesmen?.asesmenAkhir?.soal || []).forEach(s => {
      children.push(para(`${s.nomor}. ${s.soal}`, true));
      children.push(para('Kunci Jawaban:', true, BLUE_HEX));
      children.push(para(s.kunciJawaban, false, GRAY_HEX));
      children.push(new Paragraph({ text: '' }));
    });

    // E. Refleksi
    children.push(heading('E. REFLEKSI & TINDAK LANJUT'));
    children.push(heading('Refleksi Guru', 2));
    (data.refleksi?.guruRefleksi || []).forEach(r => children.push(bullet(r)));
    children.push(heading('Refleksi Murid', 2));
    (data.refleksi?.muridRefleksi || []).forEach(r => children.push(bullet(r)));
    children.push(heading('Pelibatan Keluarga', 2));
    children.push(para(data.refleksi?.pelibatanKeluarga || ''));
    children.push(heading('Tindak Lanjut', 2));
    if (data.refleksi?.tindakLanjut) {
      children.push(para(`Pengayaan: ${data.refleksi.tindakLanjut.pengayaan || ''}`, false, GRAY_HEX));
      children.push(para(`Remedial: ${data.refleksi.tindakLanjut.remedial || ''}`, false, GRAY_HEX));
    }

    // Signature
    children.push(new Paragraph({ text: '', spacing: { before: 400 } }));
    children.push(new Paragraph({
      children: [
        new TextRun({ text: 'Mengetahui,', font: 'Arial', size: 22 }),
        new TextRun({ text: '\t\t\t\t', font: 'Arial', size: 22 }),
        new TextRun({ text: `${profile?.namaKota || 'Singkawang'}, ${this.formatDate()}`, font: 'Arial', size: 22 }),
      ],
    }));
    children.push(new Paragraph({
      children: [
        new TextRun({ text: 'Kepala Sekolah', font: 'Arial', size: 22 }),
        new TextRun({ text: '\t\t\t\t\t', font: 'Arial', size: 22 }),
        new TextRun({ text: 'Guru Mata Pelajaran', font: 'Arial', size: 22 }),
      ],
    }));
    children.push(new Paragraph({ text: '', spacing: { before: 800 } }));
    children.push(new Paragraph({
      children: [
        new TextRun({ text: profile?.namaKepsek || '________________________', font: 'Arial', size: 22, bold: true }),
        new TextRun({ text: '\t\t\t\t', font: 'Arial', size: 22 }),
        new TextRun({ text: profile?.namaGuru || '________________________', font: 'Arial', size: 22, bold: true }),
      ],
    }));
    children.push(new Paragraph({
      children: [
        new TextRun({ text: `NIP. ${profile?.nipKepsek || '-'}`, font: 'Arial', size: 22 }),
        new TextRun({ text: '\t\t\t\t\t\t', font: 'Arial', size: 22 }),
        new TextRun({ text: `NIP. ${profile?.nipGuru || '-'}`, font: 'Arial', size: 22 }),
      ],
    }));

    const docxDoc = new Document({
      sections: [{
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }, // 1 inch = 1440 twips
          },
        },
        children,
      }],
    });

    const blob = await Packer.toBlob(docxDoc);
    const filename = `RPM_${(f.mapel || 'dokumen').replace(/\s+/g, '_')}_${(f.materi || '').replace(/\s+/g, '_').slice(0, 30)}.docx`;
    this._downloadBlob(blob, filename);
  }

  _downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// Singleton
const exportEngine = new ExportEngine();
