import axios from 'axios';

export const command = ['tambahplu', 'tambahtoko', 'delplu', 'deltoko'];

// Simpan state memori sesi secara global agar tidak ter-reset oleh cache-busting
global.pluTokoSessions = global.pluTokoSessions || {};
// Wajib di-export agar case.js bisa mengecek sesi tanpa harus menebak nama file
export const sessions = global.pluTokoSessions;

export default async function (m, pluginArgs) {
    const { reply, q, cmd, reactm, senderNum, msg, body } = pluginArgs;

    // Proteksi Keamanan: Hanya Owner atau Bot sendiri
    const ownerNum = "6285790374090"; 
    if (senderNum !== ownerNum && !msg.key.fromMe) {
        return reply("⚠️ Akses ditolak! Command ini khusus Admin.");
    }

    // KONFIGURASI GITHUB
    const GITHUB_TOKEN = "Ghp_0pWF1Cwphv5tq0zmUJyAM1qCtaX6fV2bFKHx";
    
    const REPO_PLU = {
        owner: "Marsudi505",
        repo: "Barcodes",
        path: "barcodesheet.json"
    };

    const REPO_TOKO = {
        owner: "Marsudi505",
        repo: "toko-idm",
        path: "toko.json"
    };

    const headers = {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${GITHUB_TOKEN}`
    };

    // Helper: Ambil data dari GitHub
    const getGithubData = async (config) => {
        const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.path}`;
        const res = await axios.get(url, { headers });
        const contentStr = Buffer.from(res.data.content, 'base64').toString('utf-8');
        return { data: JSON.parse(contentStr), sha: res.data.sha, url };
    };

    // Helper: Update data ke GitHub
    const updateGithubData = async (url, sha, newData, commitMessage) => {
        const contentB64 = Buffer.from(JSON.stringify(newData, null, 2)).toString('base64');
        const payload = { message: commitMessage, content: contentB64, sha: sha };
        await axios.put(url, payload, { headers });
    };

    const inputTeks = (body || "").trim();

    // ==========================================
    // INTERCEPTOR SESI TANYA JAWAB (STATE MACHINE)
    // ==========================================
    if (sessions[senderNum]) {
        const state = sessions[senderNum];

        // ------------------------------------
        // LOGIKA SESI: TAMBAH PLU
        // ------------------------------------
        if (state.type === 'tambahplu') {
            if (state.step === 1) {
                state.data.plu = inputTeks;
                state.step = 2;
                return reply("Silahkan masukkan Barcode.\nContoh: *8992903113203*");
            } 
            else if (state.step === 2) {
                state.data.barcode = inputTeks;
                state.step = 3;
                return reply("Silahkan masukkan Nama Barang.\nContoh: *Jempol Sambal Pedas 320Ml*");
            }
            else if (state.step === 3) {
                state.data.nama = inputTeks;
                state.data.gambar = `https://cdn-klik.klikindomaret.com/klik-catalog/product/${state.data.plu}_1.jpg`;
                
                await reactm("⏳");
                try {
                    const { data, sha, url } = await getGithubData(REPO_PLU);
                    data.push(state.data); // Tambahkan item baru ke array
                    await updateGithubData(url, sha, data, `Add PLU: ${state.data.plu}`);
                    
                    delete sessions[senderNum]; // Hapus sesi
                    await reactm("✅");
                    return reply(`✅ *Berhasil tambah PLU baru!*\n\n🔖 PLU: ${state.data.plu}\n🏷️ Barcode: ${state.data.barcode}\n🛍️ Nama: ${state.data.nama}\n🖼️ Link: ${state.data.gambar}`);
                } catch (e) {
                    delete sessions[senderNum];
                    await reactm("❌");
                    return reply("❌ Gagal menyimpan data ke GitHub. Sesi dibatalkan.");
                }
            }
        }

        // ------------------------------------
        // LOGIKA SESI: TAMBAH TOKO
        // ------------------------------------
        else if (state.type === 'tambahtoko') {
            switch(state.step) {
                case 1:
                    state.data.storeCode = inputTeks;
                    state.step = 2;
                    return reply("Silahkan masukkan Tipe Toko (storeType).\nContoh: *MOTHER STORE EXPRESS*");
                case 2:
                    state.data.storeType = inputTeks;
                    state.step = 3;
                    return reply("Silahkan masukkan Nama Toko (storeName).\nContoh: *SALEMBA*");
                case 3:
                    state.data.storeName = inputTeks;
                    state.step = 4;
                    return reply("Silahkan masukkan Kode Indomaret (indomaretStoreCode).\nContoh: *F010*");
                case 4:
                    state.data.indomaretStoreCode = inputTeks;
                    state.step = 5;
                    return reply("Silahkan masukkan Alamat Lengkap.\nContoh: *JL. SALEMBA TENGAH NO. 54A. PASEBAN SENEN JAKARTA PUSAT*");
                case 5:
                    state.data.address = inputTeks;
                    state.step = 6;
                    return reply("Silahkan masukkan Jam Buka.\nContoh: *07:00*");
                case 6:
                    state.data.openingHour = inputTeks;
                    state.step = 7;
                    return reply("Silahkan masukkan Jam Tutup.\nContoh: *21:59*");
                case 7:
                    state.data.closingHour = inputTeks;
                    state.step = 8;
                    return reply("Silahkan masukkan Titik Koordinat Latitude.\nContoh: *-6.193000000000005*");
                case 8:
                    state.data.latitude = parseFloat(inputTeks);
                    state.step = 9;
                    return reply("Silahkan masukkan Titik Koordinat Longitude.\nContoh: *106.8542222222222*");
                case 9:
                    state.data.longitude = parseFloat(inputTeks);
                    state.step = 10;
                    return reply("Apakah toko sedang beroperasi?\nBalas: *true* atau *false*");
                case 10:
                    state.data.operational = inputTeks.toLowerCase() === 'true';
                    state.step = 11;
                    return reply("Apakah toko masuk dalam coverage?\nBalas: *true* atau *false*");
                case 11:
                    state.data.inCoverage = inputTeks.toLowerCase() === 'true';
                    state.step = 12;
                    return reply("Silahkan masukkan Kode DC.\nContoh: *G001*");
                case 12:
                    state.data.dcCode = inputTeks;
                    state.data.googleMaps = `https://www.google.com/maps/search/?api=1&query=${state.data.latitude},${state.data.longitude}`;

                    await reactm("⏳");
                    try {
                        const { data, sha, url } = await getGithubData(REPO_TOKO);
                        // Generate urutan No terakhir
                        const maxNo = data.reduce((max, t) => (t.no > max ? t.no : max), 0);
                        state.data.no = maxNo + 1;

                        // Susun ulang posisi object agar rapi sesuai format
                        const finalData = {
                            no: state.data.no,
                            storeCode: state.data.storeCode,
                            storeType: state.data.storeType,
                            storeName: state.data.storeName,
                            indomaretStoreCode: state.data.indomaretStoreCode,
                            address: state.data.address,
                            openingHour: state.data.openingHour,
                            closingHour: state.data.closingHour,
                            latitude: state.data.latitude,
                            longitude: state.data.longitude,
                            operational: state.data.operational,
                            inCoverage: state.data.inCoverage,
                            dcCode: state.data.dcCode,
                            googleMaps: state.data.googleMaps
                        };

                        data.push(finalData);
                        await updateGithubData(url, sha, data, `Add Toko: ${finalData.storeCode}`);
                        
                        delete sessions[senderNum];
                        await reactm("✅");
                        return reply(`✅ *Berhasil tambah Toko baru!*\n\n🏪 Nama: ${finalData.storeName}\n📦 KDTK: ${finalData.storeCode}\n📍 Maps: ${finalData.googleMaps}`);
                    } catch (e) {
                        delete sessions[senderNum];
                        await reactm("❌");
                        return reply("❌ Gagal menyimpan data ke GitHub. Sesi dibatalkan.");
                    }
            }
        }

        // ------------------------------------
        // LOGIKA SESI: KONFIRMASI HAPUS PLU
        // ------------------------------------
        else if (state.type === 'delplu') {
            if (inputTeks.toLowerCase() === 'y') {
                await reactm("⏳");
                try {
                    const newData = state.json.filter(x => x.plu !== state.plu);
                    await updateGithubData(state.url, state.sha, newData, `Delete PLU: ${state.plu}`);
                    delete sessions[senderNum];
                    await reactm("✅");
                    return reply(`🗑️ Berhasil menghapus PLU ${state.plu} dari database.`);
                } catch (e) {
                    delete sessions[senderNum];
                    return reply("❌ Gagal menghapus PLU dari GitHub.");
                }
            } else {
                delete sessions[senderNum];
                return reply("✅ Penghapusan PLU dibatalkan.");
            }
        }

        // ------------------------------------
        // LOGIKA SESI: KONFIRMASI HAPUS TOKO
        // ------------------------------------
        else if (state.type === 'deltoko') {
            if (inputTeks.toLowerCase() === 'y') {
                await reactm("⏳");
                try {
                    const newData = state.json.filter(x => x.storeCode.toUpperCase() !== state.storeCode);
                    await updateGithubData(state.url, state.sha, newData, `Delete Toko: ${state.storeCode}`);
                    delete sessions[senderNum];
                    await reactm("✅");
                    return reply(`🗑️ Berhasil menghapus KDTK ${state.storeCode} dari database.`);
                } catch (e) {
                    delete sessions[senderNum];
                    return reply("❌ Gagal menghapus Toko dari GitHub.");
                }
            } else {
                delete sessions[senderNum];
                return reply("✅ Penghapusan Toko dibatalkan.");
            }
        }
    }

    // ==========================================
    // TRIGGER COMMAND AWAL
    // ==========================================
    
    if (cmd === 'tambahplu') {
        sessions[senderNum] = { type: 'tambahplu', step: 1, data: {} };
        return reply("Silahkan masukkan PLU.\nContoh: *10000060*");
    }

    if (cmd === 'tambahtoko') {
        sessions[senderNum] = { type: 'tambahtoko', step: 1, data: {} };
        return reply("Silahkan masukkan Kode Toko (storeCode).\nContoh: *F010*");
    }

    if (cmd === 'delplu') {
        const targetPlu = (q || "").trim();
        if (!targetPlu) return reply("⚠️ Format salah.\nContoh: /delplu 10000060");
        
        await reactm("⏳");
        try {
            const { data, sha, url } = await getGithubData(REPO_PLU);
            const item = data.find(x => x.plu === targetPlu);
            
            if (!item) {
                await reactm("❌");
                return reply("❌ PLU tidak ditemukan di database.");
            }

            // Simpan sesi untuk konfirmasi
            sessions[senderNum] = { type: 'delplu', plu: targetPlu, sha, url, json: data };
            await reactm("✅");
            return reply(`⚠️ *KONFIRMASI HAPUS PLU*\n\n🔖 PLU: ${item.plu}\n🛍️ Nama: ${item.nama}\n\nApakah Anda yakin ingin menghapus PLU ini secara permanen dari database?\n\nBalas *Y* untuk Ya, atau *N* untuk Batal.`);
        } catch (e) {
            await reactm("❌");
            return reply("❌ Terjadi kesalahan saat membaca data GitHub.");
        }
    }

    if (cmd === 'deltoko') {
        const targetKode = (q || "").trim().toUpperCase();
        if (!targetKode) return reply("⚠️ Format salah.\nContoh: /deltoko F010");
        
        await reactm("⏳");
        try {
            const { data, sha, url } = await getGithubData(REPO_TOKO);
            const item = data.find(x => x.storeCode.toUpperCase() === targetKode);
            
            if (!item) {
                await reactm("❌");
                return reply("❌ Kode Toko tidak ditemukan di database.");
            }

            // Simpan sesi untuk konfirmasi
            sessions[senderNum] = { type: 'deltoko', storeCode: targetKode, sha, url, json: data };
            await reactm("✅");
            return reply(`⚠️ *KONFIRMASI HAPUS TOKO*\n\n📦 KDTK: ${item.storeCode}\n🏪 Nama: ${item.storeName}\n📍 Alamat: ${item.address}\n\nApakah Anda yakin ingin menghapus Toko ini secara permanen dari database?\n\nBalas *Y* untuk Ya, atau *N* untuk Batal.`);
        } catch (e) {
            await reactm("❌");
            return reply("❌ Terjadi kesalahan saat membaca data GitHub.");
        }
    }
}
