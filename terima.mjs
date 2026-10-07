// Memproses kiriman developer secara otomatis. Dijalankan oleh GitHub Actions.
// Isi kiriman TIDAK pernah dimasukkan ke perintah shell; hanya dibaca sebagai data.
import fs from 'node:fs';

const KAT = ['belanja','keuangan','perjalanan','sosial','hiburan','produktif','game'];
const PEMENDEK = ['bit.ly','tinyurl.com','t.co','goo.gl','cutt.ly','s.id','is.gd','ow.ly','rebrand.ly','shorturl.at','linktr.ee','tiny.cc','rb.gy'];
const MAKS_PER_AKUN = 3;
const FILE = 'apps.json';
const HASIL = 'hasil.txt';

function selesai(ok, pesan){
  fs.writeFileSync(HASIL, pesan + '\n');
  fs.appendFileSync(process.env.GITHUB_OUTPUT || '/dev/null', `ok=${ok ? 'true' : 'false'}\n`);
  console.log(ok ? 'DITERIMA:' : 'DITOLAK:', pesan);
  process.exit(0);
}
const bersih = s => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();

const ev = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
const issue = ev.issue;
if (!issue || !String(issue.title || '').startsWith('Kiriman aplikasi:')) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT || '/dev/null', 'ok=skip\n');
  console.log('Bukan kiriman aplikasi, dilewati.');
  process.exit(0);
}
if (issue.user?.type === 'Bot') selesai(false, 'Kiriman dari bot tidak diterima.');
const penulis = String(issue.user?.login || '');
if (!/^[A-Za-z0-9-]{1,39}$/.test(penulis)) selesai(false, 'Akun pengirim tidak valid.');

const m = String(issue.body || '').match(/```json\s*([\s\S]*?)```/);
if (!m) selesai(false, 'Blok data JSON tidak ditemukan. Kirim lewat formulir di developer.html.');
let e;
try { e = JSON.parse(m[1]); } catch { selesai(false, 'Format data JSON rusak. Kirim ulang lewat formulir di developer.html.'); }
if (!e || typeof e !== 'object') selesai(false, 'Data tidak valid.');

const n = bersih(e.n), d = bersih(e.d), k = String(e.k ?? ''), p = String(e.p ?? '').trim(), u = String(e.u ?? '').trim();
if (n.length < 2 || n.length > 60 || /[<>"]/.test(n)) selesai(false, 'Nama aplikasi harus 2 sampai 60 karakter dan tanpa tanda < > ".');
if (d.length < 10 || d.length > 200 || /[<>]/.test(d)) selesai(false, 'Deskripsi harus 10 sampai 200 karakter dan tanpa tanda < >.');
if (!KAT.includes(k)) selesai(false, 'Kategori tidak dikenal.');
if (p && !/^[A-Za-z0-9._]{3,150}$/.test(p)) selesai(false, 'Nama paket tidak valid.');
let url;
try { url = new URL(u); } catch { selesai(false, 'Tautan tidak valid.'); }
if (url.protocol !== 'https:' || u.length > 300 || /[\s"'<>]/.test(u)) selesai(false, 'Tautan harus diawali https:// dan tanpa spasi.');
const host = url.hostname.toLowerCase();
if (PEMENDEK.some(h => host === h || host.endsWith('.' + h))) selesai(false, 'Pemendek tautan tidak diterima. Pakai tautan asli ke halaman aplikasimu.');

const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
if (!Array.isArray(data.apps)) selesai(false, 'Terjadi kesalahan pada daftar server. Coba lagi nanti.');
const nl = n.toLowerCase();
if (data.apps.some(a => String(a.n).toLowerCase() === nl)) selesai(false, 'Nama aplikasi sudah ada di katalog.');
if (p && data.apps.some(a => a.p && a.p === p)) selesai(false, 'Nama paket itu sudah ada di katalog.');
if (data.apps.some(a => a.u && a.u === u)) selesai(false, 'Tautan itu sudah ada di katalog.');
if (data.apps.filter(a => a.by === penulis).length >= MAKS_PER_AKUN) selesai(false, `Satu akun maksimal ${MAKS_PER_AKUN} aplikasi.`);

data.apps.push({ n, k, d, p, u, c: 1, by: penulis });
data.versi = (Number(data.versi) || 0) + 1;
fs.writeFileSync(FILE, JSON.stringify(data, null, 1) + '\n');
selesai(true, `Aplikasi "${n}" diterima dan akan tampil di AppNesia dalam beberapa menit, dengan label "Belum diverifikasi".`);
