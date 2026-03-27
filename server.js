const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Koneksi ke PostgreSQL (Sesuaikan password dengan milikmu)
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'rs_sehat',
    password: 'password_database_kamu', 
    port: 5432,
});
app.get('/', (req, res) => {
res.sendFile(path.join(__dirname, 'index.html'));
});
// API: Ambil semua jadwal dokter untuk ditampilkan di Frontend
app.get('/api/jadwal', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT j.id_jadwal, d.nama_dokter, j.hari, j.kuota_maksimal 
            FROM jadwal_praktik j 
            JOIN dokter d ON j.id_dokter = d.id_dokter
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).send("Error mengambil data");
    }
});

// API: Proses Pemesanan (Logika Cek Kuota)
app.post('/api/pesan', async (req, res) => {
    const { id_jadwal, nama_pasien } = req.body;

    try {
        // 1. Cek berapa pasien yang sudah mendaftar di jadwal ini
        const cekKuota = await pool.query(
            'SELECT COUNT(*) as total FROM pemesanan WHERE id_jadwal = $1', 
            [id_jadwal]
        );
        const pasienTerdaftar = parseInt(cekKuota.rows[0].total);

        // 2. Ambil batas kuota maksimal dari jadwal
        const jadwal = await pool.query(
            'SELECT kuota_maksimal FROM jadwal_praktik WHERE id_jadwal = $1', 
            [id_jadwal]
        );
        const kuotaMaksimal = jadwal.rows[0].kuota_maksimal;

        // 3. Logika penolakan jika penuh
        if (pasienTerdaftar >= kuotaMaksimal) {
            return res.status(400).json({ pesan: "Maaf, kuota dokter untuk jadwal ini sudah penuh!" });
        }

        // 4. Jika kosong, masukkan data ke database
        await pool.query(
            'INSERT INTO pemesanan (id_jadwal, nama_pasien) VALUES ($1, $2)', 
            [id_jadwal, nama_pasien]
        );
        
        res.json({ pesan: "Puji Tuhan, pendaftaran berhasil!" });

    } catch (err) {
        console.error(err);
        res.status(500).send("Terjadi kesalahan pada server");
    }
});

app.listen(3000, () => {
    console.log('Server Backend berjalan di http://localhost:3000');
});