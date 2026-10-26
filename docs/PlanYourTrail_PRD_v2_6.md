# PlanYourTrail.run
## Product Requirements Document — Free Registered Launch & Pro Monetization

| | |
|---|---|
| **Versi** | 2.6 |
| **Tanggal** | 26 Oktober 2026 |
| **Status** | Draft — Internal |
| **Author** | PlanYourTrail Team |
| **Changelog** | Lihat Lampiran A |

---

## 1. Overview

PlanYourTrail.run adalah web app untuk trail runner yang menganalisis file GPX dan menghasilkan route map interaktif, elevation profile, segment breakdown, dan weather forecast. Saat ini seluruh fitur tersedia gratis tanpa autentikasi.

Dokumen ini mendefinisikan rencana monetisasi dengan model **freemium permanen + Pro subscription**, dengan **peluncuran bertahap**:

1. **Tahap 1 (dekat):** Launch akun **Free registered**. Tidak ada pembayaran. Fitur Pro tampil sebagai "Segera hadir" dengan opsi daftar early access.
2. **Tahap 2 (masa validasi):** Mengukur demand, mengumpulkan waitlist Pro, dan membangun fitur Pro di balik feature flag.
3. **Tahap 3 (2027):** Launch **Pro subscription** dengan payment gateway.

> **Tujuan utama:** Membuat akun Free cukup berharga untuk mendorong registrasi, lalu mengkonversi pengguna ke Pro secara organik saat mereka merasakan batas tier gratis. Target konversi Free → Pro perlu dikalibrasi ulang setelah data waitlist tersedia (lihat Section 10).

---

## 2. Problem Statement

### 2.1 Sisi pengguna

- Trail runner kasual hanya race 2–4x setahun, sehingga kebutuhan analisis rute muncul sporadis, menjelang hari-H.
- Tidak ada tools gratis di pasar yang mengkombinasikan analisis GPX + weather forecast + waypoint planning dalam satu alur yang bersih.
- Free trial rentan di-abuse (daftar ulang dengan email baru), sehingga tidak ada insentif untuk convert.

### 2.2 Sisi bisnis

- Tanpa monetisasi, biaya infrastruktur (database, peta, weather API, email, compute) tidak terkover seiring pertumbuhan user.
- Model free trial tidak efektif untuk use case sporadic. Freemium permanen lebih sehat karena konversi terjadi saat user benar-benar butuh.
- Perbedaan Anonymous vs Free sebelumnya terlalu tipis (hanya simpan rute dan akses lintas device), sehingga insentif membuat akun lemah. Versi ini memperkuat nilai akun Free.

---

## 3. Target Pengguna

### Casual Trail Runner
- Race 2–4x per tahun.
- Butuh analisis rute mendalam menjelang race (1–2 minggu sebelum hari-H).
- Tidak punya waypoint di file GPX, sehingga butuh tambah water/aid station sendiri.
  - → Merasakan batas Free saat ingin tambah waypoint, momen upgrade natural.

### Power User / Coach / Race Organizer
- Menganalisis banyak rute secara rutin: latihan, scouting, perencanaan event.
- Butuh fitur lanjutan: cutoff estimator, perbandingan rute, riwayat tanpa batas, export dan share.
  - → Target utama **Pro**.

---

## 4. Solusi — Anonymous, Free, dan Pro

Tiga level akses. **Free** dibuat cukup kuat agar registrasi terasa worth it. **Pro** adalah destination dengan fitur race-planning lengkap.

> **Prinsip desain:** Free harus terasa useful, bukan crippled. User yang tidak pernah butuh waypoint management bisa tetap happy di Free selamanya. User yang butuh lebih punya alasan jelas untuk upgrade.

### 4.1 Tier Breakdown

| Fitur | Anonymous | Free (registered) | Pro | Status Pro |
|---|:---:|:---:|:---:|---|
| **Harga** | Gratis | Gratis, selamanya | Lihat Section 8 | — |
| **Batas ukuran upload GPX per file** | 5 MB | 10 MB | 20 MB | Coming soon (20 MB) |
| Route map 2D interaktif (Leaflet) | ✓ | ✓ | ✓ | — |
| Route map 3D interaktif (MapLibre GL) + satellite | ✓ | ✓ | ✓ | — |
| Elevation profile chart | ✓ | ✓ | ✓ | — |
| Basic metrics (distance, km effort, elevation gain/loss, highest/lowest point) | ✓ | ✓ | ✓ | — |
| Segment breakdown (by waypoint atau gradient) | ✓ | ✓ | ✓ | — |
| Gradient distribution (uphill, flat, downhill) | ✓ | ✓ | ✓ | — |
| Waypoint dari GPX tampil di peta (read-only) | ✓ | ✓ | ✓ | — |
| **Waypoint GPX tampil di elevation chart** (read-only) | — | ✓ | ✓ | — |
| **Weather forecast per sesi** (morning/afternoon/evening/night), semua rute yang dianalisis | — | ✓ | ✓ | — |
| **Estimasi pace dasar** (total waktu finish dari pace input) | — | ✓ | ✓ | — |
| Simpan riwayat analisis | — (hilang saat tab ditutup) | ✓ maks 3 rute | ✓ unlimited* | Coming soon |
| Akses hasil dari device lain | — | ✓ | ✓ | — |
| **Download ulang GPX asli** (dari rute tersimpan) | — | ✓ | ✓ | — |
| Waypoint management (add, edit, delete) | — | ✓\*\* | ✓ | Dikunci ke Pro saat Pro launch |
| Waypoint ditambahkan user tampil di elevation chart | — | — | ✓ | Coming soon |
| Nutrition & gear notes per waypoint | — | — | ✓ | Coming soon |
| Hourly weather forecast | — | — | ✓ | Coming soon |
| Pace & cutoff estimator (estimasi waktu per checkpoint + status cutoff) | — | — | ✓ | Coming soon |
| Export PDF (race brief siap cetak) | — | — | ✓ | Coming soon |
| Share link hasil analisis (view-only) | — | — | ✓ | Coming soon |
| Perbandingan dua rute side-by-side | — | — | ✓ | Coming soon |
| Priority support (email) | — | — | ✓ | Coming soon |

\* "Unlimited" dikenai fair-use cap yang longgar (lihat Section 9.3).

\*\* Waypoint management hanya untuk **akun registered** (bukan Anonymous) dan tersedia **sampai Pro launch** (label "Gratis sampai Pro launch"), lalu dikunci ke Pro. Lihat Section 6.1 dan 11.1.

### Catatan penting

