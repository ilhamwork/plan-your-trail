# Task: UI/UX Revamp, Home / Upload Page (Plan Your Trail)

## Context

Halaman ini adalah home screen setelah login: greeting, upload zone GPX, tombol "Try GPX Example", tagline, dan 4 feature cards (Route Map, Elevation Profile, Segment Breakdown, Weather Forecast). Fokus utama: mobile width (~400px), tapi harus tetap rapi di desktop.

Hasil UI/UX review nemuin beberapa masalah di copy, affordance, hierarchy, trust, dan accessibility. Task ini ngerjain semuanya secara bertahap.

## Rules buat Agent

1. **Inspect dulu.** Sebelum edit apa pun, baca struktur project: framework, styling approach (Tailwind / CSS modules / dll), i18n setup (kalau ada), dan komponen yang render halaman ini. Ikutin convention yang udah ada.
2. **Jangan ubah** logic upload/parsing GPX, routing, atau API. Scope cuma UI, copy, dan accessibility.
3. **Jangan install dependency baru** kecuali bener-bener perlu. Kalau perlu, jelasin alasannya dulu.
4. **Pertahankan design language**: dark forest green + cream, rounded cards, geometric sans. Jangan ganti palette.
5. Kerjain per phase, commit/checkpoint per phase, dan tunjukin ringkasan perubahan di akhir tiap phase.
6. Test di viewport 360px, 390px, 768px, dan 1280px.

---

## Phase 1: Quick wins (Priority: High, Effort: Low)

### 1.1 Konsistensi bahasa

- Sekarang campur: `"Maks 10 MB"` dan `"atau"` masih Indonesia, sisanya English.
- Cari semua hardcoded string di halaman ini dan samain bahasanya.
- Kalau project udah punya i18n: pindahin semua string ke translation file, sediakan key untuk EN dan ID.
- Kalau belum ada i18n: set ke English dulu (`"Max 10 MB"`, `"or"`), dan kumpulin string ke satu constants file biar gampang diterjemahin nanti.

### 1.2 Microcopy upload zone (device-aware)

- `"Drag & Drop GPX File"` itu desktop pattern, nggak masuk akal di mobile.
- Mobile (touch / viewport < 768px):
  - Title: `Upload your GPX file`
  - Subtitle: `Tap to select a file from your device`
- Desktop (pointer: fine):
  - Title: `Drag & drop your GPX file`
  - Subtitle: `or click to select a file`
- Pakai media query `(pointer: coarse)` atau breakpoint, bukan user-agent sniffing.
- Helper text: `Max 10 MB · .gpx`

### 1.3 Perkuat "Try GPX Example"

- Ganti label jadi `Try with a sample route`.
- Tambah hint kecil di bawah / di dalam tombol: nama rute + jarak + elevation gain (ambil dari sample GPX yang dipakai, jangan hardcode angka asal).
- Naikin visual weight: tetap secondary, tapi kontras border dan teks lebih tegas, tambah ikon kecil (mis. play / route icon).
- Tap target minimal 48px tinggi.

---

## Phase 2: Affordance & Hierarchy (Priority: Medium)

### 2.1 Upload zone affordance

- Zone sekarang solid dark green, jadi mirip banner. Tambah inner dashed border (`border: 2px dashed` dengan warna cream opacity ~40%) biar jelas ini dropzone.
- Tambah tombol eksplisit di dalam zone: `Choose file` (pill button, kontras tinggi).
- State yang harus ada:
  - default
  - hover / focus-visible (desktop)
  - drag-over (border jadi solid + background sedikit lebih terang)
  - uploading (progress indicator)
  - error (file > 10 MB, bukan .gpx, file corrupt) dengan pesan jelas dan aksi retry
- Zone harus bisa diakses keyboard (`Enter` / `Space` buka file picker) dan punya `aria-label`.

### 2.2 Feature cards: info vs tappable

Pilih **salah satu** (default: Opsi A, kecuali codebase nunjukin ada route/demo per fitur): PILIH OPSI A

- **Opsi A (flatten, recommended):** hilangin shadow dan efek "button-like". Ubah jadi grid ikon + title + deskripsi yang jelas informatif (bukan clickable). Hapus `cursor: pointer` dan hover lift.
- **Opsi B (interactive):** kalau tiap fitur punya demo/preview, bikin tap → buka preview. Harus ada affordance jelas (chevron / "Preview").

