# PlanYourTrail.run — Implementation Plan Tahap 1 (Free Registered)

Versi 1.1 · 26 Oktober 2026 · Mengacu ke PRD v2.6 dan docs/ARCHITECTURE.md

## Asumsi

- Solo dev. 1 sprint = 2 minggu = 8 hari produktif. Skala ulang bila kapasitas berbeda.
- Estimasi dalam ideal days, belum termasuk buffer 20%.
- Fitur analisis sudah live. Yang dikerjakan: gating dan penambahan baru.

## Epics dan task

| Epic | Task utama | Hari |
|---|---|---|
| E0 Foundation | Konvensi repo, lint rules (larang import `supabase-js` dan `@vercel/kv|postgres|blob|edge-config`), env Zod, CI (lint, typecheck, Vitest, Playwright), Dockerfile standalone + compose, build Docker di CI | 4 |
| E1 Data | Skema Drizzle + migrasi, `lib/db` + helper filter `user_id`, RLS aktif semua tabel (uji akses anon ditolak), config pooler, integration test dengan Postgres di CI | 4.5 |
| E2 Auth | Better Auth + adapter Drizzle, Google OAuth, verifikasi email + reset via Resend, SPF/DKIM/DMARC, `requireUser()`, UI sign in/up + halaman akun, test | 8 |
| E3 Entitlements | `config.ts` limit per tier, `can()`, feature flag, test | 2 |
| E4 Saved routes | `lib/storage` (Cloudflare R2), simpan rute (gzip, validasi, limit 3, simplify track), list/detail/hapus, download GPX via signed URL, analisis Anonymous bertahan lewat alur register, test | 9.5 |
| E5 Fitur Free | Gating weather per sesi + cache + rate limit, label waypoint di elevation chart, estimasi pace dasar | 4.5 |
| E6 Gating & growth | Limit upload per tier (client + server), locked state + prompt register, waitlist, komponen "Segera hadir", banner + label "Gratis sampai Pro launch" di waypoint management, event analytics funnel | 8.5 |
| E7 Ops | `pg_dump` terjadwal ke offsite + restore drill, keep-alive, monitor kuota, hardening cron, uptime check | 3.5 |
| E8 QA & launch | E2E alur kritis, security checklist (authz, rate limit, RLS), beta, launch checklist + rollback | 5.5 |
| **Total** | | **50** |

Dengan buffer 20% ≈ 60 hari ≈ 7 sprint (~14 minggu).

## Sprint plan

| Sprint | Isi | Milestone |
|---|---|---|
| S1 | E0 + event analytics (dari E6) + skema/`lib/db` | Baseline funnel mulai terkumpul |
| S2 | Sisa E1, backend E2, config E3 | |
| S3 | UI + test E2, sisa E3, E5 | **M1:** login + gating + weather di staging |
| S4 | E4 (storage, simpan, list, hapus, download, anonymous→register) | |
| S5 | Test E4, E6 | **M2:** feature-complete |
| S6 | Banner, E7, E2E, security checklist | |
| S7 | Beta (1 minggu kalender), launch checklist, buffer | **M3:** public Free launch |

Event analytics sengaja di S1: baseline konversi butuh 2–4 minggu data sebelum gating menyala.

## Dependency dengan lead time (mulai di S1)

- Verifikasi domain Resend + DNS (SPF/DKIM/DMARC)
- Google OAuth consent screen (cek syarat verifikasi untuk publik)
- Akun Cloudflare R2 + bucket (free tier; pasang notifikasi pemakaian, cek apakah aktivasi butuh metode pembayaran)

## Cut line bila telat (dibuang dari atas)

1. Survei waitlist
2. Halaman changelog (banner saja cukup)
3. Estimasi pace dasar
4. Label waypoint di elevation chart

## Definition of Done (semua task)

- [ ] Tipe lengkap, input divalidasi Zod di setiap boundary
- [ ] Authz diuji (user A tidak bisa akses data user B)
- [ ] Unit/integration test lulus di CI, termasuk build Docker
- [ ] Perubahan DB lewat file migrasi; migrasi yang sudah ter-apply tidak diedit
- [ ] Loading, error, dan empty state ada
- [ ] Event analytics terpasang bila relevan ke funnel
- [ ] Preview deploy jalan

## Repo

```
app/
  (marketing)/  (app)/analyze  (app)/routes  (app)/account
  api/auth/[...all]  api/cron/*  api/routes/[id]/gpx  api/health
lib/
  db/  auth/  storage/  entitlements/  email/  weather/  rate-limit/  env.ts
drizzle/            # migrasi SQL
tests/              # unit + integration (Vitest)
e2e/                # Playwright
docs/
Dockerfile  docker-compose.yml  .github/workflows/
```

## Branching dan konvensi

- Trunk-based. Branch pendek, PR wajib lulus CI sebelum merge ke `main`. `main` deploy ke production (Vercel), setiap PR dapat preview. Conventional Commits.
- Server Actions mengembalikan `{ ok: true, data } | { ok: false, error }`.
- Tidak ada logika bisnis di komponen UI.
- Semua env lewat `lib/env.ts`.
- Akses DB, auth, dan storage hanya lewat modul `lib/*`.
- Audit kode lama terhadap PRD Section 9.7: lint rule `no-restricted-imports` mulai `warn` (daftar temuan = daftar audit), naikkan ke `error` di akhir S2.
