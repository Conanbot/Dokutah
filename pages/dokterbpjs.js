import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'


export default function DokterBPJS() {
  return <h1>Dokter BPJS Page Works</h1>
}

export default function DokterBPJS() {
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('')

  async function fetchDoctors() {
    setLoading(true)

    let query = supabase
      .from('doctors')
      .select(`
        id,
        name,
        specializations(name),
        healthcare_facilities(name)
      `)

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('ERROR:', error)
      setDoctors([])
    } else {
      setDoctors(data)
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchDoctors()
  }, [search])

  return (
    <div style={{ padding: '40px' }}>
      <h1>Pilih Dokter BPJS</h1>

      <input
        placeholder="Cari nama dokter..."
        onChange={(e) => setSearch(e.target.value)}
        style={{ padding: '10px', width: '300px' }}
      />

      {loading ? (
        <p>Memuat daftar dokter...</p>
      ) : doctors.length === 0 ? (
        <p>Dokter tidak ditemukan</p>
      ) : (
        doctors.map((doc) => (
          <div key={doc.id} style={{ marginTop: '20px' }}>
            <h3>{doc.name}</h3>
            <p>Spesialis: {doc.specializations?.name}</p>
            <p>Fasilitas: {doc.healthcare_facilities?.name}</p>
          </div>
        ))
      )}
    </div>
  )
}