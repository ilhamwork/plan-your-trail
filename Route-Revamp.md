# Task: UI/UX Revamp, Route Analysis Page (Plan Your Trail)

## Context

Halaman hasil analisis rute (contoh: "Rinjani 36K"). Urutan section sekarang:

1. Header (logo + toggle ID/EN)
2. Peta (kontrol: locate, 3D, layers, fullscreen, share, favorite)
3. Hero stats (Panjang Rute, Elevasi Naik) + elevation chart (bisa di-collapse pakai tombol X)
4. Judul rute + creator + tanggal
5. Ringkasan Metrik
6. Kartu file GPX
7. Analisis Segmen Trek (list segmen, accordion untuk detail)
8. Sebaran Kemiringan Rute (stacked bar + legend)
9. Auth wall untuk guest: 3 kartu fitur + CTA "Masuk ke Akun"
10. Support Development (donasi) + footer
11. Bottom nav (Home / Route / Log In)

Fokus: mobile (360-430px), tetap rapi di desktop. Page ini dilihat guest dan registered user.

## Rules buat Agent

1. **Inspect dulu.** Baca struktur project: framework, styling approach, i18n setup, design tokens, komponen yang render halaman ini. Ikutin convention yang ada.
2. **Scope cuma UI, copy, dan accessibility.** Jangan ubah logic parsing GPX, kalkulasi metrik, routing, atau API.
3. **Jangan install dependency baru** tanpa alasan kuat. Kalau perlu, tulis alasannya dulu.
4. **Pertahankan design language**: dark forest green + cream, rounded cards, geometric sans.
5. Kerjain per phase, checkpoint/commit per phase, ringkas perubahan di akhir tiap phase.
6. Test di 360px, 390px, 768px, 1280px, untuk state guest, registered, dan pro.
7. Semua string baru lewat i18n (EN + ID). Jangan hardcode.

## Keputusan Final (JANGAN DIUBAH)

Hal-hal ini sudah diputuskan owner. Jangan "diperbaiki":

- **FAB hitam** di kanan layar adalah dev-mode tool, bukan bagian produk. Jangan disentuh, dan abaikan overlap-nya saat review.

---

## Phase 1: Bahasa & Copy (Priority: High, Effort: Low)

### 1.1 Konsistensi bahasa

- Toggle ID/EN sudah ada, tapi beberapa string masih nyangkut di satu bahasa saat locale ID. Audit seluruh page dan pindahin ke i18n:
  - Pill segmen: `Flat / Uphill / Climb / Descent / Downhill`
  - Section donasi: `SUPPORT DEVELOPMENT`, `Planning your next adventure...`, `Fuel This Tool`, `Built by trail runner, for trail runners.`, `Found a bug or have an idea? Send feedback.`
- Locale ID harus 100% Indonesia, locale EN harus 100% English.
- **Label segmen:** baca threshold grade di code untuk tiap tipe segmen, jadi urutan tingkat kecuramannya jelas (mis. Uphill vs Climb mana yang lebih curam). Di ID, terjemahan harus ngikutin urutan itu (draft: Datar, Tanjakan, Tanjakan Curam, Turunan, Turunan Curam, sesuaikan dengan hasil baca code). Tulis mapping final di summary supaya owner bisa konfirmasi.
- Tambah penjelasan singkat range grade per tipe segmen (tooltip / info icon / subtitle di header section), diambil dari threshold di code, bukan angka karangan.

### 1.2 Batas ukuran upload per tier

- Guest 5 MB, registered 10 MB, pro 20 MB.
- Jadikan satu sumber kebenaran (constant/config), dipakai di route page, home upload zone, dan pesan error upload. Jangan hardcode di tiap komponen.
- Cek apakah angka di UI sama dengan yang di-enforce di backend. Kalau beda, **jangan ubah backend**, catat di summary.
- Untuk guest, tampilkan hint upgrade di state upload (mis. `Maks 5 MB · Masuk untuk batas 10 MB`). Untuk registered: `Maks 10 MB`, pro: `Maks 20 MB`.

---

## Phase 2: Sistem Warna Kemiringan (Priority: High, Effort: Low-Medium)

Sekarang warna nggak konsisten antar visual: stacked bar (oranye/hijau tua/biru), icon legend (merah/abu/biru), pill "Flat" (beige).

- Definisikan design token satu set untuk kategori kemiringan:
  - Tanjakan: oranye/merah (pakai warna yang sudah ada di bar)
  - Datar: netral (satu warna, dipakai konsisten, jangan hijau tua di bar tapi beige di pill)
  - Turunan: biru
- Terapkan token yang sama di: segmen yang jadi pill, stacked bar, icon + angka persen di legend.
- Tambah color key (dot/swatch) di tiap baris legend yang cocok dengan warna di bar.
- Pill harus lolos kontras WCAG AA (teks vs background pill). Pill "Flat" yang beige sekarang kemungkinan gagal.
- Jangan ubah warna rute di peta.

---

## Phase 3: Hierarchy & Clarity (Priority: Medium, Effort: Low-Medium)

### 3.1 Judul rute naik

- Pindahin blok judul (`Rinjani 36K` + creator + tanggal) ke posisi tepat di bawah peta, **sebelum** hero stats dan elevation chart. Hapus avatar.
- Jangan ubah posisi peta dan jangan ubah isi elevation chart.

### 3.2 Label ambigu