- **Tidak ada free trial.** Free tier permanen berfungsi sebagai onboarding.
- **Anonymous → Free:** insentif registrasi kini lebih dari sekadar penyimpanan. Weather, waypoint GPX di elevation chart, estimasi pace dasar, waypoint management (sementara), dan download ulang GPX asli hanya tersedia setelah login.
- **Free → Pro:** trigger utama adalah storage limit (maks 3 rute), kebutuhan waypoint management, dan cutoff estimator. Weather **tidak lagi** menjadi trigger upgrade; trigger weather bergeser ke **hourly forecast**.
- **Waypoint management (gratis sementara, hanya akun registered):** fitur ini sudah live. Mulai Free launch hanya akun registered yang bisa memakainya, tersedia sampai Pro launch dengan label "Gratis sampai Pro launch" dan tanggal sunset yang diumumkan sedini mungkin. Anonymous tidak lagi bisa menambah/edit/hapus waypoint dan diarahkan ke registrasi gratis (CTA registrasi, bukan CTA Pro). Setelah Pro launch, fitur ini memerlukan Pro. Waypoint yang sudah dibuat user tetap tampil read-only di Free. Waypoint yang berasal dari GPX tetap read-only dan gratis.
- **Segment breakdown tetap gratis** karena ini fitur yang membuktikan nilai produk.
- **Batas upload GPX dibedakan per tier** (5 / 10 / 20 MB). Anonymous yang butuh file lebih besar diarahkan ke registrasi gratis; Free yang butuh file lebih besar masuk waitlist Pro. Angka ini usulan awal dan bisa disesuaikan dengan data ukuran file nyata.
- **Fitur Pro belum aktif pada Tahap 1 dan 2.** Fitur ini tampil terkunci dengan label "Segera hadir" (lihat Section 6). Pengecualian: waypoint management tetap live untuk akun registered sampai Pro launch.

---

## 5. Feature Specifications

### 5.1 Fitur Anonymous (tanpa akun)

Zero friction onboarding. Hasil analisis tidak tersimpan dan hilang saat sesi berakhir.

- Upload GPX **maks 5 MB per file**, tanpa login
- Route map 2D (Leaflet) dan 3D (MapLibre GL) dengan opsi satellite
- Elevation profile chart
- Basic metrics: distance, km effort, elevation gain & loss, highest & lowest point
- Segment breakdown, by waypoint (jika ada di GPX) atau by gradient
- Gradient distribution: uphill, flat, downhill
- Waypoint dari GPX ditampilkan di peta (read-only)

Fitur yang terkunci untuk Anonymous (weather, waypoint di elevation chart, estimasi pace, waypoint management) tampil dengan CTA registrasi, bukan CTA Pro.

> **Mengapa segment breakdown gratis?** Ini fitur yang membuktikan kedalaman analisis. User yang merasakan value-nya lebih termotivasi untuk membuat akun dan, kemudian, upgrade.

### 5.2 Fitur Free Registered (akun gratis)

Semua fitur Anonymous, ditambah:

**Analisis lebih lengkap**
- **Weather forecast per sesi** (morning, afternoon, evening, night) untuk **semua rute yang dianalisis** selama user login, tanpa perlu menyimpan rute
- **Waypoint GPX di elevation profile chart** (read-only, dengan label)
- **Estimasi pace dasar:** input pace, output total waktu finish. Per-checkpoint dan cutoff tetap Pro.

**Penyimpanan & personalisasi**
- Upload GPX **maks 10 MB per file** (naik dari 5 MB untuk Anonymous)
- Simpan riwayat analisis, **maks 3 rute** permanen di akun
- Akses hasil dari device manapun
- Download ulang file GPX asli dari rute yang tersimpan
- Rute ke-4 dan seterusnya memerlukan Pro (setelah launch) atau hapus rute lama

> **Trigger upgrade saat Pro sudah launch:** saat user mau simpan rute ke-4, muncul prompt *"Kamu sudah menyimpan 3 rute. Upgrade ke Pro untuk menyimpan unlimited rute."* Sebelum Pro launch, prompt diganti: *"Hapus salah satu rute, atau daftar early access Pro."*

### 5.3 Fitur Pro (subscription) — rilis 2027

Semua fitur Free, ditambah:

**Waypoint & Planning**
- Waypoint management: add, edit, delete water/aid station langsung di peta
- Waypoint buatan user tampil di elevation profile chart dengan label
- Nutrition & gear notes per waypoint
- Segment breakdown otomatis by waypoint yang ditambahkan user

**Race Strategy**
- Hourly weather forecast yang lebih detail
- Pace & cutoff estimator: estimasi waktu per checkpoint dan status cutoff tiap aid station

**Data & Sharing**
- Upload GPX **maks 20 MB per file** (untuk rute ultra atau rekaman dengan sampling sangat rapat)
- Export PDF (race brief siap cetak)
- Share link hasil analisis (view-only untuk penerima)
- Riwayat & simpan rute unlimited (fair-use cap)
- Perbandingan dua rute side-by-side

**Support**
- Priority support via email

---

## 6. Paywall & Early Access Strategy

Prinsip: **tease, don't hide**, disesuaikan untuk kondisi Pro belum tersedia. Fitur Pro terlihat dan terasa relevan, tapi CTA-nya **early access waitlist**, bukan pembayaran.

### 6.1 Perilaku selama Tahap 1 & 2 (Pro belum launch)

| Fitur | Tampilan di Free | CTA |
|---|---|---|
| Waypoint management | **Akun registered:** tetap aktif, label "Gratis sampai Pro launch". **Anonymous:** tombol terkunci | Registered: tanpa CTA lock, pemakaian dicatat (`waypoint_added`). Anonymous: "Daftar gratis" |
| Hourly weather | Section hourly tampil terkunci/blur di bawah weather per sesi | "Daftar early access" |
| Cutoff estimator | Tabel checkpoint tampil dengan nilai "—" di bawah estimasi pace dasar | "Daftar early access" |
| Export PDF & share link | Tombol disabled + tooltip "Segera hadir" | "Daftar early access" |
| Simpan rute ke-4 | Prompt hapus rute lama | "Hapus rute" atau "Daftar early access" |
| Compare route | Menu terkunci dengan label "Segera hadir" | "Daftar early access" |

Waypoint management **dikecualikan dari locked state Pro** untuk akun registered selama Tahap 1 dan 2. Label "Gratis sampai Pro launch" tampil sejak Free launch; tanggal sunset diumumkan begitu tanggal Pro launch ditetapkan. Anonymous tidak mendapat fitur ini dan melihat CTA registrasi. Pemakaian oleh akun registered (event `waypoint_added`, `waypoint_edited`) dipakai sebagai sinyal demand, melengkapi klik waitlist. Risiko: semakin lama gratis, semakin berat mencabutnya, sehingga komunikasinya tidak boleh ditunda.

