# Panduan Integrasi: Mongo Diagram Agnostic Core

Dokumen ini menjelaskan cara mengintegrasikan **Mongo Diagram Core UI** ke dalam project atau package backend Anda (Laravel, Express, NestJS, dll).

## Konsep Integrasi

Mongo Diagram CORE bertindak sebagai **Frontend-as-a-Service**. Project ini menyediakan UI visual, sementara Backend Anda menyediakan data melalui API standar.

## 1. Persiapan Backend (Adapter)

Backend Anda harus menyediakan endpoint API berikut:

| Endpoint | Method | Deskripsi |
| --- | --- | --- |
| `/api/schema` | `GET` | Mengambil data skema (JSON) untuk ditampilkan di diagram. |
| `/api/sync` | `POST` | Menerima payload JSON terbaru dari UI untuk disimpan ke file/DB. |
| `/api/live-db/{id}` | `GET` | (Opsional) Mengambil skema langsung dari koneksi database. |

### Contoh Payload JSON
Format JSON yang diharapkan mengikuti struktur state dari `schemaStore.js`. Contoh minimal:
```json
{
  "databases": [{ "id": "db-1", "name": "MyDatabase", "type": "MySQL" }],
  "activeDatabaseId": "db-1",
  "collections": [],
  "edges": []
}
```

## 2. Inisialisasi di Frontend

Setelah Anda menyertakan build assets dari Mongo Diagram, panggil helper `init` dari global `window`:

```html
<script src="/path/to/mongo-diagram/dist/assets/index.js"></script>
<script>
  window.MongoDiagram.init({
    baseUrl: 'http://localhost:8000', // URL Backend Anda
    headers: {
      'X-CSRF-TOKEN': '...', // Contoh header untuk Laravel
      'Authorization': 'Bearer ...'
    },
    autoFetch: true // Langsung panggil /api/schema setelah init
  });
</script>
```

## 3. Alur Kerja Rekomendasi

1. **Host Project** menyertakan iframe atau div kontainer untuk Mongo Diagram.
2. **Adapter** (e.g. Laravel Package) menyertakan logic untuk membaca direktori `migrations/*.php`.
3. **Adapter** mengubah isi file migrasi menjadi JSON standar Mongo Diagram.
4. **Adapter** mengirim JSON tersebut saat UI memanggil `GET /api/schema`.
5. Saat user mengedit diagram, UI secara otomatis mengirim `POST /api/sync`.
6. **Adapter** menerima JSON, lalu menuliskan kembali perubahannya ke file migrasi.

---

Dengan pola ini, Mongo Diagram tetap bersih dari kode spesifik framework, namun tetap sangat powerful untuk membantu development di ekosistem mna pun.
