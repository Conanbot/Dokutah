-- ============================================================
-- db/schema_extended.sql
-- Schema database lengkap untuk "Belajar Lagi Dok"
-- Scope: Kota Salatiga, Jawa Tengah
--
-- UNTUK HANS: File ini adalah TAMBAHAN / ALTERNATIF dari rs_sehat.sql
-- Kamu bebas menggunakan, memodifikasi, atau mengabaikan file ini.
-- rs_sehat.sql milikmu TIDAK diubah sama sekali.
--
-- Cara pakai:
--   1. Buat database baru:  CREATE DATABASE belajar_lagi_dok;
--   2. Connect ke DB baru:  \c belajar_lagi_dok
--   3. Jalankan file ini:   \i db/schema_extended.sql
-- ============================================================

-- Aktifkan extension untuk UUID (opsional tapi bagus)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── 1. TABEL DOKTER ─────────────────────────────────────────
-- Memperluas tabel dokter milik Hans dengan field tambahan
-- yang dibutuhkan backend (lokasi, kontak, BPJS, rating)
CREATE TABLE IF NOT EXISTS dokter (
    id_dokter       SERIAL          PRIMARY KEY,
    nama_dokter     VARCHAR(150)    NOT NULL,
    spesialis       VARCHAR(100)    NOT NULL DEFAULT 'Umum',
    no_hp           VARCHAR(20),
    email           VARCHAR(100),
    foto_url        TEXT,
    alamat_praktik  TEXT,
    -- Koordinat GPS untuk fitur "dokter terdekat"
    latitude        DECIMAL(10, 7),
    longitude       DECIMAL(10, 7),
    -- Informasi layanan
    terima_bpjs     BOOLEAN         NOT NULL DEFAULT false,
    rating          DECIMAL(2, 1)   CHECK (rating >= 0 AND rating <= 5),
    aktif           BOOLEAN         NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ─── 2. TABEL JADWAL PRAKTIK ─────────────────────────────────
-- Memperluas jadwal_praktik dengan jam mulai, jam selesai, dan referensi faskes
CREATE TABLE IF NOT EXISTS jadwal_praktik (
    id_jadwal       SERIAL          PRIMARY KEY,
    id_dokter       INT             NOT NULL REFERENCES dokter(id_dokter) ON DELETE CASCADE,
    id_faskes       INT,            -- akan di-FK setelah tabel faskes dibuat
    hari            VARCHAR(10)     NOT NULL CHECK (hari IN ('Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu')),
    jam_mulai       TIME            NOT NULL DEFAULT '08:00',
    jam_selesai     TIME            NOT NULL DEFAULT '12:00',
    kuota_maksimal  INT             NOT NULL DEFAULT 20 CHECK (kuota_maksimal > 0),
    aktif           BOOLEAN         NOT NULL DEFAULT true
);

-- ─── 3. TABEL PEMESANAN ──────────────────────────────────────
-- Memperluas pemesanan dengan nomor HP, catatan, nomor antrian
CREATE TABLE IF NOT EXISTS pemesanan (
    id_pemesanan    SERIAL          PRIMARY KEY,
    id_jadwal       INT             NOT NULL REFERENCES jadwal_praktik(id_jadwal) ON DELETE RESTRICT,
    nama_pasien     VARCHAR(150)    NOT NULL,
    no_hp           VARCHAR(20),
    catatan         TEXT,
    nomor_antrian   INT             NOT NULL,
    status          VARCHAR(20)     NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif','selesai','batal')),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    -- Pastikan satu pasien tidak bisa daftar 2x di jadwal yang sama
    UNIQUE (id_jadwal, nama_pasien)
);

-- ─── 4. TABEL FASKES (FASILITAS KESEHATAN) ───────────────────
-- Tabel baru: puskesmas, klinik, RS, apotek di Salatiga
CREATE TABLE IF NOT EXISTS faskes (
    id_faskes       SERIAL          PRIMARY KEY,
    nama            VARCHAR(200)    NOT NULL,
    jenis           VARCHAR(30)     NOT NULL CHECK (jenis IN ('rs','puskesmas','klinik','apotek','gigi','bidan')),
    alamat          TEXT            NOT NULL,
    kelurahan       VARCHAR(100),
    kecamatan       VARCHAR(100),
    kota            VARCHAR(50)     NOT NULL DEFAULT 'Salatiga',
    provinsi        VARCHAR(50)     NOT NULL DEFAULT 'Jawa Tengah',
    no_telepon      VARCHAR(30),
    email           VARCHAR(100),
    website         TEXT,
    latitude        DECIMAL(10, 7)  NOT NULL,
    longitude       DECIMAL(10, 7)  NOT NULL,
    terima_bpjs     BOOLEAN         NOT NULL DEFAULT false,
    -- Jam operasional (format: HH:MM)
    jam_buka        TIME            DEFAULT '07:00',
    jam_tutup       TIME            DEFAULT '21:00',
    buka_24jam      BOOLEAN         NOT NULL DEFAULT false,
    ada_igd         BOOLEAN         NOT NULL DEFAULT false,
    foto_url        TEXT,
    maps_place_id   VARCHAR(200),   -- Google Place ID untuk link ke Google Maps
    rating          DECIMAL(2, 1)   CHECK (rating >= 0 AND rating <= 5),
    aktif           BOOLEAN         NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Tambahkan FK dari jadwal_praktik ke faskes setelah tabel faskes ada
ALTER TABLE jadwal_praktik
    ADD CONSTRAINT fk_jadwal_faskes
    FOREIGN KEY (id_faskes) REFERENCES faskes(id_faskes) ON DELETE SET NULL;

-- ─── 5. TABEL ARTIKEL ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS artikel (
    id_artikel      SERIAL          PRIMARY KEY,
    judul           VARCHAR(300)    NOT NULL,
    slug            VARCHAR(350)    NOT NULL UNIQUE,
    konten          TEXT            NOT NULL,
    ringkasan       VARCHAR(500),
    kategori        VARCHAR(50)     NOT NULL,
    gambar_url      TEXT,
    penulis         VARCHAR(100)    NOT NULL DEFAULT 'Tim Belajar Lagi Dok',
    aktif           BOOLEAN         NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ─── INDEXES ─────────────────────────────────────────────────
-- Mempercepat query yang sering dipakai
CREATE INDEX IF NOT EXISTS idx_dokter_spesialis  ON dokter(spesialis);
CREATE INDEX IF NOT EXISTS idx_faskes_jenis       ON faskes(jenis);
CREATE INDEX IF NOT EXISTS idx_faskes_kecamatan   ON faskes(kecamatan);
CREATE INDEX IF NOT EXISTS idx_jadwal_dokter      ON jadwal_praktik(id_dokter);
CREATE INDEX IF NOT EXISTS idx_pemesanan_jadwal   ON pemesanan(id_jadwal);
CREATE INDEX IF NOT EXISTS idx_artikel_kategori   ON artikel(kategori);
CREATE INDEX IF NOT EXISTS idx_artikel_slug       ON artikel(slug);