### 6.2 Early access waitlist

- Satu klik jika user sudah login (memakai email akun). Untuk Anonymous, arahkan ke registrasi dulu.
- Data waitlist dicatat dengan **fitur pemicu** (waypoint, hourly weather, cutoff, export, share, storage) sehingga bisa diprioritaskan dalam pengembangan.
- Survei singkat opsional (maks 2 pertanyaan): fitur paling dibutuhkan dan rentang harga yang dianggap wajar.
- Email pengumuman launch Pro dikirim ke waitlist, memuat tanggal launch dan jendela diskon 30 hari. Tidak ada harga founder.

### 6.3 Aturan prompt (berlaku di semua tahap)

- Tampilkan prompt **setelah** user engaged dengan hasil analisis, bukan saat baru upload.
- Satu CTA yang jelas per konteks.
- Tidak ada popup blocking. Gunakan inline prompt atau bottom sheet yang bisa di-dismiss.
- Setelah di-dismiss, jangan tampilkan lagi dalam sesi yang sama.

### 6.4 Perilaku setelah Pro launch (Tahap 3)

CTA berubah dari waitlist menjadi upgrade. Selama 30 hari pertama: *"Coba Pro, Rp 29.000 bulan pertama."* dengan harga normal Rp 49.000/bulan di bawahnya. Setelah jendela diskon: *"Upgrade ke Pro, Rp 49.000/bulan."* Opsi tahunan sebagai secondary di kedua kondisi. Urutan trigger dari yang terkuat:

1. User upload GPX tanpa waypoint → tombol Add Waypoint terkunci
2. User mencapai limit 3 rute → prompt upgrade saat simpan rute ke-4
3. User melihat hourly weather / cutoff estimator terkunci menjelang race
4. User selesai analisis → mau share atau export → tombol terkunci

Saat Pro launch, waypoint management berpindah dari "gratis sementara" menjadi terkunci. Waypoint yang sudah dibuat user tetap tampil read-only.

---

## 7. User Flow

### Anonymous → Free Registered

1. User upload GPX → analisis selesai.
2. User melihat weather atau elevation chart berlabel terkunci, atau ingin simpan hasil → prompt *"Daftar gratis dalam 30 detik untuk lihat cuaca, simpan rute, dan lainnya."*
3. Daftar (email atau Google) → verifikasi email jika memakai email → weather, waypoint GPX di elevation chart, estimasi pace, waypoint management (sementara), dan simpan rute aktif.

### Free Registered → Early Access (Tahap 1–2)

1. User mengklik fitur Pro yang terkunci (misalnya hourly weather atau export PDF).
2. Muncul tooltip/bottom sheet: *"Segera hadir di Pro."* + tombol "Daftar early access".
3. Klik → user masuk waitlist dengan fitur pemicu tercatat.

### Free Registered → Pro (via storage limit, setelah Pro launch)

1. User sudah simpan 3 rute.
2. Upload GPX baru, selesai analisis, klik "Simpan".
3. Muncul prompt upgrade ke Pro.
4. *Jika tidak upgrade:* hapus rute lama untuk ganti dengan yang baru.
5. *Jika upgrade:* semua rute tersimpan, fitur Pro langsung aktif.

### Free Registered → Pro (via waypoint / hourly weather / cutoff, setelah Pro launch)

1. User klik fitur Pro yang terkunci.
2. Muncul upgrade prompt dengan konteks fitur tersebut.

### Direct to Pro (setelah Pro launch)

1. Power user / race organizer subscribe langsung dari landing page atau halaman pricing.
2. Setelah subscribe, semua analisis tersimpan dan fitur Pro aktif.

---

## 8. Pricing

> Berlaku mulai Tahap 3. Tidak ada pembayaran pada Tahap 1 dan 2.

| Plan | Harga | Catatan |
|---|---|---|
| Free | Rp 0 | Selamanya, tanpa batas waktu |
| Pro — bulan pertama (**diskon launch**) | Rp 29.000 | Hanya untuk langganan yang dimulai dalam **30 hari sejak tanggal Pro launch**, sekali per akun |
| Pro — bulanan (harga normal) | Rp 49.000/bulan | Berlaku untuk semua langganan baru setelah masa diskon, dan untuk bulan kedua dst. bagi pelanggan diskon. Auto-renew untuk kartu dan GoPay (lihat catatan) |
| Pro Tahunan | Rp 399.000/tahun | ~Rp 33.000/bulan, hemat ~33% vs bulanan normal |

### Catatan implementasi pricing

- **Diskon launch berperiode 30 hari**, dihitung dari tanggal Pro launch. Setelah jendela ini berakhir tidak ada harga intro sama sekali, sehingga tidak ada celah abuse lewat pembuatan akun baru. Penentuan berdasarkan tanggal mulai langganan, bukan tanggal registrasi akun.
- Dalam jendela 30 hari, diskon tetap berlaku **sekali per akun**.
- Tidak ada harga founder. Waitlist hanya mendapat pemberitahuan lebih dulu tentang tanggal Pro launch dan jendela diskon.
- Harga bulan kedua **harus ditampilkan eksplisit** di halaman checkout, bukan di fine print. Contoh copy wajib selama jendela diskon: *"Bulan pertama Rp 29.000, selanjutnya Rp 49.000/bulan. Batalkan kapan saja."* Setelah jendela berakhir: *"Rp 49.000/bulan. Batalkan kapan saja."*
- Plan tahunan tidak mendapat diskon launch.
- Harga final divalidasi dengan data survei waitlist sebelum Tahap 3.
- **Perbaikan dari v1.3:** tabel tier lama menulis Rp 129.000/bulan dan Rp 990.000/tahun. Angka tersebut dianggap usang. Angka di tabel ini yang berlaku.
- **Pembayaran dua jalur (usulan, divalidasi di Tahap 2):** payment gateway Midtrans. Subscription API Midtrans mendukung auto-debit hanya untuk kartu dan GoPay (GoPay recurring perlu dikonfigurasi oleh tim Midtrans). Metode lain (VA, QRIS, e-wallet lain) tidak bisa auto-renew, sehingga dilayani sebagai **prepaid per periode** dengan email pengingat sebelum masa aktif habis. Copy "auto-renew" dan "batalkan kapan saja" hanya ditampilkan untuk jalur auto-renew. Plan tahunan didorong sebagai opsi satu kali bayar yang cocok untuk semua metode.
- Biaya tetap per transaksi menekan margin bulan pertama Rp 29.000. Hitung dengan fee schedule resmi Midtrans sebelum harga final.