Kedua opsi: perbesar ikon (min 24px glyph di dalam container 40–44px) dan naikin saturasi pastel-nya sedikit biar nggak hilang.

### 2.3 Hierarchy: value prop

- Pindahin `Analyze your trail route. Plan your strategy.` ke atas upload zone (di bawah greeting) atau jadikan headline utama.
- Naikin ukuran (~20–22px) dan weight (semibold), warna teks utama (bukan abu).
- Greeting `Hello, {name}!` diturunin jadi lebih kecil / subtle (jangan jadi elemen paling dominan).
- Pastikan satu halaman tetap punya **satu** primary CTA yang jelas (upload zone).

---

## Phase 3: Trust & Clarity (Priority: Medium)

### 3.1 Privacy hint

- Tambah satu baris kecil di bawah upload zone, dengan ikon gembok:
  `Your file is processed privately`
- **Penting:** sebelum nulis copy ini, cek di codebase apakah klaimnya bener (apakah file disimpan di server, siapa yang bisa akses). Kalau nggak bisa dipastikan, tulis TODO dan pakai copy netral, jangan bikin klaim yang nggak terverifikasi.

### 3.2 Help untuk pemula

- Tambah link kecil: `Where do I get a GPX file?`
- Buka bottom sheet / modal singkat berisi cara export GPX dari Strava, Garmin Connect, Komoot, dan Coros (langkah singkat, bukan tutorial panjang).
- Tampilkan format yang didukung: `.gpx`.

---

## Phase 4: Accessibility & Polish (Priority: Low)

- **Kontras (WCAG AA, 4.5:1 untuk teks normal):**
  - Helper text `Max 10 MB` di atas hijau tua
  - Subtitle abu di feature cards
  - Kalau gagal, perbaiki lewat design token, bukan hardcode per elemen.
- **Focus states:** semua elemen interaktif punya `:focus-visible` ring yang jelas.
- **Tap targets:** minimal 44x44px.
- **Semantic HTML:** heading hierarchy benar (`h1` satu aja), upload zone pakai `<button>` / `<label>` + `<input type="file" accept=".gpx">`.
- **Reduced motion:** hormati `prefers-reduced-motion` untuk animasi apa pun.

---

## Phase 5: Returning user (Priority: Low, Effort: Medium)

> Kerjain cuma kalau data riwayat analisis udah tersedia di backend/state. Kalau belum, **skip dan catat sebagai follow-up**, jangan bikin mock data permanen. Only registered user, not guest

- Kalau user punya analisis sebelumnya, tampilkan section `Recent routes` (1 item: nama, jarak, tanggal) di bawah upload zone.
- Empty state untuk user baru: nggak tampil sama sekali (jangan bikin section kosong).
- Cek juga apakah ada header/navigation ke riwayat, akun, dan settings. Kalau nggak ada di layout manapun, catat sebagai temuan.

---

## Acceptance Criteria

- [ ] Nggak ada campuran bahasa dalam satu locale
- [ ] Copy upload zone berbeda untuk mobile vs desktop
- [ ] Upload zone punya dashed affordance, tombol `Choose file`, dan semua state (default, drag-over, uploading, error)
- [ ] "Try with a sample route" lebih menonjol dan punya hint rute
- [ ] Feature cards nggak lagi misleading (flat atau beneran interactive)
- [ ] Value prop lebih dominan dari greeting
- [ ] Privacy hint dan help link GPX ada (dengan klaim yang terverifikasi)
- [ ] Semua teks lolos WCAG AA, keyboard navigation jalan, tap target >= 44px
- [ ] Tidak ada regresi di flow upload dan parsing GPX
- [ ] Tampilan oke di 360 / 390 / 768 / 1280px

## Output yang diminta dari Agent

1. Ringkasan perubahan per phase (file yang diubah + alasan).
2. Screenshot before/after di 390px dan 1280px kalau memungkinkan.
3. List hal yang di-skip atau butuh keputusan manual (mis. klaim privacy, Phase 5, Opsi B feature cards).
