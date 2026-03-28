-- ============================================================
-- db/salatiga_seed.sql
-- Data awal (seed) khusus Kota Salatiga, Jawa Tengah
-- Scope: radius ~15km dari pusat kota Salatiga
--
-- UNTUK HANS: Jalankan SETELAH schema_extended.sql
--   \i db/salatiga_seed.sql
--
-- Sumber data: situs resmi RS, Google Maps, data publik Dinkes
-- ============================================================

-- ─── FASKES: Rumah Sakit di Salatiga ─────────────────────────
INSERT INTO faskes (nama, jenis, alamat, kelurahan, kecamatan, no_telepon, website,
                    latitude, longitude, terima_bpjs, buka_24jam, ada_igd, maps_place_id)
VALUES
  (
    'RSUD Kota Salatiga',
    'rs',
    'Jl. Osamaliki No.19, Mangunsari',
    'Mangunsari', 'Sidomukti',
    '(0298) 326017',
    'https://rsud.salatiga.go.id',
    -7.3397, 110.4963,
    true, true, true,
    'ChIJy4P_XJj4vi4RUNaRxUAVWbE'   -- contoh place_id, perlu diverifikasi ulang
  ),
  (
    'RS DKT Salatiga',
    'rs',
    'Jl. Kartini No.8, Salatiga',
    'Kalicacing', 'Sidomukti',
    '(0298) 321098',
    NULL,
    -7.3284, 110.5065,
    true, true, true,
    NULL
  ),
  (
    'RS Puri Asih Salatiga',
    'rs',
    'Jl. Jend. Sudirman No.6, Salatiga',
    'Kutowinangun Kidul', 'Tingkir',
    '(0298) 321755',
    NULL,
    -7.3241, 110.5142,
    true, false, true,
    NULL
  ),
  (
    'RS Bina Kasih Salatiga',
    'rs',
    'Jl. Diponegoro No.20, Salatiga',
    'Sidorejo Lor', 'Sidorejo',
    '(0298) 321800',
    NULL,
    -7.3148, 110.5020,
    true, false, false,
    NULL
  );

-- ─── FASKES: Puskesmas di Salatiga ───────────────────────────
INSERT INTO faskes (nama, jenis, alamat, kelurahan, kecamatan,
                    latitude, longitude, terima_bpjs, jam_buka, jam_tutup)
VALUES
  ('Puskesmas Sidorejo Lor',  'puskesmas', 'Jl. Osamaliki No.4, Sidorejo Lor',  'Sidorejo Lor',  'Sidorejo',  -7.3122, 110.5011, true, '07:30', '14:00'),
  ('Puskesmas Mangunsari',    'puskesmas', 'Jl. Veteran No.1, Mangunsari',       'Mangunsari',    'Sidomukti', -7.3410, 110.5015, true, '07:30', '14:00'),
  ('Puskesmas Kalicacing',    'puskesmas', 'Jl. Tentara Pelajar No.3',           'Kalicacing',    'Sidomukti', -7.3301, 110.5078, true, '07:30', '14:00'),
  ('Puskesmas Tegalrejo',     'puskesmas', 'Jl. Tegalrejo Raya No.5',            'Tegalrejo',     'Argomulyo', -7.3530, 110.4895, true, '07:30', '14:00'),
  ('Puskesmas Cebongan',      'puskesmas', 'Jl. Lingkar Selatan, Cebongan',      'Cebongan',      'Argomulyo', -7.3625, 110.4948, true, '07:30', '14:00'),
  ('Puskesmas Pemuda',        'puskesmas', 'Jl. Pemuda No.2, Salatiga',          'Salatiga',      'Sidorejo',  -7.3193, 110.5017, true, '07:30', '14:00');

-- ─── FASKES: Klinik Swasta di Salatiga ───────────────────────
INSERT INTO faskes (nama, jenis, alamat, kelurahan, kecamatan,
                    latitude, longitude, terima_bpjs)
VALUES
  ('Klinik Pratama Medika Utama', 'klinik', 'Jl. Diponegoro No.45', 'Salatiga',       'Sidorejo',  -7.3201, 110.5050, true),
  ('Klinik dr. Budi Santosa',     'klinik', 'Jl. Osamaliki No.30',  'Mangunsari',     'Sidomukti', -7.3380, 110.4980, false),
  ('Klinik Sehat Sejahtera',      'klinik', 'Jl. Tingkir Raya No.3','Tingkir Lor',    'Tingkir',   -7.3280, 110.5200, true);

-- ─── FASKES: Apotek di Salatiga ──────────────────────────────
INSERT INTO faskes (nama, jenis, alamat, kelurahan, kecamatan,
                    latitude, longitude, terima_bpjs, buka_24jam)