---

## 9. Pertimbangan Teknis

### 9.1 Infrastruktur dan biaya

- **Sebelum Pro launch:** tetap di tier gratis (Supabase Free, Vercel Hobby, Resend Free) sesuai Section 9.6. Tidak ada upgrade ke plan berbayar hanya demi biaya.
- **Saat Pro launch:** migrasi penuh ke **VPS sendiri** (PostgreSQL dan auth dikelola sendiri; object storage tetap di Cloudflare R2), menggantikan upgrade ke Supabase Pro dan Vercel Pro. Motivasi utama: biaya. Rencana lengkap di Section 9.8. Karena penghematan baru terasa setelah ada pendapatan, migrasi dijadwalkan bersamaan dengan Pro launch, bukan lebih awal.
- **Konsekuensi:** backup, patch keamanan, monitoring, dan uptime menjadi tanggung jawab sendiri. Untuk menekan biaya migrasi, kode dibuat portabel sejak sekarang (Section 9.7).
- **Fallback:** jika migrasi belum siap saat Pro akan menerima pembayaran, upgrade sementara ke Supabase Pro dan Vercel Pro. Vercel Hobby tidak boleh dipakai saat menerima pembayaran.
- Kuota yang perlu dipantau selama di tier gratis: database size, egress, dan file storage. Rujukan angka plan: Free 500 MB DB / 5 GB egress / 1 GB file; Pro 8 GB DB / 250 GB egress / 100 GB file.

### 9.2 Email & autentikasi

- **Auth memakai Better Auth** (bukan Supabase Auth) sejak Tahap 1, di atas Postgres Supabase lewat `DATABASE_URL`. Email verifikasi dan reset password dikirim langsung dari aplikasi lewat Resend, sehingga batas SMTP bawaan Supabase (2 email/jam) tidak relevan.
- Provider email: **Resend**, dengan domain terverifikasi (SPF, DKIM, DMARC). Pantau batas harian dan bulanan plan Resend. Pisahkan email transaksional dan marketing (subdomain berbeda) agar reputasi pengirim terjaga. Broadcast ke waitlist dikirim bertahap karena kuota harian terpakai bersama email transaksional.
- Template email dalam bahasa Indonesia dengan branding PlanYourTrail.run.
- Karena auth berada di aplikasi, migrasi ke VPS tidak mengubah alur email. Server email sendiri tidak dipakai karena masalah deliverability dan reputasi IP.
- **Opsi login:** email + Google OAuth. Verifikasi email tetap diaktifkan untuk melindungi kuota dari akun palsu.
- Terapkan jeda kirim ulang minimal 60 detik per user dan rate limit pada endpoint auth (tabel `rate_limit`, Section 9.7).

### 9.3 Desain penyimpanan rute

- **Jangan simpan GPX mentah di kolom database.** Simpan metadata, metrics, dan **track hasil simplify** (misalnya Douglas-Peucker/downsample). Ini memangkas ukuran jauh dibanding GPX mentah.
- **GPX asli disimpan** supaya user bisa download ulang. Simpan versi ter-gzip di object storage (bukan kolom database) melalui lapisan abstraksi S3-compatible: **Cloudflare R2** (Standard, free tier) sejak Tahap 1, tetap dipakai setelah migrasi ke VPS. Tabel rute hanya menyimpan object key, bukan URL penuh. Track ter-simplify tetap di database untuk render cepat.
- **Downgrade Pro → Free:** semua rute dan file tetap tersimpan, tetapi hanya **3 rute terakhir** (terbaru) yang ditampilkan dan bisa diakses. Rute lainnya berstatus tersembunyi (diarsipkan) dan **muncul kembali saat user upgrade lagi**. Share link **mengikuti** status tampil: link dari rute tersembunyi nonaktif dan aktif lagi saat rute kembali tampil.
- Rute tersembunyi tidak dihitung terhadap limit 3 rute dan tidak bisa diedit selama tersembunyi. Karena data tersimpan tanpa batas, siapkan kebijakan retensi (misalnya pemberitahuan dan penghapusan setelah periode tidak aktif yang panjang) sebelum Tahap 3.
- **Hapus rute = hapus permanen** (rute yang dihapus user sendiri; berbeda dengan rute tersembunyi akibat downgrade), baik baris database maupun file di Storage. Tampilkan konfirmasi *"Rute yang dihapus tidak bisa dikembalikan."*
- **Anonymous yang langsung upgrade ke Pro:** analisis sesi tersebut harus ikut tersimpan. Karena alur registrasi dan checkout memindahkan halaman, simpan hasil analisis dan file sementara (misalnya di browser storage atau area temporary dengan expiry singkat), lalu pindahkan ke akun setelah registrasi/pembayaran berhasil.
- **Batas upload per tier:** Anonymous 5 MB, Free 10 MB, Pro 20 MB. Nilai dibaca dari konfigurasi per tier (bukan di-hardcode), melalui fungsi entitlement yang sama dengan fitur lain.
- Validasi ukuran dilakukan di **client** (pesan error cepat) dan di **server** (jika file diproses di server), karena pengecekan client saja bisa dilewati.
- Saat file melebihi batas tier, tampilkan pesan yang jelas dan CTA yang sesuai: Anonymous → *"File ini lebih dari 5 MB. Daftar gratis untuk upload sampai 10 MB."*; Free → *"File ini lebih dari 10 MB. Daftar early access Pro untuk upload sampai 20 MB."* (berubah jadi CTA upgrade setelah Pro launch).
- Karena GPX asli kini disimpan, kuota **file storage** ikut terpakai. Estimasi kasar: 1.000 user Free × 3 rute × 1–3 MB (sebelum gzip) ≈ 3–9 GB, jauh di bawah kapasitas disk VPS atau object storage yang umum dipakai. Dengan R2 free tier (10 GB-month), kuota storage cukup untuk estimasi ini. Pantau pemakaian dan pasang notifikasi (Section 9.6). Batas upload yang lebih besar menaikkan beban parsing/compute dan potensi storage per rute, jadi pantau pemakaian per user Pro.
- Anonymous tidak menyimpan apa pun sehingga tidak menambah biaya storage.
- Untuk Pro "unlimited", pasang fair-use cap yang longgar (usulan awal 200–500 rute, diputuskan sebelum Tahap 3).
- Weather di-cache dengan TTL pendek dan tidak disimpan permanen.

### 9.4 Weather (untuk Free registered)

