-- Buat Tabel
CREATE TABLE dokter (
    id_dokter SERIAL PRIMARY KEY,
    nama_dokter VARCHAR(100)
);

CREATE TABLE jadwal_praktik (
    id_jadwal SERIAL PRIMARY KEY,
    id_dokter INT REFERENCES dokter(id_dokter),
    hari VARCHAR(20),
    kuota_maksimal INT
);

CREATE TABLE pemesanan (
    id_pemesanan SERIAL PRIMARY KEY,
    id_jadwal INT REFERENCES jadwal_praktik(id_jadwal),
    nama_pasien VARCHAR(100)
);

-- Insert Data Dummy untuk Dites
INSERT INTO dokter (nama_dokter) VALUES ('Dr. Andi (Sp.PD)'), ('Dr. Budi (Sp.G)');
INSERT INTO jadwal_praktik (id_dokter, hari, kuota_maksimal) VALUES (1, 'Senin', 2); -- Kuota hanya 2 untuk test