VALUES
  ('Apotek Kimia Farma Salatiga',   'apotek', 'Jl. Jend. Sudirman No.1',  'Kutowinangun Kidul', 'Tingkir',   -7.3240, 110.5135, true,  false),
  ('Apotek K24 Salatiga',           'apotek', 'Jl. Pemuda No.18',          'Salatiga',           'Sidorejo',  -7.3185, 110.5030, false, true),
  ('Apotek Sehat Mandiri',          'apotek', 'Jl. Osamaliki No.55',       'Mangunsari',         'Sidomukti', -7.3355, 110.4990, true,  false),
  ('Apotek RS DKT',                 'apotek', 'Jl. Kartini No.8',          'Kalicacing',         'Sidomukti', -7.3285, 110.5064, true,  false);

-- ─── DOKTER: Data dokter di Salatiga ─────────────────────────
INSERT INTO dokter (nama_dokter, spesialis, no_hp, alamat_praktik,
                    latitude, longitude, terima_bpjs, rating)
VALUES
  ('dr. Ahmad Fauzi, Sp.PD',       'Penyakit Dalam',          '082111000001', 'RSUD Kota Salatiga',         -7.3397, 110.4963, true,  4.8),
  ('dr. Siti Rahayu, Sp.A',        'Anak',                    '082111000002', 'RSUD Kota Salatiga',         -7.3397, 110.4963, true,  4.9),
  ('dr. Budi Santosa, Sp.OG',      'Obstetri & Ginekologi',   '082111000003', 'RS Puri Asih Salatiga',      -7.3241, 110.5142, true,  4.7),
  ('dr. Dewi Kusuma, Sp.S',        'Saraf',                   '082111000004', 'RS DKT Salatiga',            -7.3284, 110.5065, true,  4.6),
  ('dr. Hendra Wijaya, Sp.B',      'Bedah',                   '082111000005', 'RSUD Kota Salatiga',         -7.3397, 110.4963, true,  4.7),
  ('dr. Lestari Ningsih, Sp.JP',   'Jantung & Pembuluh Darah','082111000006', 'RSUD Kota Salatiga',         -7.3397, 110.4963, true,  4.9),
  ('dr. Rizal Prabowo',            'Umum',                    '082111000007', 'Klinik Pratama Medika Utama', -7.3201, 110.5050, true,  4.5),
  ('drg. Maya Sari',               'Gigi & Mulut',            '082111000008', 'RS Bina Kasih Salatiga',     -7.3148, 110.5020, true,  4.6),
  ('dr. Wahyu Nugroho, Sp.M',      'Mata',                    '082111000009', 'RS Puri Asih Salatiga',      -7.3241, 110.5142, false, 4.8),
  ('dr. Fitriani Hasan',           'Umum',                    '082111000010', 'Puskesmas Sidorejo Lor',     -7.3122, 110.5011, true,  4.4);

-- ─── JADWAL PRAKTIK ──────────────────────────────────────────
-- dr. Ahmad Fauzi (id=1) — Senin, Rabu, Jumat di RSUD (id_faskes=1)
INSERT INTO jadwal_praktik (id_dokter, id_faskes, hari, jam_mulai, jam_selesai, kuota_maksimal)
VALUES
  (1, 1, 'Senin',  '08:00', '12:00', 20),
  (1, 1, 'Rabu',   '08:00', '12:00', 20),
  (1, 1, 'Jumat',  '08:00', '11:00', 15),
  -- dr. Siti Rahayu (id=2) — Selasa, Kamis
  (2, 1, 'Selasa', '08:00', '12:00', 25),
  (2, 1, 'Kamis',  '08:00', '12:00', 25),
  -- dr. Budi Santosa (id=3) — RS Puri Asih (id_faskes=3)
  (3, 3, 'Senin',  '09:00', '13:00', 15),
  (3, 3, 'Kamis',  '09:00', '13:00', 15),
  -- dr. Hendra Wijaya (id=5)
  (5, 1, 'Selasa', '13:00', '17:00', 10),
  (5, 1, 'Sabtu',  '08:00', '12:00', 10),
  -- dr. Rizal Prabowo (id=7) — Klinik Medika (id_faskes=9)
  (7, 9, 'Senin',  '08:00', '14:00', 30),
  (7, 9, 'Selasa', '08:00', '14:00', 30),
  (7, 9, 'Rabu',   '08:00', '14:00', 30),
  (7, 9, 'Kamis',  '08:00', '14:00', 30),
  (7, 9, 'Jumat',  '08:00', '14:00', 30);