- Hanya untuk user login, berlaku untuk semua rute yang dianalisis.
- Cache hasil per lokasi/tanggal dengan TTL pendek untuk menekan biaya API.
- Rate limit per akun: **usulan awal 20 analisis weather per hari per akun** (angka final menyesuaikan kuota dan harga API weather), ditambah budget alert global pada pemakaian API.
- Hourly forecast tetap Pro.

### 9.5 Fondasi entitlement (disiapkan di Tahap 1)

Agar Pro tinggal "dinyalakan" pada Tahap 3 tanpa rewrite:

- Kolom `plan` pada profil user (`free` / `pro`, default `free`).
- Satu fungsi pusat, misalnya `can(user, feature)`, sebagai satu-satunya tempat keputusan akses fitur. Hindari pengecekan `isPro` yang tersebar di komponen.
- Limit rute dibaca dari konfigurasi, bukan angka 3 yang di-hardcode.
- Feature flag untuk setiap fitur Pro, sehingga fitur bisa dikembangkan dan diuji sebelum dirilis.
- Tabel waitlist (user, fitur pemicu, tanggal, hasil survei).
- `can(user, feature)` dan pengecekan kepemilikan rute dijalankan di app layer (bukan hanya RLS), agar otorisasi tetap berlaku setelah migrasi dari Supabase (Section 9.7).

### 9.6 Strategi tool gratis sampai Pro launch

Sebelum Pro launch, stack memakai plan gratis. Asumsi stack: Supabase (database, auth, storage), Resend (email), Vercel (hosting), dan API weather dengan free tier, dipakai sampai migrasi ke VPS saat Pro launch (Section 9.8). Dampaknya ke rencana:

| Tool (plan gratis) | Batas yang relevan | Dampak | Mitigasi |
|---|---|---|---|
| **Supabase Free** | Auto-pause setelah 1 minggu tidak aktif; 500 MB database; **1 GB file storage**; 5 GB egress; tanpa daily backup (backup harian ada di Pro) | Login/simpan gagal saat project pause. GPX asli disimpan di R2, sehingga batas 1 GB file storage Supabase tidak menjadi bottleneck. | Keep-alive berkala (workaround, bukan solusi); backup `pg_dump` terjadwal ke penyimpanan sendiri; pantau kuota; jika ambang tercapai sebelum Pro launch, pilih antara upgrade sementara atau percepat migrasi |
| **Resend Free** | 3.000 email/bulan, **100 email/hari**, 1 domain; kuota harian mencakup email terkirim dan diterima; bounce rate harus di bawah 4% | Lonjakan registrasi dalam sehari melewati 100 email (konfirmasi + reset password) membuat pengiriman berhenti. Email palsu menaikkan bounce rate. | Prioritaskan Google OAuth; verifikasi email aktif; hindari kampanye besar sebelum upgrade; upgrade Resend Pro (~$20/bulan) bila rata-rata harian mendekati batas |
| **Vercel Hobby** | Hanya untuk penggunaan non-komersial pribadi; melewati batas pemakaian dapat memblokir fitur hingga 30 hari | Free launch masih area abu-abu karena produk dirancang untuk monetisasi. **Tidak boleh dipakai saat Pro menerima pembayaran.** | **Keputusan: tetap di Vercel Hobby sampai Pro launch, risiko diterima.** Image Docker dibangun di CI pada setiap PR sehingga pindah hosting bisa dilakukan kapan saja (±1 hari kerja) bila Vercel menegur. Pindah ke VPS saat Pro launch (fallback: Vercel Pro). Opsional: minta konfirmasi tertulis ke support Vercel |
| **API weather (free tier)** | Kuota bergantung penyedia | Jika kuota global habis, weather mati untuk semua user | Cache agresif, rate limit per akun, batas global, dan pesan fallback yang jelas |

**Ambang untuk upgrade (usulan):**
- Supabase: database atau file storage mencapai ~80% kuota, ada kampanye/peluncuran publik, atau project pernah pause saat dipakai user. Respons: upgrade sementara atau percepat migrasi ke VPS (Section 9.8).
- Resend: rata-rata harian mendekati ~70 email, atau ada kampanye yang diperkirakan memicu lonjakan registrasi.
- Vercel: saat ada peringatan batas pemakaian, atau sebelum Pro launch (diselesaikan lewat migrasi ke VPS, bukan Vercel Pro, kecuali fallback).

**Perbandingan biaya saat Pro launch** (perkiraan kasar, cek harga terbaru; Resend Pro ~$20 bila diperlukan berlaku sama di kedua skenario):

| Skenario | Komponen | Perkiraan/bulan | Setara pelanggan Pro (Rp 49.000) |
|---|---|---|---|
| Stack managed (tidak dipilih) | Supabase Pro ~$25 + Vercel Pro ~$20 | ≈ $45, sekitar Rp 700 ribu | ±14 |
| **Self-host VPS (rencana)** | VPS ~4 vCPU / 8 GB ($15–25) + backup offsite ($1–5) | ≈ $15–30, sekitar Rp 250–500 ribu | ±5–10 |

Penghematan ≈ $15–30/bulan, belum menghitung jam kerja migrasi dan operasional, juga belum termasuk biaya payment gateway dan API weather. Karena itu migrasi dijadwalkan saat Pro launch, bukan sebelumnya.

### 9.7 Prinsip portabilitas (hindari lock-in)

Tujuan: migrasi ke VPS cukup mengganti implementasi di balik antarmuka, bukan menulis ulang aplikasi. Berlaku untuk semua kode baru sejak Tahap 1. Kode yang sudah ada (termasuk pipeline analytics harian dan skrip backfill) diaudit terhadap prinsip ini.

**Data layer**
- Semua query lewat satu modul (misalnya `lib/db`). Komponen dan route tidak mengimpor `supabase-js` langsung.
- Akses database lewat koneksi Postgres biasa (`DATABASE_URL`) dengan ORM **Drizzle**. Hindari PostgREST, `.rpc()`, dan realtime.
- Skema dan migrasi disimpan sebagai file di repo, bukan diubah lewat dashboard.
- Hindari `auth.uid()` di policy dan default kolom. RLS hanya lapisan tambahan; otorisasi utama di app layer (`can()` dan cek kepemilikan).
- Aktifkan RLS di semua tabel **tanpa policy** agar akses anon lewat Data API Supabase tertutup. Server terhubung langsung sebagai role owner (bypass RLS). Verifikasi perilaku ini di dokumentasi Supabase dan uji otomatis.
- Di Vercel pakai connection string pooler. Pada mode transaction, driver Postgres umumnya perlu prepared statements dimatikan (cek dokumentasi driver).