- Tanggal: tambah label jelas, mis. `Tanggal lari: 16 November 2026` (tanggal ini dipakai untuk prakiraan cuaca).
- Creator ("Kili"): Tambah label yang sesuai, mis. `Dibuat oleh Kili`.

### 3.3 Jargon KM-Effort

- Tambah info icon di samping `Total Effort (KM-Effort)` yang buka popover/tooltip singkat (2 kalimat max) menjelaskan apa itu KM-Effort.
- **Baca rumus di code dulu**, tulis penjelasan sesuai rumus aslinya. Jangan mengarang. Tooltip harus bisa dibuka lewat tap (mobile) dan keyboard.

---

## Phase 4: Auth Wall & CTA (Priority: Medium-High, Effort: Medium)

Target: guest dikasih "rasa" tiap fitur sebelum diminta login. Tanpa input apa pun dari user.

### 4.1 Kartu fitur jadi teaser

Tiga kartu: Hitung Estimasi Finish Race, Manajemen Waypoint, Buka Prakiraan Cuaca Lengkap.

- Tiap kartu dapat **preview visual kecil** (tinggi maks ~80px, SVG/CSS, `aria-hidden`, tanpa library baru):
  - Estimasi Finish: ilustrasi sederhana hasil estimasi (mis. chip waktu + pace)
  - Waypoint: (water station, checkpoint, aid station)
  - Cuaca: 4 chip waktu (Pagi/Siang/Sore/Malam) dengan ikon cuaca
- Preview itu data ilustrasi, **harus diberi badge `Contoh` / `Example`** supaya tidak terbaca sebagai hasil asli rute user.
- Kartu **bukan elemen interaktif**: flatten (hilangin shadow ala tombol, hapus cursor pointer/hover lift), border tipis aja.
- Persingkat deskripsi jadi maks 2 baris per kartu.
- Perbaiki alignment ikon kartu ke-3 (judul 2 baris bikin ikon nggak sejajar dengan kartu lain). Layout konsisten antar kartu.
- Naikin heading section (`Masuk untuk menggunakan fitur analisis lanjutan ini`) supaya lebih kuat dari body text.

### 4.2 CTA login/daftar

- Primary: `Masuk / Daftar` (full width). Cek flow auth yang ada. Kalau sign-up dan login terpisah, tambah text link sekunder `Belum punya akun? Daftar`.
- **Jangan klaim "gratis"** kecuali terverifikasi di product (ada tier Pro).

### 4.3 Donasi turun kelas

- Tombol `Fuel This Tool` jadi secondary/ghost (outline atau text button), bukan hijau tua solid, supaya tidak bersaing dengan CTA login.
- Jarak antara CTA login dan card donasi diperlebar.

---

## Phase 5: Polish (Priority: Low, Effort: Low)

- **Kartu file GPX:** setelah file dimuat, baris kedua jangan lagi nampilin limit upload. Ganti jadi ukuran file (mis. `1,2 MB · GPX dimuat`). Tambah aksi `Ganti file` hanya kalau flow replace memang sudah ada; kalau belum, jangan bikin baru dan catat di summary.
- **Bottom nav:** active state sekarang "Home" padahal user ada di halaman rute. Cek mapping route -> tab. Kalau halaman ini memang seharusnya tab "Route", perbaiki active state. Kalau page ini memang sengaja di bawah Home, skip dan catat.
- **Ruang kosong** besar di bawah list segmen: cari penyebabnya (min-height accordion, margin, atau padding sisa). Pastikan bukan karena dev-mode FAB sebelum mengubah apa pun. Rapikan tanpa merusak accordion.
- **Kontras:** audit teks abu kecil (jarak `km` di legend, subtitle section) terhadap WCAG AA 4.5:1. Perbaiki lewat token, bukan hardcode per elemen.

---

## Acceptance Criteria

- [ ] Locale ID tidak punya string English (dan sebaliknya), termasuk pill segmen dan section donasi
- [ ] Penjelasan range grade per tipe segmen ada, bersumber dari threshold di code
- [ ] Batas upload dinamis per tier (5 / 10 / 20 MB) dari satu config, konsisten di home dan route page
- [ ] Satu sistem warna kemiringan konsisten di bar, legend (dengan color key), dan pill
- [ ] Judul rute di atas hero stats, tanggal dan creator berlabel
- [ ] KM-Effort punya tooltip yang sesuai rumus asli
- [ ] Tiga kartu auth wall punya preview berbadge `Contoh`, non-interaktif, maks 2 baris deskripsi
- [ ] CTA `Masuk / Daftar` jelas, donasi jadi secondary
- [ ] Kartu file, bottom nav, dan ruang kosong sudah dicek/diperbaiki sesuai Phase 5
- [ ] Semua teks lolos WCAG AA, tap target >= 44px
- [ ] Item di "Keputusan Final" tidak berubah
- [ ] Tidak ada regresi di parsing GPX, kalkulasi metrik, accordion segmen, dan filter "Semua Rute"
- [ ] Tampilan oke di 360 / 390 / 768 / 1280px untuk guest, registered, dan pro

## Output yang diminta dari Agent

1. Ringkasan perubahan per phase (file yang diubah + alasan).
2. Mapping final label segmen (EN -> ID) dan penjelasan KM-Effort yang dipakai, untuk dikonfirmasi owner.
3. Daftar hal yang di-skip atau butuh keputusan manual (mismatch limit upload UI vs backend, flow replace file, mapping bottom nav, auth/sign-up flow, dsb).
4. Screenshot before/after di 390px (guest) kalau memungkinkan.