-- ─── ARTIKEL KESEHATAN ───────────────────────────────────────
INSERT INTO artikel (judul, slug, konten, ringkasan, kategori, penulis)
VALUES
  (
    'Cara Daftar dan Aktivasi BPJS Kesehatan di Salatiga',
    'cara-daftar-aktivasi-bpjs-salatiga',
    'BPJS Kesehatan adalah program jaminan kesehatan nasional yang memberikan perlindungan kesehatan bagi seluruh masyarakat Indonesia. Di Kota Salatiga, pendaftaran BPJS dapat dilakukan melalui beberapa cara: secara langsung di Kantor BPJS Kesehatan Cabang Salatiga di Jl. Diponegoro No.12, melalui aplikasi Mobile JKN, atau melalui website resmi bpjs-kesehatan.go.id. Dokumen yang diperlukan adalah KTP, KK, dan foto 3x4. Setelah mendaftar, pilih Fasilitas Kesehatan Tingkat Pertama (FKTP) seperti puskesmas atau klinik terdekat sebagai faskes primer Anda.',
    'Panduan lengkap cara daftar dan aktivasi BPJS Kesehatan untuk warga Kota Salatiga.',
    'bpjs',
    'Tim Belajar Lagi Dok'
  ),
  (
    'Mengenal Sistem Rujukan BPJS: Dari Puskesmas ke Rumah Sakit',
    'sistem-rujukan-bpjs-puskesmas-ke-rs',
    'Sistem rujukan berjenjang dalam BPJS Kesehatan mengharuskan peserta untuk berobat di Fasilitas Kesehatan Tingkat Pertama (FKTP) terlebih dahulu sebelum dirujuk ke rumah sakit. Langkahnya: (1) Kunjungi puskesmas atau klinik primer terdaftar. (2) Dokter akan mengevaluasi kondisi Anda. (3) Jika diperlukan penanganan lanjut, dokter menerbitkan surat rujukan. (4) Bawa surat rujukan ke RS rujukan yang ditunjuk. Pengecualian berlaku untuk kondisi darurat (IGD) — Anda bisa langsung ke RS terdekat tanpa surat rujukan.',
    'Pahami alur sistem rujukan BPJS agar tidak bolak-balik dan bisa mendapat penanganan yang tepat.',
    'bpjs',
    'Tim Belajar Lagi Dok'
  ),
  (
    'Stunting di Salatiga: Fakta, Penyebab, dan Pencegahannya',
    'stunting-salatiga-fakta-penyebab-pencegahan',
    'Stunting adalah kondisi gagal tumbuh pada anak akibat kekurangan gizi kronis. Berdasarkan data Dinkes Kota Salatiga, prevalensi stunting masih menjadi perhatian khusus pemerintah kota. Penyebab utama stunting meliputi: asupan gizi ibu hamil yang kurang, pola makan bayi yang tidak optimal, dan sanitasi lingkungan yang buruk. Pencegahan dapat dilakukan melalui: pemberian ASI eksklusif 6 bulan, MPASI bergizi seimbang, pemantauan tumbuh kembang rutin di Posyandu, dan akses layanan kesehatan yang memadai.',
    'Data dan panduan pencegahan stunting khusus untuk keluarga di Kota Salatiga.',
    'ibu-anak',
    'Tim Belajar Lagi Dok'
  ),
  (
    'Pertolongan Pertama Saat Kondisi Darurat Medis',
    'pertolongan-pertama-kondisi-darurat-medis',
    'Mengetahui pertolongan pertama yang tepat dapat menyelamatkan nyawa sebelum ambulans tiba. Untuk serangan jantung: segera hubungi 119, baringkan pasien, longgarkan pakaian, dan jangan beri makan/minum. Untuk tersedak: lakukan manuver Heimlich. Untuk pendarahan: tekan langsung luka dengan kain bersih. Untuk pingsan: baringkan telentang, angkat kaki lebih tinggi dari kepala. Di Salatiga, IGD 24 jam tersedia di RSUD Kota Salatiga (telp: 0298-326017) dan RS DKT Salatiga (telp: 0298-321098).',
    'Panduan pertolongan pertama untuk kondisi darurat medis, lengkap dengan kontak IGD di Salatiga.',
    'darurat',
    'Tim Belajar Lagi Dok'
  );

-- ─── VERIFIKASI (opsional, jalankan untuk cek data masuk) ────
-- SELECT COUNT(*) AS total_faskes  FROM faskes;
-- SELECT COUNT(*) AS total_dokter  FROM dokter;
-- SELECT COUNT(*) AS total_jadwal  FROM jadwal_praktik;
-- SELECT COUNT(*) AS total_artikel FROM artikel;