**Auth**
- Bungkus di satu antarmuka (`getSession()`, `requireUser()`, `signOut()`). Tidak ada pemanggilan `supabase.auth.*` di luar modul itu.
- Tabel user dikelola Better Auth di schema `public` (bukan `auth.users`). Identifier berupa UUID (cek opsi `generateId` di Better Auth).
- Google OAuth memakai client ID milik sendiri agar redirect URI mudah dipindah.

**Storage**
- S3 SDK di balik antarmuka (`putObject`, `getObject`, `delete`, `signedUrl`). Diarahkan ke endpoint S3 Cloudflare R2.
- Database hanya menyimpan object key, bukan URL penuh.

**Vercel**
- Job terjadwal berupa route biasa (`/api/cron/*`) yang dilindungi secret. Vercel cron hanya pemicu.
- Gunakan Node runtime dan `output: 'standalone'`. Hindari edge runtime, edge middleware yang berat, `@vercel/*` (analytics, KV, Blob, Postgres), dan ISR yang bergantung pada cache Vercel.
- Optimasi gambar pakai `sharp`. Konfigurasi lewat env var, tanpa logika di `vercel.json`.

**Cache dan rate limit**
- Weather cache dan rate limit memakai tabel Postgres dengan TTL (bukan Vercel KV), agar ikut pindah bersama database.

### 9.8 Rencana migrasi ke VPS saat Pro launch

**Arsitektur target**
- VPS (perkiraan 4 vCPU / 8 GB; provider dan lokasi diputuskan di Section 11.2) di belakang Cloudflare (DNS, proxy, WAF, cache static).
- Deploy dengan Coolify atau Dokploy: git push deploy, SSL otomatis, scheduled task, backup DB ke S3. Next.js dalam Docker (`standalone`).
- PostgreSQL dalam container dengan volume, tidak diekspos publik (internal network atau Tailscale).
- Auth: Better Auth (sudah dipakai sejak Tahap 1, tidak ada migrasi akun).
- Object storage: tetap Cloudflare R2 lewat antarmuka S3 (tidak ikut dimigrasi).
- Cron: scheduled task atau crontab yang memanggil route `/api/cron/*`.
- Email tetap Resend.

**Operasional**
- Backup: `pg_dump` harian plus WAL archiving (pgBackRest/WAL-G) ke penyimpanan di provider berbeda dari VPS. Uji restore tiap bulan.
- Monitoring: Uptime Kuma (termasuk endpoint webhook payment gateway, alert ke Telegram), Sentry, snapshot provider mingguan.
- Hardening: SSH key only, firewall hanya 80/443 (via Cloudflare), fail2ban atau CrowdSec, unattended-upgrades.
- Single server berarti single point of failure, jadi siapkan runbook pemulihan. Webhook payment gateway harus idempotent dan ada rekonsiliasi berkala.
- Data pribadi user berada di server sendiri: terapkan pengamanan dan rencana respons insiden sesuai UU PDP (bagian dari workstream legal terpisah).

**Urutan migrasi**
1. **Tahap 1:** `Dockerfile` dan `docker compose` lokal (build Docker di CI pada setiap PR), skrip backup, audit kode terhadap Section 9.7.
2. **Tahap 2:** runbook migrasi, keputusan teknis (Section 11.2), dry-run di VPS staging paralel dengan produksi.
3. **Sebelum Pro launch** (target selesai 2–4 minggu sebelum pembayaran pertama): dump dan restore database, pindah cron, ganti hosting app, cutover DNS dengan TTL rendah. Karena Better Auth dan Drizzle sudah berjalan di atas Postgres sejak Tahap 1, tidak ada migrasi akun, hash password, atau OAuth.
4. **Setelah cutover:** Supabase dan Vercel tetap hidup 1–2 minggu sebagai rollback, lalu dimatikan.

Perkiraan effort implementasi: ~1–2 minggu kerja solo (hosting app, Postgres, backup, DNS). Estimasi ini diperkirakan turun dibanding rencana sebelumnya karena auth dan data layer sudah portabel sejak Tahap 1.

---

## 10. Success Metrics

### Primary (Tahap 1–2)
- Anonymous → Free registered conversion rate: target ≥ 30% (**hipotesis**; ukur baseline 2–4 minggu sebelum gating menyala, lalu tetapkan target)
- Jumlah akun terdaftar dan retensi 30 hari
- Pro waitlist sign-up rate (dari user Free aktif)
- Proporsi user yang mencapai limit 3 rute

### Primary (Tahap 3, setelah Pro launch)
- Free → Pro conversion rate: target awal 5%, **dikalibrasi ulang** dengan data waitlist. Dengan weather kini di Free, trigger upgrade bertumpu pada waypoint management, limit 3 rute, dan cutoff estimator, sehingga target perlu diuji.
- Monthly Recurring Revenue (MRR)
- Pro subscriber retention rate (target ≥ 90% per bulan)
- Annual vs monthly plan ratio (target annual ≥ 40% dari paying users)

### Secondary
- Waktu dari upload GPX pertama ke registrasi
- Fitur Pro mana yang paling sering memicu klik early access
- Waktu dari registrasi ke upgrade Pro
- Biaya per user aktif (weather API, email, storage)

### Guardrail metrics (jangan sampai turun)
- Bounce rate user Free/Anonymous: gating tidak boleh meningkatkan bounce
- Time on page untuk analisis gratis
- Upload GPX rate: jumlah user yang menyelesaikan analisis pertama
- Delivery rate email konfirmasi registrasi

---

## 11. Keputusan & Open Questions

### 11.1 Keputusan

- Waypoint management sudah live. Mulai Free launch: **hanya untuk akun registered, sampai Pro launch** (label "Gratis sampai Pro launch", tanggal sunset diumumkan sedini mungkin), lalu Pro-only. **Anonymous tidak lagi mendapat fitur ini** (CTA registrasi). Waypoint yang sudah dibuat user tetap tampil read-only setelah lock.
- Provider email transaksional: **Resend**.
- File GPX asli **bisa di-download ulang** oleh user (Free & Pro) dari rute tersimpan.
- Batas upload GPX: Anonymous **5 MB**, Free **10 MB**, Pro **20 MB**.
- User Anonymous yang langsung upgrade ke Pro: **analisis sesi tersebut langsung tersimpan**.
- Rute yang dihapus **tidak bisa dikembalikan**, termasuk setelah upgrade ke Pro.
- Share link Pro **berlaku selamanya** (tanpa expiry), selama rute sumbernya masih tampil/aktif.
- Downgrade dari Pro ke Free: **semua rute tetap tersimpan, hanya 3 rute terakhir yang ditampilkan**. Share link mengikuti status tampil (nonaktif untuk rute tersembunyi, aktif lagi saat upgrade).
- Promo: **diskon launch berperiode 30 hari** sejak Pro launch (Rp 29.000 bulan pertama). Tidak ada harga founder dan tidak ada introductory price permanen.
- Sebelum Pro launch, stack memakai **tool plan gratis** (lihat Section 9.6).
- Infrastruktur: **tetap di tier gratis sampai Pro launch**, lalu **migrasi penuh ke VPS sendiri** (PostgreSQL dan auth; object storage tetap di R2) saat Pro launch. Motivasi utama: biaya. Kode dibuat portabel sejak sekarang dengan meminimalkan ketergantungan pada fungsi khusus Supabase dan Vercel (Section 9.7, 9.8).
- Auth: **Better Auth**. ORM: **Drizzle**. Keduanya berjalan di atas Postgres Supabase sejak Tahap 1, tanpa Supabase Auth dan tanpa `supabase-js` (Section 9.7).
- Payment gateway: **Midtrans** (Section 8).
- Hosting: **tetap di Vercel Hobby sampai Pro launch**, pindah ke VPS saat Pro launch. Risiko ToS Hobby diterima.
- Object storage: **Cloudflare R2 (Standard, free tier)** di balik antarmuka S3 mulai Tahap 1. Free tier: 10 GB-month storage, 1 juta operasi Class A, 10 juta operasi Class B per bulan, egress gratis (verifikasi di halaman pricing Cloudflare saat aktivasi). Backblaze B2 hanya dipertimbangkan untuk backup database (E7).

### 11.2 Open Questions

- [ ] Midtrans: ajukan akun production dan permintaan GoPay recurring di Tahap 2; cek syarat dokumen bisnis, fee schedule resmi, dan margin untuk harga Rp 29.000.
- [ ] Rate limit weather per akun: usulan 20 analisis/hari, perlu divalidasi dengan kuota API weather yang dipakai.
- [ ] Kebijakan retensi untuk rute tersembunyi milik akun yang lama tidak aktif setelah downgrade (disimpan berapa lama, dengan pemberitahuan apa).
- [ ] (Opsional) Konfirmasi tertulis ke support Vercel soal status Hobby. Keputusan saat ini: risiko diterima sampai Pro launch.
- [ ] Fair-use cap untuk rute Pro "unlimited" (usulan 200–500 rute).
- [ ] Validasi angka batas upload 5 / 10 / 20 MB dengan distribusi ukuran file GPX yang masuk saat ini.
- [ ] Tanggal target cutover ke VPS (usulan: selesai 2–4 minggu sebelum pembayaran pertama) dan kriteria go/no-go.
- [ ] Provider, spesifikasi, dan lokasi VPS (Singapura atau lokal).
- [ ] R2: pasang notifikasi pemakaian (free tier tidak punya batas keras, kelebihan ditagih), cek apakah aktivasi butuh metode pembayaran, dan putuskan apakah backup database memakai Backblaze B2 (E7).
- [ ] Target RPO/RTO dan kebijakan retensi backup.
- [ ] Kebutuhan HA (replica/standby) setelah Pro launch.

---

## 12. Rencana Implementasi

### 12.1 Migrasi dan komunikasi saat Free launch

Karena saat ini semua fitur terbuka tanpa akun, perubahan tier perlu dikomunikasikan:

- Audit fitur yang saat ini live dan petakan ke tier baru (Anonymous / Free / Pro).
- Fitur yang berpindah ke **Free registered** (weather, waypoint GPX di elevation chart, estimasi pace) diumumkan sebagai "sekarang butuh akun gratis".
- Batas upload Anonymous turun dari 10 MB ke 5 MB. Umumkan bersama perubahan tier, dan pastikan pesan error mengarahkan ke registrasi.
- **Waypoint management saat ini sudah live** untuk semua pengunjung. Mulai Free launch fitur ini **hanya untuk akun registered** (diumumkan sebagai "sekarang butuh akun gratis") dan tersedia sampai Pro launch dengan label "Gratis sampai Pro launch". Umumkan tanggal sunset sedini mungkin setelah tanggal Pro launch ditetapkan. Waypoint buatan user tetap tampil read-only setelah fitur dikunci.
- Fitur yang berstatus **Pro** dinonaktifkan dan tampil "Segera hadir" dengan CTA early access (keputusan: opsi *sembunyikan/coming soon*), kecuali waypoint management yang tetap live untuk akun registered.
- Umumkan perubahan lewat banner di app dan changelog sebelum diberlakukan, dengan tanggal efektif yang jelas.

### Tahap 1 — Launch Free Registered (dekat)

**Foundation**
- Rutinitas operasional tool gratis: keep-alive, backup berkala, dan monitoring kuota dengan ambang upgrade (Section 9.6)
- Auth dengan Better Auth (email + Google OAuth), verifikasi email via Resend
- Integrasi Resend langsung dari aplikasi, template email Bahasa Indonesia, verifikasi domain (SPF/DKIM/DMARC)
- Skema database (Drizzle, migrasi SQL di repo, RLS aktif tanpa policy): profil (`plan`), rute (metadata, metrics, track ter-simplify), waitlist. Otorisasi di app layer (`can()` dan cek kepemilikan), RLS sebagai lapisan tambahan
- Fungsi `can(user, feature)` dan feature flag
- Lapisan portabilitas sesuai Section 9.7: modul data/auth/storage terpisah, Postgres via `DATABASE_URL`, job terjadwal sebagai route biasa, migrasi skema di repo
- `Dockerfile` (Next.js standalone) dan `docker compose` lokal (app + Postgres) sebagai bukti kode berjalan tanpa Vercel/Supabase, dibangun di CI pada setiap PR
- Cloudflare R2 (free tier) sebagai object storage untuk GPX asli, lewat antarmuka S3
- Skrip backup `pg_dump` terjadwal ke penyimpanan sendiri (sekaligus latihan restore)

**Fitur Free**
- Simpan rute (maks 3), hapus rute, akses lintas device
- Weather per sesi untuk user login (cache + rate limit)
- Waypoint GPX di elevation chart
- Estimasi pace dasar

**Gating dan growth**
- Batas ukuran upload per tier (client + server) dan pesan error dengan CTA
- Locked state dan prompt registrasi untuk Anonymous
- Locked state "Segera hadir" + early access waitlist untuk fitur Pro (kecuali waypoint management: live untuk akun registered dengan label "Gratis sampai Pro launch"; Anonymous mendapat CTA registrasi)
- Banner dan changelog perubahan tier
- Analytics dasar (funnel upload → registrasi → simpan → klik waitlist)

### Tahap 2 — Validasi dan Persiapan Pro

- Analisis funnel dan data waitlist; survei harga dan fitur
- Pengembangan fitur Pro di balik feature flag: penguncian waypoint management (aktif saat Pro launch), waypoint buatan user di elevation chart, nutrition & gear notes, cutoff estimator, hourly weather
- Pengembangan fitur Pro lanjutan: export PDF, share link, compare route
- Menyiapkan akun Midtrans (production, GoPay recurring), memutuskan fair-use cap dan kebijakan retensi rute tersembunyi
- Menyusun runbook migrasi ke VPS, memutuskan pilihan teknis (Section 11.2), dan dry-run di VPS staging paralel dengan produksi

### Tahap 3 — Launch Pro (2027)

- Payment gateway, webhook, dan subscription backend (active, cancelled, expired)
- Sinkronisasi `plan` otomatis dari status subscription
- Halaman pricing dan perbandingan tier, upgrade prompt dan checkout
- Email konfirmasi subscription dan receipt
- Aktivasi feature flag Pro, ubah CTA dari waitlist ke upgrade
- Migrasi penuh ke VPS (Section 9.8), selesai minimal 2–4 minggu sebelum menerima pembayaran pertama. Supabase dan Vercel tetap hidup 1–2 minggu sebagai rollback. Fallback: Supabase Pro dan Vercel Pro sementara. Resend Pro bila perlu
- Email pengumuman ke waitlist (tanggal launch dan jendela diskon 30 hari)
- A/B test copy dan penempatan upgrade prompt

### Tahap 4 — Growth (setelah Pro launch)

- Dashboard riwayat analisis
- Optimasi funnel dan retensi
- Evaluasi biaya dan kapasitas VPS (object storage terpisah, replica/standby bila diperlukan)

---

## Lampiran A — Changelog

| Versi | Tanggal | Perubahan |
|---|---|---|
| 1.3 | 8 Juli 2026 | Ditambahkan tier Anonymous vs Free vs Pro. Free registered maks 3 rute. Compare route dikonfirmasi sebagai fitur Pro. |
| 2.0 | 23 Oktober 2026 | Weather per sesi, waypoint GPX di elevation chart, estimasi pace dasar, dan catatan rute dipindah ke Free registered. Hourly weather tetap Pro. Peluncuran bertahap: Free dulu, Pro 2027. Fitur Pro ditampilkan "Segera hadir" dengan early access waitlist. Ditambah Section 9 (pertimbangan teknis: Supabase, custom SMTP, desain penyimpanan, entitlement). Harga disatukan ke Rp 29.000 / Rp 49.000 / Rp 399.000. Section 6, 7, 10, 11, 12 disesuaikan. |
| 2.1 | 23 Oktober 2026 | Batas ukuran upload GPX dibedakan per tier. Section 4.1, 5, 9.3, 11, dan 12 diperbarui. |
| 2.2 | 23 Oktober 2026 | Batas upload final: Anonymous 5 MB, Free 10 MB, Pro 20 MB. Catatan/rename rute dan preferensi tersimpan dihapus dari Free. Ditambah download ulang GPX asli (Free & Pro). Open questions dijawab (Section 11): provider email Resend, GPX asli disimpan, rute dihapus tidak bisa dikembalikan, share link berlaku selamanya selama rute ada, downgrade menyisakan 3 rute, analisis Anonymous tersimpan saat langsung upgrade. Waypoint management dikonfirmasi sudah live dan akan dikunci "Segera hadir". |
| 2.3 | 23 Oktober 2026 | Diskon launch berperiode 30 hari menggantikan introductory price permanen; tidak ada harga founder. Downgrade: semua rute tetap tersimpan, hanya 3 rute terakhir ditampilkan, share link mengikuti. Ditambah Section 9.6 (strategi tool gratis sampai Pro launch: Supabase Free, Resend Free, Vercel Hobby, API weather) beserta ambang upgrade. Section 9.1, 11, dan 12 disesuaikan. |
| 2.4 | 23 Oktober 2026 | Strategi infrastruktur: tetap di tier gratis (Supabase Free, Vercel Hobby, Resend Free) sampai Pro launch, lalu migrasi penuh ke VPS sendiri (PostgreSQL, auth, storage) saat Pro launch, dengan motivasi utama biaya. Keputusan "self-hosted tidak dipertimbangkan" di Section 9.1 dibalik. Ditambah Section 9.7 (prinsip portabilitas: minim dependensi pada fungsi khusus Supabase/Vercel) dan 9.8 (rencana migrasi ke VPS). Section 9.1, 9.2, 9.3, 9.5, 9.6, 11, dan 12 disesuaikan. |
| 2.5 | 26 Oktober 2026 | Waypoint management tetap live seperti sekarang sampai Pro launch (label "Gratis sampai Pro launch", tanggal sunset diumumkan sedini mungkin), lalu dikunci ke Pro; waypoint yang sudah dibuat tetap tampil read-only. Auth: Better Auth. ORM: Drizzle. Keduanya di atas Postgres Supabase sejak Tahap 1, tanpa Supabase Auth dan `supabase-js`; migrasi ke VPS tidak lagi memerlukan migrasi akun. Payment gateway: Midtrans, dengan usulan pembayaran dua jalur (auto-renew kartu/GoPay, prepaid per periode untuk metode lain). Hosting: tetap di Vercel Hobby sampai Pro launch (risiko diterima), pindah ke VPS saat Pro launch. Target konversi Anonymous → Free dijadikan hipotesis dengan baseline 2–4 minggu. Section 4.1, 6, 7, 8, 9.2, 9.6, 9.7, 9.8, 10, 11, dan 12 disesuaikan. |
| 2.6 | 26 Oktober 2026 | Waypoint management **bukan untuk Anonymous**: hanya akun registered yang bisa memakainya, sampai Pro launch, lalu Pro-only (menggantikan keputusan v2.5 yang membiarkannya live untuk semua pengunjung). Anonymous mendapat CTA registrasi. Object storage diputuskan: **Cloudflare R2 (Standard, free tier)** sejak Tahap 1 dan tetap dipakai setelah migrasi VPS; batas 1 GB Supabase Storage tidak lagi relevan. Section 4.1, 5.1, 6.1, 7, 9.1, 9.3, 9.6, 9.7, 9.8, 11, dan 12 disesuaikan. |

---

*PlanYourTrail.run — Dokumen internal. Versi 2.6*
