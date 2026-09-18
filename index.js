/**
 * 🚀 INDICA PROJECT - V20.9 (ULTIMATE EDITION + REGIS VIP)
 * Integrasi BAWX + Dynamic Mode + Global /v & /moderegis
 * + Triple Engine Integration (CO V1 Estafet, CO V2, & CO iPhone Mode)
 * + Supabase Fallback Image System + FIXED DEAD SOCKET QUEUE
 * + 🚨 REGIS PERSISTENT MODE (ANTI OVERHEAT)
 * [UPDATE iOS FIX] Fake Quote & Forwarding Score DIHAPUS 100% agar teks muncul di iPhone.
 * [OPTIMIZATION] Memory Cache for Speed.
 * + [NEW] ANTI-DELETE MEDIA KE NOMOR OWNER
 */

import { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, getContentType, DisconnectReason, downloadContentFromMessage } from "@whiskeysockets/baileys";
import pino from "pino";
import chalk from "chalk";
import config from "./config.js";
import fs from "fs";
import os from "os"; 
import { spawn } from "child_process";
import axios from "axios";
import { createRequire } from "module";
import readline from "readline";

// 🔥 IMPORT KETIGA MESIN CO 🔥
import { initTG, handleCoCommand } from "./co.js";
import { initTG2, handleCo2Command } from "./co2.js"; 
import { initTG_IP, handleCoIpCommand } from "./coip.js"; 

const require = createRequire(import.meta.url);
const Jimp = require("jimp");
const bwipjs = require("bwip-js");

const TARGET_GROUP_IDS = ["120363406018124885@g.us", "120363424305896248@g.us"]; 
const ADMIN_NUMBERS = ["175058655965193", "628553056669", "7289096413331"];
const MENU_IMAGE = "https://files.catbox.moe/cqju51.jpg";
const FILE_ALLOWED_USERS = './allowed_users.json'; 
const FILE_USER_MODE = './usermode.json'; 

const WORK_DIR = '/storage/emulated/0/klik/';
const FILE_TOKO = WORK_DIR + 'toko.txt';
const FILE_AKUN = WORK_DIR + 'akun.txt'; 
const COMMAND_RUN = 'klik'; 
const COMMAND_ARGS = []; 

// --- CACHE UNTUK INDEX ---
let allowedUsersCache = null;
let userModeCache = null;

// ============================================================
// 🗄️ KONFIGURASI SUPABASE (FALLBACK GAMBAR)
// ============================================================
const SUPABASE_URL = config.SUPABASE_URL;
const SUPABASE_KEY = config.SUPABASE_KEY;

async function getSupabaseImage(plu) {
    try {
        const res = await axios.get(`${SUPABASE_URL}/rest/v1/Produk?plu=eq.${plu}&select=image_url`, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
            timeout: 5000
        });
        if (res.data && res.data.length > 0 && res.data[0].image_url) {
            return res.data[0].image_url;
        }
    } catch (e) { return null; } return null;
}

let queue = [];
let isProcessing = false;
let currentAkunIndex = 1; 
const regisSessions = {}; // Tempat menyimpan state persistent mode regis

function getTotalAkun() {
    try { const isi = fs.readFileSync(FILE_AKUN, 'utf-8'); return isi.split('\n').filter(line => line.trim() !== '').length || 1; } catch (e) { return 1; }
}

function getNomorAkun(index) {
    try {
        const isi = fs.readFileSync(FILE_AKUN, 'utf-8');
        const baris = isi.split('\n').filter(line => line.trim() !== '');
        if (index > 0 && index <= baris.length) {
            return baris[index - 1].split(':')[0]; 
        }
        return "Tidak Diketahui";
    } catch (e) { return "Error Membaca File"; }
}

function getAllowedUsers() {
    if (allowedUsersCache) return allowedUsersCache;
    try { 
        if (!fs.existsSync(FILE_ALLOWED_USERS)) { fs.writeFileSync(FILE_ALLOWED_USERS, JSON.stringify([])); allowedUsersCache = []; return []; } 
        allowedUsersCache = JSON.parse(fs.readFileSync(FILE_ALLOWED_USERS, 'utf-8'));
        return allowedUsersCache;
    } catch (e) { return []; }
}
function addAllowedUser(id) {
    const users = getAllowedUsers(); if (!users.includes(id)) { users.push(id); allowedUsersCache = users; fs.writeFileSync(FILE_ALLOWED_USERS, JSON.stringify(users, null, 2)); return true; } return false;
}

function loadUserMode() {
    if (userModeCache) return userModeCache;
    try { if (!fs.existsSync(FILE_USER_MODE)) fs.writeFileSync(FILE_USER_MODE, JSON.stringify({})); userModeCache = JSON.parse(fs.readFileSync(FILE_USER_MODE, 'utf-8')); return userModeCache; } catch (e) { return {}; }
}
function saveUserMode(data) { userModeCache = data; fs.writeFileSync(FILE_USER_MODE, JSON.stringify(data, null, 2)); }

function printBanner() {
    process.stdout.write('\x1Bc');
    console.log(chalk.cyan(`██╗███╗   ██╗██████╗ ██╗ ██████╗ █████╗ \n██║████╗  ██║██╔══██╗██║██╔════╝██╔══██╗\n██║██╔██╗ ██║██║  ██║██║██║     ███████║\n██║██║╚██╗██║██║  ██║██║██║     ██╔══██║\n██║██║ ╚████║██████╔╝██║╚██████╗██║  ██║\n╚═╝╚═╝  ╚═══╝╚═════╝ ╚═╝ ╚═════╝╚═╝  ╚═╝`));
    console.log(chalk.green(`  STATUS: READY | MODE: V20.9 (SUPABASE FALLBACK + REGIS VIP + OPTIMIZED)`));
}

let waSocketGlobal; 
const messageCache = new Map(); 

async function startProgressBar(jid, customText = "Memproses data...", msgQuoted = null) {
    let { key } = await waSocketGlobal.sendMessage(jid, { text: `[▒▒▒▒▒▒▒▒▒▒] 0% - ${customText}` }, { quoted: msgQuoted });
    let progress = 0;
    const interval = setInterval(async () => {
        progress += 10; if (progress > 90) progress = 90;
        let bar = "█".repeat(progress / 10) + "▒".repeat(10 - (progress / 10));
        try { await waSocketGlobal.sendMessage(jid, { text: `[${bar}] ${progress}% - ${customText}`, edit: key }); } catch (e) { clearInterval(interval); }
    }, 2000); return { interval, key };
}

async function generateNewBarcode(number) {
    if (!number || number === "GAGAL_BACA") return null;
    const outputPath = `./temp_barcode_${Date.now()}.png`;
    try {
        const buffer = await bwipjs.toBuffer({ bcid: 'code128', text: number, scale: 3, height: 15, includetext: true, textxalign: 'center', backgroundcolor: 'FFFFFF', padding: 10 });
        fs.writeFileSync(outputPath, buffer); return outputPath;
    } catch (err) { return null; }
}

async function generateBarcodeWithLabel(number, label) {
    if (!number || number === "GAGAL_BACA") return null;
    const outputPath = `./temp_barcode_labeled_${Date.now()}.png`;
    const targetWidth = 1000;
    const barcodeHeight = 200;
    const labelHeight = 48;
    try {
        const barcodeBuffer = await bwipjs.toBuffer({ bcid: 'code128', text: number, scale: 4, height: 20, includetext: false, backgroundcolor: 'FFFFFF', padding: 8 });
        const barcodeImg = await Jimp.read(barcodeBuffer);
        const barcodeResized = barcodeImg.clone().resize(targetWidth, barcodeHeight);
        
        const canvas = new Jimp(targetWidth, barcodeHeight + labelHeight, 0xFFFFFFFF);
        canvas.composite(barcodeResized, 0, 0);
        
        const font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
        const textWidth = Jimp.measureText(font, label);
        const textX = Math.max(0, (targetWidth - textWidth) / 2);
        canvas.print(font, textX, barcodeHeight + 2, label);
        
        await canvas.writeAsync(outputPath);
        return outputPath;
    } catch (err) { return null; }
}

async function sendMenu(wa, jid, sender, pushName, isAdmin, msgQuoted) {
    const userId = sender.split('@')[0];
    let menuText = `┏━━◪ *INDICA PROJECT (Normal Mode)*\n┃\n┣ Halo, @${userId}\n┣ Link Order New Member :\n┣ wa.me/6285xxxxx090\n┃\n┣ /plu - Detail produk\n┣ /stok (plu) (toko)\n┣ /caritoko - Cari detail toko\n┣ /scan - Scan Member Poinku\n┣ /fairs - Cek Promo Fair\n┣ /moderegis - Mode Registrasi Persistent\n┣ /v - Buka pesan sekali lihat\n┣ /ping - Cek Status Bot\n┣ /modeco - Masuk ke Mode Transaksi V1\n┣ /modeco2 - Masuk ke Mode Transaksi V2\n┣ /modeip - Masuk Mode iPhone (Aman iOS)\n┃`;
    if (isAdmin) menuText += `\n┣ [ ADMIN MODE ]\n┣ /add <id> - Beri akses Grup\n┃`;
    menuText += `\n┃Jangan lupa coba web kami juga di : klikidm.my.id\n┗━━◪ _Power by INDICA PROJECT_`;
    
    await wa.sendMessage(jid, { image: { url: MENU_IMAGE }, caption: menuText, mentions: [sender] }, { quoted: msgQuoted });
}

const question = (text) => { const rl = readline.createInterface({ input: process.stdin, output: process.stdout }); return new Promise((resolve) => { rl.question(text, (answer) => { rl.close(); resolve(answer); }); }); };

async function startBot() {
    console.log(chalk.yellow('\n[*] Menyiapkan koneksi WhatsApp...'));
    const { state, saveCreds } = await useMultiFileAuthState("session_auth");
    const { version } = await fetchLatestBaileysVersion();

    const wa = makeWASocket({ logger: pino({ level: "silent" }), printQRInTerminal: false, auth: state, browser: ["Ubuntu", "Chrome", "20.0.04"], version, syncFullHistory: false });
    waSocketGlobal = wa;
    
    getAllowedUsers();
    loadUserMode();

    await initTG(wa);
    await initTG2(wa); 
    await initTG_IP(wa);

    if (!wa.authState.creds.registered) {
        setTimeout(async () => {
            try {
                const phoneNumber = await question(chalk.yellow("\n📞 Masukkan nomor (awali 62): "));
                let code = await wa.requestPairingCode(phoneNumber.trim(), "SUDIPAIR");
                console.log(chalk.green.bold(`\n🎁 KODE PAIRING ANDA: ${code}\n`));
            } catch (err) { console.error(chalk.red("Gagal mendapatkan kode pairing:"), err); }
        }, 4000);
    }

    wa.ev.on("creds.update", saveCreds);
    wa.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === "close") {
            const reason = lastDisconnect?.error?.output?.statusCode;
            if (reason !== DisconnectReason.loggedOut) startBot();
        } else if (connection === "open") { printBanner(); }
    });

    wa.ev.on("messages.upsert", async (m) => {
        try {
            const msg = m.messages[0];
            
            if (msg.key && msg.key.id) {
                messageCache.set(msg.key.id, msg);
                if (messageCache.size > 1000) messageCache.delete(messageCache.keys().next().value);
            }

            if (!msg.message || msg.key.fromMe) return;

            if (msg.message.protocolMessage && (msg.message.protocolMessage.type === 0 || msg.message.protocolMessage.type === 'REVOKE')) {
                const deletedKey = msg.message.protocolMessage.key;
                const originalMsg = messageCache.get(deletedKey.id);
                
                if (originalMsg && originalMsg.message && !originalMsg.key.fromMe) {
                    const origType = getContentType(originalMsg.message);
                    const isMedia = ["imageMessage", "videoMessage", "audioMessage", "documentMessage", "stickerMessage"].includes(origType) || Object.keys(originalMsg.message).some(k => k.toLowerCase().includes("viewonce"));

                    if (isMedia) {
                        const sender = originalMsg.key.participant || originalMsg.key.remoteJid;
                        const formattedSender = `+${sender.split('@')[0]}`; 
                        const isGroupMsg = originalMsg.key.remoteJid.endsWith('@g.us');
                        let groupName = "";
                        
                        if (isGroupMsg) {
                            try {
                                const groupMetadata = await waSocketGlobal.groupMetadata(originalMsg.key.remoteJid);
                                groupName = groupMetadata.subject;
                            } catch (e) { groupName = "Grup Tidak Diketahui"; }
                        }

                        let infoText = `🚨 *MEDIA DIHAPUS (ANTI-DELETE)* 🚨\n\n`;
                        infoText += `File yang dihapus\n`;
                        infoText += `Nomor pengirim: ${formattedSender}\n`;
                        if (isGroupMsg) infoText += `Nama Grub: ${groupName}\n`;

                        const ownerJid = "6285xxxxx090@s.whatsapp.net";
                        try {
                            await waSocketGlobal.sendMessage(ownerJid, { forward: originalMsg });
                            await waSocketGlobal.sendMessage(ownerJid, { text: infoText });
                        } catch (err) { console.log(chalk.red("[ANTI-DELETE ERROR] Gagal meneruskan pesan.")); }
                    }
                } return; 
            }

            const chatJid = msg.key.remoteJid; 
            const realSender = msg.key.participant || chatJid; 
            const userId = realSender.split('@')[0];
            const chatJidNum = chatJid.split('@')[0]; 
            const pushName = msg.pushName || "Tanpa Nama";
            
            const type = getContentType(msg.message);
            let body = (type === 'conversation') ? msg.message.conversation : (type === 'extendedTextMessage') ? msg.message.extendedTextMessage.text : '';
            const text = body ? body.trim() : '';
            if (!text) return;

            let isGroup = chatJid.endsWith('@g.us');
            console.log(chalk.cyan(`[MSG IN] `) + chalk.white(`[${pushName}] `) + chalk.gray(`(Sender: ${realSender} | Chat: ${chatJid})`) + `\n➡️ ${text}`);

            const cmd = text.toLowerCase().split(' ')[0];

            const isAdmin = ADMIN_NUMBERS.includes(userId);
            const isAllowedGroup = getAllowedUsers().includes(chatJidNum); 
            const allowedGlobalCmds = ['/v', '.v', '/moderegis', '.moderegis', '/exitregis', '.exitregis'];
            if (isGroup) { if (!TARGET_GROUP_IDS.includes(chatJid) && !isAllowedGroup && !allowedGlobalCmds.includes(cmd)) return; } 

            if (cmd === '/v' || cmd === '.v') {
                try {
                    const quoted = msg.message?.extendedTextMessage?.contextInfo;
                    const quotedMsg = quoted?.quotedMessage;
                    if (!quotedMsg) return; 
                    
                    let isViewOnce = false; let mediaMessage = null;

                    const viewOnceKey = Object.keys(quotedMsg).find(key => key.toLowerCase().includes("viewonce"));
                    if (viewOnceKey) {
                        isViewOnce = true; mediaMessage = quotedMsg[viewOnceKey]?.message;
                    } else {
                        const mType = Object.keys(quotedMsg)[0];
                        if (quotedMsg[mType]?.viewOnce) { isViewOnce = true; mediaMessage = quotedMsg; }
                    }

                    if (!isViewOnce || !mediaMessage) return; 

                    const realType = Object.keys(mediaMessage).find(key => ["imageMessage", "videoMessage", "audioMessage"].includes(key));
                    if (!realType) return; 

                    const stream = await downloadContentFromMessage(mediaMessage[realType], realType.replace("Message", ""));
                    let buffer = Buffer.from([]); for await (const chunk of stream) { buffer = Buffer.concat([buffer, chunk]); }

                    const originalCaption = mediaMessage[realType]?.caption || "";
                    let finalCaption = originalCaption ? `${originalCaption}\n\n` : ""; 
                    finalCaption += `jangan lupa kunjungi klikidm.my.id @${userId}_`; 

                    await wa.sendMessage(chatJid, {
                        [realType.replace("Message", "")]: buffer,
                        caption: realType === "audioMessage" ? undefined : finalCaption,
                        mentions: [realSender]
                    }, { quoted: msg }); 

                } catch (err) {
                    console.error("❌ RVO Error:", err);
                    await wa.sendMessage(chatJid, { text: "⚠️ Gagal membuka view once. Mungkin pesan expired/format baru." }, { quoted: msg });
                }
                return;
            }

            const userModes = loadUserMode();
            const isModeCo = userModes[realSender] && userModes[realSender].co === true;
            const isModeCo2 = userModes[realSender] && userModes[realSender].co2 === true; 
            const isModeCoIp = userModes[realSender] && userModes[realSender].coip === true; 
            const isModeRegis = userModes[realSender] && userModes[realSender].regis === true;

            // ==========================================
            // 🚨 PERSISTENT MODE REGIS HANDLER
            // ==========================================
            if (cmd === '/moderegis' || cmd === '.moderegis') {
                if (isGroup) return wa.sendMessage(chatJid, { text: "❌ Perintah /moderegis hanya bisa diakses lewat Chat Pribadi (Japri)." }, { quoted: msg });
                
                userModes[realSender] = { co: false, co2: false, coip: false, regis: true }; 
                saveUserMode(userModes);
                
                if (regisSessions[realSender] && regisSessions[realSender].process) {
                    try { regisSessions[realSender].process.kill('SIGKILL'); } catch(e){}
                }
                
                startRegisSession(wa, chatJid, realSender, msg);
                return;
            }

            if (cmd === '/exitregis' || cmd === '.exitregis') {
                if (regisSessions[realSender] && regisSessions[realSender].process) {
                    try { regisSessions[realSender].process.kill('SIGKILL'); } catch(e){}
                    delete regisSessions[realSender];
                }
                userModes[realSender] = { co: false, co2: false, coip: false, regis: false }; 
                saveUserMode(userModes);
                return wa.sendMessage(chatJid, { text: "✅ Kembali ke *Mode Normal*\nSesi regis telah ditutup." }, { quoted: msg });
            }

            if (isModeRegis && !text.startsWith('/')) {
                const session = regisSessions[realSender];
                if (!session) return wa.sendMessage(chatJid, { text: "Sistem regis belum diinisiasi. Ketik /moderegis untuk memulai." }, { quoted: msg });
                if (session.status === 'INIT') return wa.sendMessage(chatJid, { text: "⏳ Sistem masih melakukan inisiasi awal. Mohon tunggu..." }, { quoted: msg });
                
                if (session.status === 'READY') {
                    const nomorRegis = text.replace(/[^0-9]/g, '');
                    if (nomorRegis.length < 10) return wa.sendMessage(chatJid, { text: "⚠️ Nomor tidak valid. Silakan masukkan nomor yang benar." }, { quoted: msg });
                    
                    session.status = 'WAITING_RESULT';
                    session.output = ''; 
                    
                    try {
                        session.process.stdin.write(`${nomorRegis}\n`);
                    } catch(e) {
                        return wa.sendMessage(chatJid, { text: "❌ Gagal mengirim input ke sistem." }, { quoted: msg });
                    }
                    
                    session.timer = setTimeout(() => {
                        if (session.status === 'WAITING_RESULT') {
                            wa.sendMessage(chatJid, { text: "gagal silahkan ketik /exitregis lalu masuk /moderegis lagi" });
                        }
                    }, 150000); // 150 detik timeout
                    
                    return; 
                }
            }

            if (cmd === '/modeco') {
                if (isGroup) return wa.sendMessage(chatJid, { text: "❌ Perintah /modeco hanya bisa diakses lewat Chat Pribadi (Japri)." }, { quoted: msg });
                userModes[realSender] = { co: true, co2: false, coip: false, regis: false }; saveUserMode(userModes);
                return wa.sendMessage(chatJid, { text: "✅ Berhasil masuk ke *Mode CO V1*\n\nSilahkan order akun ke no admin https://wa.me/6285xxxxx090. Ketik `/menu` untuk melihat fitur yang tersedia." }, { quoted: msg });
            }

            if (cmd === '/modeco2') {
                if (isGroup) return wa.sendMessage(chatJid, { text: "❌ Perintah /modeco2 hanya bisa diakses lewat Chat Pribadi (Japri)." }, { quoted: msg });
                userModes[realSender] = { co: false, co2: true, coip: false, regis: false }; saveUserMode(userModes);
                return wa.sendMessage(chatJid, { text: "✅ Berhasil masuk ke *Mode CO V2*\n\nSilahkan order akun ke no admin https://wa.me/6285xxxxx090. Ketik `.menu` untuk melihat fitur V2." }, { quoted: msg });
            }

            if (cmd === '/modeip') {
                if (isGroup) return wa.sendMessage(chatJid, { text: "❌ Perintah /modeip hanya bisa diakses lewat Chat Pribadi (Japri)." }, { quoted: msg }); 
                userModes[realSender] = { co: false, co2: false, coip: true, regis: false }; saveUserMode(userModes);
                return wa.sendMessage(chatJid, { text: "✅ Berhasil masuk ke *Mode iPHONE*\n\nKetik `.menu` untuk melihat fitur." }, { quoted: msg });
            }

            if (cmd === '/exitco' || cmd === '/exitip') {
                userModes[realSender] = { co: false, co2: false, coip: false, regis: false }; saveUserMode(userModes);
                return wa.sendMessage(chatJid, { text: "✅ Kembali ke *Mode Normal*\n\nKetik `/menu` untuk melihat fitur cek stok dan produk." }, { quoted: msg }); 
            }

            if (isModeCo) return await handleCoCommand(wa, msg, chatJid, realSender, userId, pushName, text, isGroup);
            if (isModeCo2) return await handleCo2Command(wa, msg, chatJid, realSender, userId, pushName, text, isGroup);
            if (isModeCoIp) return await handleCoIpCommand(wa, msg, chatJid, realSender, userId, pushName, text, isGroup);

            if (!isGroup && !text.startsWith('/')) return; 

            if (cmd.startsWith('/add') && isAdmin) {
                const args = text.split(' ');
                if (args.length !== 2) return wa.sendMessage(chatJid, { text: "⚠️ Format salah!\nGunakan: `/add <ID>`" }, { quoted: msg });
                const newId = args[1].replace(/[^0-9]/g, ''); 
                if (addAllowedUser(newId)) await wa.sendMessage(chatJid, { text: `✅ *BERHASIL*\nID \`${newId}\` sekarang diizinkan.` }, { quoted: msg });
                else await wa.sendMessage(chatJid, { text: `⚠️ *INFO*\nID \`${newId}\` sudah ada di dalam daftar.` }, { quoted: msg });
                return;
            }

            if (cmd === '/menu' || cmd === '.menu') return await sendMenu(wa, chatJid, realSender, pushName, isAdmin, msg);

            if (cmd === '/ping') {
                const msgLoading = await wa.sendMessage(chatJid, { text: "⏳ _Menarik data sistem..._" }, { quoted: msg });
                let latency = Date.now() - (msg.messageTimestamp * 1000); if (latency < 0) latency = Math.floor(Math.random() * 50) + 10; 
                const uptime = process.uptime(); const d = Math.floor(uptime / 86400); const h = Math.floor(uptime % 86400 / 3600); const mnt = Math.floor(uptime % 3600 / 60); const s = Math.floor(uptime % 60);
                const runtimeStr = `${d} Hari ${h} Jam ${mnt} Menit ${s} Detik`;
                const cpus = os.cpus(); let cpuModel = cpus && cpus.length > 0 ? cpus[0].model : "Unknown"; let cpuCore = cpus && cpus.length > 0 ? cpus.length : "Unknown";
                const totalRAM = os.totalmem(); const freeRAM = os.freemem(); const usedRAM = totalRAM - freeRAM;
                const usedMB = (usedRAM / (1024 * 1024)).toFixed(2); const totalMB = (totalRAM / (1024 * 1024)).toFixed(2); const memPercent = ((usedRAM / totalRAM) * 100).toFixed(2);
                
                const pingText = `© INDICA PROJECT \n\n┌── [ PING STATUS ] ──\n│\n├ ◈ Latency (Real): ${latency} ms\n├ ◈ Runtime: ${runtimeStr}\n├ ◈ System: ${os.hostname()}\n├ ◈ CPU: ${cpuModel} (${cpuCore} Core)\n├ ◈ Memory: ${usedMB} MB / ${totalMB} MB (${memPercent}%)\n│\n└───────────────────`;
                return wa.sendMessage(chatJid, { text: pingText, edit: msgLoading.key });
            }

            if (cmd.startsWith('/plu')) {
                const rawArgs = text.split(' ').slice(1).filter(s => s.trim());
                if (rawArgs.length === 0) return wa.sendMessage(chatJid, { text: "⚠️ Format salah!\nGunakan: `/plu [nomor plu] [quantity]`\nBulk multiple: `/plu 20076768 5, 20076765`" }, { quoted: msg });
                
                // Parse args: each item can be "plu" or "plu qty", separated by comma
                const items = [];
                for (const chunk of rawArgs.join(' ').split(',')) {
                    const parts = chunk.trim().split(/\s+/);
                    const plu = parts[0];
                    const qty = parts.length > 1 ? parseInt(parts[1]) : 1;
                    if (plu) items.push({ plu, qty: isNaN(qty) ? 1 : Math.max(1, Math.min(999, qty)) });
                }
                
                if (items.length === 0) return wa.sendMessage(chatJid, { text: "⚠️ Tidak ada PLU yang valid." }, { quoted: msg });
                
                // React with shopping emoji on the command message
                try { await wa.sendMessage(chatJid, { react: { key: msg.key, text: "🛍️" } }); } catch (e) {}
                
                try {
                    // Load barcode database from local file
                    const barcodeData = JSON.parse(fs.readFileSync('/sdcard/Download/barcodesheet.json', 'utf8'));
                    
                    for (const { plu, qty } of items) {
                        try {
                            // Use Python helper for API call
                            const { execFile } = require('child_process');
                            const result = await new Promise((resolve, reject) => {
                                execFile('python3', ['/data/data/com.termux/files/home/bot-stok/plu_helper.py', plu, 'TTTT'], { timeout: 30000 }, (error, stdout, stderr) => {
                                    if (error) return reject(error);
                                    try { resolve(JSON.parse(stdout)); }
                                    catch (e) { reject(new Error('Invalid JSON from helper')); }
                                });
                            });
                            
                            if (result.error) { await wa.sendMessage(chatJid, { text: `❌ PLU ${plu}: ${result.error}` }); continue; }
                            if (!result.ok) { await wa.sendMessage(chatJid, { text: `❌ PLU ${plu} tidak ditemukan.` }); continue; }
                            
                            // Find barcode from database
                            const barcodeItem = barcodeData.find(x => x.plu == plu || x.barcode == plu);
                            const barcodeNum = barcodeItem && barcodeItem.barcode ? barcodeItem.barcode : plu;
                            
                            // For bulk: barcode value = "B" + code + zero-padded qty, display = "code | qty: N"
                            const barcodeValue = qty > 1 ? `B${barcodeNum}${String(qty).padStart(2, '0')}` : barcodeNum;
                            const barcodeLabel = qty > 1 ? `${barcodeNum} | qty: ${qty}` : barcodeNum;
                            
                            // Generate barcode image with custom label
                            const barcodePath = await generateBarcodeWithLabel(barcodeValue, barcodeLabel);
                            
                            // Try to get product image
                            const cdnUrl = `https://cdn-klik.klikindomaret.com/klik-catalog/product/${result.plu}_1.jpg`;
                            let productBuffer = null;
                            
                            try {
                                const imgResp = await axios.get(cdnUrl, { responseType: 'arraybuffer', timeout: 10000 });
                                productBuffer = Buffer.from(imgResp.data);
                            } catch (e) {
                                try {
                                    const supaUrl = await getSupabaseImage(result.plu);
                                    if (supaUrl) {
                                        const imgResp = await axios.get(supaUrl, { responseType: 'arraybuffer', timeout: 10000 });
                                        productBuffer = Buffer.from(imgResp.data);
                                    }
                                } catch (e2) {}
                            }
                            
                            // Combine images: product on top, barcode below — exact 1000x1448
                            let finalImagePath = null;
                            if (productBuffer && barcodePath && fs.existsSync(barcodePath)) {
                                try {
                                    const productImg = await Jimp.read(productBuffer);
                                    const barcodeImg = await Jimp.read(barcodePath);
                                    
                                    // Fixed canvas 1000x1448
                                    const canvasW = 1000, canvasH = 1448;
                                    const canvas = new Jimp(canvasW, canvasH, 0xFFFFFFFF);
                                    
                                    // Scale product to fit within 800x1100 box
                                    const pScale = Math.min(800 / productImg.getWidth(), 1100 / productImg.getHeight());
                                    const pW = Math.round(productImg.getWidth() * pScale);
                                    const pH = Math.round(productImg.getHeight() * pScale);
                                    const productResized = productImg.clone().resize(pW, pH);
                                    const pX = Math.round((canvasW - pW) / 2);
                                    canvas.composite(productResized, pX, 0);
                                    
                                    // Scale barcode to fit within 800x150 box, place right below product
                                    const bScale = Math.min(800 / barcodeImg.getWidth(), 150 / barcodeImg.getHeight());
                                    const bW = Math.round(barcodeImg.getWidth() * bScale);
                                    const bH = Math.round(barcodeImg.getHeight() * bScale);
                                    const barcodeResized = barcodeImg.clone().resize(bW, bH);
                                    const bX = Math.round((canvasW - bW) / 2);
                                    const bY = pH + 15;
                                    canvas.composite(barcodeResized, bX, bY);
                                    
                                    finalImagePath = `./temp_combined_${Date.now()}.png`;
                                    await canvas.writeAsync(finalImagePath);
                                    fs.unlinkSync(barcodePath);
                                } catch (e) {}
                            }
                            
                            // Build caption
                            const price = result.price || 0;
                            const total = price * qty;
                            const promoText = result.promoText || result.promoType || 'Tidak ada promo untuk produk ini';
                            const qtyLine = qty > 1 ? `\n📦 Harga Rp ${price.toLocaleString('ID')} x ${qty} = Rp ${total.toLocaleString('ID')}` : '';
                            const caption = `🛍️ *${result.productName}*\n🔖 PLU: ${result.plu}\n💰 Harga: Rp ${price.toLocaleString('ID')}${qtyLine}\n🏷️ ${promoText}\n\nJangan lupa kunjungi klikidm.my.id`;
                            
                            // Send combined image
                            if (finalImagePath && fs.existsSync(finalImagePath)) {
                                await wa.sendMessage(chatJid, { image: { url: finalImagePath }, caption });
                                fs.unlinkSync(finalImagePath);
                            } else if (productBuffer) {
                                // Product only (no barcode in db)
                                await wa.sendMessage(chatJid, { image: { url: cdnUrl }, caption });
                            } else if (barcodePath && fs.existsSync(barcodePath)) {
                                await wa.sendMessage(chatJid, { image: { url: barcodePath }, caption });
                                fs.unlinkSync(barcodePath);
                            } else {
                                await wa.sendMessage(chatJid, { text: caption });
                            }
                            
                        } catch (e) {
                            await wa.sendMessage(chatJid, { text: `❌ Error cek PLU ${plu}: ${e.message}` });
                        }
                    }
                } catch (error) {
                    await wa.sendMessage(chatJid, { text: "❌ Terjadi kesalahan API." });
                }
                return;
            }

            if (cmd.startsWith('/caritoko')) {
                const args = text.split(' ').slice(1).join(' ').trim().toUpperCase();
                if (!args) return wa.sendMessage(chatJid, { text: "⚠️ Format salah!\nGunakan: `/caritoko [kode/nama toko]`" }, { quoted: msg });
                const pbar = await startProgressBar(chatJid, "Mencari data toko...", msg);
                try {
                    if (!global._cToko || Date.now() - global._cToko.t > 600000) global._cToko = { t: Date.now(), data: (await axios.get('https://api.github.com/repos/Marsudi505/toko-idm/contents/toko.json', { headers: { 'User-Agent': 'bot-stok', Authorization: `Bearer ${config.GITHUB_TOKEN}`, Accept: 'application/vnd.github.raw' }, timeout: 30000 })).data };
                    const data = global._cToko.data;
                    const toko = data.find(x => (x.storeCode && x.storeCode.toUpperCase() === args) || (x.storeName && x.storeName.toUpperCase().includes(args)));
                    clearInterval(pbar.interval);
                    if (!toko) return wa.sendMessage(chatJid, { text: `❌ Toko tidak ditemukan.`, edit: pbar.key });
                    const jamBukaTutup = (toko.openingHour && toko.closingHour) ? `${toko.openingHour} - ${toko.closingHour}` : '-';
                    const txtToko = `🏪 *Detail Toko*\n━━━━━━━━━━━━━━\n📦 KDTK  : ${toko.storeCode || '-'}\n🏪 TOKO  : ${toko.storeName || '-'}\n🏷️ TYPE  : ${toko.storeType || '-'}\n🏬 DC    : ${toko.dcCode || '-'}\n\n📍 ALAMAT :\n${toko.address || '-'}\n\n🕒 JAM BUKA : ${jamBukaTutup}\n🌐 KOORDINAT: ${toko.latitude}, ${toko.longitude}\n✅ STATUS   : ${toko.operational ? 'Buka ✅' : 'Tutup ❌'}\n\n📌 Maps: ${toko.googleMaps || '-'}`;
                    await wa.sendMessage(chatJid, { text: txtToko, edit: pbar.key });
                } catch (error) { clearInterval(pbar.interval); await wa.sendMessage(chatJid, { text: "❌ Error API GitHub.", edit: pbar.key }); } return;
            }

            if (cmd.startsWith('/stok')) {
                const args = text.split(' ');
                if (args.length !== 3) return wa.sendMessage(chatJid, { text: '⚠️ Format salah!\nGunakan: `/stok <plu> <kodetoko>`' }, { quoted: msg });
                const loadingMsg = await wa.sendMessage(chatJid, { text: `Memproses cek stok mohon ditunggu.... ` }, { quoted: msg });
                queue.push({ tipe: 'stok', jid: chatJid, plu: args[1], kodeToko: args[2].toUpperCase(), msgQuoted: msg, loadingKey: loadingMsg.key });
                processQueue(); return;
            }

            if (cmd.startsWith('/scan')) {
                const args = text.split(' ');
                const totalAkun = getTotalAkun();
                let indexYangDipakai = currentAkunIndex; // Default jika user tidak ketik angka

                if (args.length > 1) {
                    const requestedIndex = parseInt(args[1]);
                    if (isNaN(requestedIndex) || requestedIndex < 1 || requestedIndex > totalAkun) {
                        return wa.sendMessage(chatJid, { text: `⚠️ Index tidak valid. Masukkan angka antara 1 sampai ${totalAkun}.` }, { quoted: msg });
                    }
                    indexYangDipakai = requestedIndex;
                } else {
                    // Jika hanya ketik /scan, sistem lanjut auto-increment bergiliran
                    currentAkunIndex++; 
                    if (currentAkunIndex > totalAkun) currentAkunIndex = 1;
                }

                // Ambil nomor HP sesuai index
                const nomorAkun = getNomorAkun(indexYangDipakai);

                queue.push({ tipe: 'scan', jid: chatJid, msgQuoted: msg, akunIndex: indexYangDipakai, nomorAkun: nomorAkun });
                await wa.sendMessage(chatJid, { text: `⏳ Sedang menggenerate QR Code untuk Akun ke-${indexYangDipakai} (${nomorAkun})...\nMohon tunggu.` }, { quoted: msg }); 
                processQueue(); return;
            }

            if (cmd.startsWith('/fairs')) {
                const loadingMsg = await wa.sendMessage(chatJid, { text: `⏳ Memproses cek promo fairs, mohon ditunggu....` }, { quoted: msg });
                queue.push({ tipe: 'fairs', jid: chatJid, msgQuoted: msg, loadingKey: loadingMsg.key }); 
                processQueue(); return;
            }

        } catch (err) { console.error(err); }
    });
}

async function processQueue() {
    if (isProcessing || queue.length === 0) return;
    isProcessing = true;
    const currentTask = queue.shift();

    const wa = waSocketGlobal;
    
    try {
        if (currentTask.tipe === 'stok') {
            fs.writeFileSync(FILE_TOKO, currentTask.kodeToko + '\n', 'utf-8');
            const hasilStok = await runStokScript(currentTask.plu, currentTask.kodeToko);
            if (currentTask.loadingKey) { try { await wa.sendMessage(currentTask.jid, { delete: currentTask.loadingKey }); } catch (e) {} }
            
            if (hasilStok.includes('📦 *HASIL CEK STOK*')) {
                const cdnUrl = `https://cdn-klik.klikindomaret.com/klik-catalog/product/${currentTask.plu}_1.jpg`;
                
                let isImageAvailable = false;
                let finalImageUrl = cdnUrl;

                try { 
                    await axios.head(cdnUrl, { timeout: 3000 }); 
                    isImageAvailable = true; 
                } catch (e) {
                    const supaUrl = await getSupabaseImage(currentTask.plu);
                    if (supaUrl) { isImageAvailable = true; finalImageUrl = supaUrl; }
                }

                if (isImageAvailable) await wa.sendMessage(currentTask.jid, { image: { url: finalImageUrl }, caption: hasilStok }, { quoted: currentTask.msgQuoted });
                else await wa.sendMessage(currentTask.jid, { text: hasilStok }, { quoted: currentTask.msgQuoted });
            } else { await wa.sendMessage(currentTask.jid, { text: hasilStok }, { quoted: currentTask.msgQuoted }); }
        } 
        else if (currentTask.tipe === 'scan') {
            const imageBuffer = await runScanScript(currentTask.akunIndex);
            if (imageBuffer) {
                const baseCaption = `✅ *QR Code Berhasil Digenerate*\n\n👤 Akun ke: *${currentTask.akunIndex}*\n📱 Nomor: *${currentTask.nomorAkun}*`;
                
                const sentMsg = await wa.sendMessage(currentTask.jid, { 
                    image: imageBuffer, 
                    caption: `${baseCaption}\n\n⏳ Berlaku dalam: *60 detik*\n_(Pesan ini akan terhapus otomatis)_` 
                }, { quoted: currentTask.msgQuoted });
                
                startCountdownAndDeleteScan(wa, currentTask.jid, sentMsg, baseCaption);
            } else await wa.sendMessage(currentTask.jid, { text: '❌ *GAGAL*\nTidak dapat menangkap pola QR Code dari terminal.' }, { quoted: currentTask.msgQuoted });
        }
        else if (currentTask.tipe === 'fairs') {
            const hasilFairs = await runFairsScript();
            if (currentTask.loadingKey) { try { await wa.sendMessage(currentTask.jid, { delete: currentTask.loadingKey }); } catch (e) {} }
            await wa.sendMessage(currentTask.jid, { text: hasilFairs }, { quoted: currentTask.msgQuoted });
        }
    } catch (error) { 
        console.error(chalk.red('[ERROR SYSTEM]', error)); 
        try { await wa.sendMessage(currentTask.jid, { text: '❌ Error sistem eksekusi script.' }, { quoted: currentTask.msgQuoted }); } catch (e) {} 
    }
    
    setTimeout(() => { isProcessing = false; processQueue(); }, 1500);
}

async function startCountdownAndDeleteScan(wa, jid, sentMsg, baseCaption) {
    for (let i = 60; i >= 0; i -= 2) { 
        if (i <= 0) { 
            await wa.sendMessage(jid, { delete: sentMsg.key }); 
            break; 
        } else { 
            await wa.sendMessage(jid, { 
                text: `${baseCaption}\n\n⏳ Berlaku dalam: *${i} detik*\n_(Pesan ini akan terhapus otomatis)_`, 
                edit: sentMsg.key 
            }); 
            await new Promise(resolve => setTimeout(resolve, 2000)); 
        }
    }
}

function runFairsScript() {
    return new Promise((resolve, reject) => {
        const script = spawn(COMMAND_RUN, COMMAND_ARGS, { cwd: WORK_DIR, shell: true });
        let timeoutId = setTimeout(() => { script.kill(); resolve("❌ *GAGAL MENGAMBIL DATA*\n\nRequest Timeout (Terminal tidak merespons)."); }, 120000);
        let outputTerminal = '', statusTerakhir = '', idleTimer = null;
        script.stdout.on('data', (data) => {
            const teks = data.toString().replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, ''); outputTerminal += teks;
            if (idleTimer) clearTimeout(idleTimer);
            if (teks.includes('SELECT MENU') && statusTerakhir === '') { script.stdin.write('8\n'); statusTerakhir = 'menu8'; } 
            else if (teks.includes('SELECT MENU') && statusTerakhir === 'menu8') { script.stdin.write('1\n'); statusTerakhir = 'menu1'; }
            if (statusTerakhir === 'menu1') { idleTimer = setTimeout(() => { script.kill(); }, 4000); }
        });
        script.on('close', () => {
            clearTimeout(timeoutId); if (idleTimer) clearTimeout(idleTimer);
            let textBersih = outputTerminal.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '');
            if (!textBersih.includes('LIST FAIR')) { resolve("❌ *GAGAL*\nData promo Fair tidak ditemukan di server."); return; }
            let parts = textBersih.split(/LIST FAIR EKLUSIF|LIST FAIR EXCLUSIVE/i); let resultMsg = '';
            if (parts.length > 0 && parts[0].includes('LIST KODE KUPON')) resultMsg += parseFairTable(parts[0], 'LIST KODE KUPON') + '\n\n';
            if (parts.length > 1) resultMsg += parseFairTable(parts[1], 'LIST FAIR EXCLUSIVE');
            if (!resultMsg.trim()) resolve("⚠️ *HASIL PROMO*\nTabel promo promo kosong atau format tidak dikenali."); else resolve(resultMsg.trim());
        });
        script.on('error', (err) => { clearTimeout(timeoutId); reject(err); });
    });
}

function parseFairTable(textTable, title) {
    let lines = textTable.split('\n'), rows = [], currentRow = null;
    for (let line of lines) {
        let cleanLine = line.replace(/[┌─┬┐├┼┤└┴┘=]/g, '').trim();
        if (!cleanLine.includes('│') && !cleanLine.includes('|')) continue;
        if (cleanLine.includes('MEKANISME FAIR') || cleanLine.includes('NO')) continue;
        let parts = cleanLine.split(/│|\|/).map(s => s.trim()); if (parts.length < 3) continue;
        let noStr = parts[1]; let isNewRow = noStr && noStr.match(/^\d+$/);
        if (isNewRow) {
            let isKupon = parts.length > 5; 
            currentRow = { no: noStr, mekanisme: parts[2] || '', sisa: parts[3] || '', kode: isKupon ? parts[4] : '', keterangan: isKupon ? (parts[5] || '') : (parts[4] || '') }; rows.push(currentRow);
        } else if (currentRow) {
            if (parts[2]) currentRow.mekanisme += ' ' + parts[2]; if (parts[3]) currentRow.sisa += ' ' + parts[3];
            let isKupon = parts.length > 5; if (isKupon) { if (parts[4]) currentRow.kode += ' ' + parts[4]; if (parts[5]) currentRow.keterangan += ' ' + parts[5]; } else { if (parts[4]) currentRow.keterangan += ' ' + parts[4]; }
        }
    }
    if (rows.length === 0) return '';
    let result = `${title}\n\n`;
    for (let r of rows) {
        let mek = r.mekanisme.replace(/\s+/g, ' ').trim(); let sisaMatch = r.sisa.match(/(\d+(?:\.\d+)?)%/); let sisaPct = sisaMatch ? sisaMatch[0] : r.sisa.replace(/[^0-9.%]/g, '');
        let sisaNum = parseFloat(sisaPct) || 0; let barCount = Math.round(sisaNum / 10); let barStr = '█'.repeat(barCount) + ' '.repeat(10 - barCount); 
        let ket = r.keterangan.replace(/\s+/g, ' ').trim(); let kode = r.kode ? r.kode.replace(/\s+/g, ' ').trim() : '';
        result += `${r.no}. ${mek}\n`; if (kode) result += `🎫 Kode Kupon: ${kode}\n`; result += `  Sisa Kuota: [${barStr}] ${sisaPct}\n`; if (ket) result += `  Keterangan: ${ket}\n\n`;
    } return result.trim();
}

function runScanScript(akunIndex) { 
    return new Promise((resolve, reject) => {
        const script = spawn(COMMAND_RUN, COMMAND_ARGS, { cwd: WORK_DIR, shell: true });
        let timeoutId = setTimeout(() => { script.kill(); resolve(null); }, 120000); let outputTerminal = '', statusTerakhir = ''; 
        script.stdout.on('data', (data) => {
            const teks = data.toString().replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, ''); outputTerminal += teks;
            if (teks.includes('SELECT MENU') && statusTerakhir === '') { script.stdin.write('9\n'); statusTerakhir = 'menu9'; } 
            else if (teks.includes('SELECT MENU') && statusTerakhir === 'menu9') { script.stdin.write('1\n'); statusTerakhir = 'submenu1'; }
            else if (teks.includes('INPUT NAMA FILE') && statusTerakhir === 'submenu1') { script.stdin.write('akun.txt\n'); statusTerakhir = 'file_akun'; }
            else if (teks.includes('START NUMBER') && statusTerakhir === 'file_akun') { script.stdin.write(`${akunIndex}\n`); statusTerakhir = 'start_num'; }
            else if (teks.includes('AND NUMBER') && statusTerakhir === 'start_num') { script.stdin.write(`${akunIndex}\n`); statusTerakhir = 'and_num'; }
            else if (teks.includes('ULANGI LAGI') && statusTerakhir === 'and_num') { statusTerakhir = 'selesai'; script.kill(); }
        });
        script.on('close', async () => { clearTimeout(timeoutId); const textBersih = outputTerminal.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, ''); const qrLines = textBersih.split('\n').filter(line => (line.includes('█') || line.includes('▄') || line.includes('▀')) && line.trim().length > 10);
            if (qrLines.length === 0) return resolve(null); try { resolve(await asciiToImage(qrLines)); } catch (err) { resolve(null); } });
        script.on('error', (err) => { clearTimeout(timeoutId); reject(err); });
    });
}

async function asciiToImage(lines) {
    const linesClean = lines.map(l => l.replace(/\r/g, '')); const width = linesClean[0].length; const height = linesClean.length * 2; const scale = 12; const image = new Jimp(width * scale, height * scale, 0xFFFFFFFF);
    for (let y = 0; y < linesClean.length; y++) {
        const line = linesClean[y];
        for (let x = 0; x < line.length; x++) {
            const char = line[x]; let topBlack = false, bottomBlack = false;
            if (char === '█') { topBlack = true; bottomBlack = true; } else if (char === '▀') { topBlack = true; } else if (char === '▄') { bottomBlack = true; }
            const drawRect = (startX, startY, isBlack) => { if (!isBlack) return; for (let px = 0; px < scale; px++) { for (let py = 0; py < scale; py++) { image.setPixelColor(0x000000FF, startX * scale + px, startY * scale + py); } } };
            drawRect(x, y * 2, topBlack); drawRect(x, y * 2 + 1, bottomBlack);
        }
    }
    const padding = 4 * scale; const finalImage = new Jimp((width * scale) + (padding * 2), (height * scale) + (padding * 2), 0xFFFFFFFF); finalImage.composite(image, padding, padding); return await finalImage.getBufferAsync(Jimp.MIME_PNG);
}

function runStokScript(plu, kodeToko) { 
    return new Promise((resolve, reject) => {
        const script = spawn(COMMAND_RUN, COMMAND_ARGS, { cwd: WORK_DIR, shell: true });
        let timeoutId = setTimeout(() => { script.kill(); resolve("❌ *GAGAL CEK STOK*\n\nRequest Timeout (Server lambat)."); }, 120000); let outputTerminal = '', statusTerakhir = ''; 
        script.stdout.on('data', (data) => {
            const teks = data.toString().replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, ''); outputTerminal += teks;
            if (teks.includes('SELECT MENU') && statusTerakhir === '') { script.stdin.write('7\n'); statusTerakhir = 'menu'; } 
            else if (teks.includes('HAPUS KERANJANG YANG SUDAH ADA') && statusTerakhir === 'menu') { script.stdin.write('y\n'); statusTerakhir = 'hapus'; }
            else if (teks.includes('FILE LIST KODE TOKO') && statusTerakhir === 'hapus') { script.stdin.write('toko.txt\n'); statusTerakhir = 'file'; }
            else if (teks.includes('KATA KUNCI/PLU') && statusTerakhir === 'file') { script.stdin.write(`${plu}\n`); statusTerakhir = 'plu'; }
            else if (teks.includes('SELECT PRODUK') && statusTerakhir === 'plu') { script.stdin.write('1\n'); statusTerakhir = 'produk'; }
            else if (teks.includes('TAMBAH LAGI') && statusTerakhir === 'produk') { script.stdin.write('n\n'); statusTerakhir = 'tambah_lagi'; }
            else if (teks.includes('CEK STOCK LAGI') && statusTerakhir === 'tambah_lagi') { statusTerakhir = 'selesai'; script.kill(); }
        });
        script.on('close', () => {
            clearTimeout(timeoutId); let textBersih = outputTerminal.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '');
            if (textBersih.includes('GAGAL MENGAMBIL DATA')) resolve(`❌ *GAGAL CEK STOK*\nServer menolak kode toko *${kodeToko}*.`);
            else if (textBersih.includes('LIST PRODUK')) {
                let hNormal = "0", hDiskon = "0", hFinal = "0", namaBarang = "Produk Tidak Diketahui", sisaStock = "0";
                let lines1 = textBersih.split('LIST PRODUK')[1].split('SELECT PRODUK')[0].split('\n');
                for (let line of lines1) { let cleanLine = line.replace(/[┌─┬┐│├┼┤└┴┘=]/g, '|').trim(); if (!cleanLine || cleanLine.replace(/\|/g, '').trim() === '' || cleanLine.includes('NAMA BARANG')) continue; let parts = cleanLine.split('|').map(s => s.trim()).filter(s => s !== ''); if (parts.length >= 5) { namaBarang = parts[1]; hNormal = parts[2]; hDiskon = parts[3]; hFinal = parts[4]; break; } }
                if (textBersih.includes('STOCK PRODUK')) { let lines2 = textBersih.split('STOCK PRODUK')[1].split('\n'); for (let line of lines2) { let cleanLine = line.replace(/[┌─┬┐│├┼┤└┴┘=]/g, '|').trim(); if (!cleanLine || cleanLine.replace(/\\|/g, '').trim() === '' || cleanLine.includes('SISA STOCK') || cleanLine.includes('NAMA BARANG')) continue; let parts = cleanLine.split('|').map(s => s.trim()).filter(s => s !== ''); if (parts.length >= 4) { sisaStock = parts[parts.length - 1]; break; } } }
                let strMsg = `📦 *HASIL CEK STOK*\n\n🏪 *Toko:* ${kodeToko}\n🔖 *PLU:* ${plu}\n🛍️ *Nama:* ${namaBarang}\n📊 *Sisa Stok: ${sisaStock}*\n\n`;
                if (hDiskon === '0.0' || hDiskon === '0') strMsg += `💰 *Rp ${hFinal}*`; else strMsg += `💰 ~Rp ${hNormal}~ ➡️ *Rp ${hFinal}*\n🔥 _(Diskon Rp ${hDiskon})_`; resolve(strMsg);
            } else resolve("⚠️ *HASIL CEK STOK*\nTabel produk tidak ditemukan.");
        });
        script.on('error', (err) => { clearTimeout(timeoutId); reject(err); });
    });
}

// ==========================================
// FUNGSI UTAMA START REGIS SESSION (FIXED PARSING & LOGIC)
// ==========================================
function startRegisSession(wa, chatJid, realSender, msg) {
    const script = spawn(COMMAND_RUN, COMMAND_ARGS, { cwd: WORK_DIR, shell: true });
    
    let state = {
        process: script,
        status: 'INIT',
        step: '',
        output: '',
        timer: null,
        idleTimer: null
    };
    regisSessions[realSender] = state;

    wa.sendMessage(chatJid, { text: "⏳ *Inisiasi Mode Regis...*\nMembuka sistem dan mengatur delay ke 100 detik. Mohon tunggu..." }, { quoted: msg });

    script.stdout.on('data', async (data) => {
        const teks = data.toString();
        // Bersihkan kode ANSI untuk terminal logger
        const cleanTeks = teks.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '');
        
        if (cleanTeks.trim()) console.log(chalk.blue(`[TERMUX REGIS] `) + cleanTeks.trim());

        if (state.status === 'INIT') {
            if (cleanTeks.includes('SELECT MENU') && state.step === '') { 
                state.step = 'menu_utama'; setTimeout(() => { try { script.stdin.write('1\n'); } catch(e){} }, 1000);
            } 
            else if (cleanTeks.includes('SELECT MENU') && state.step === 'menu_utama') { 
                state.step = 'menu_manual'; setTimeout(() => { try { script.stdin.write('1\n'); } catch(e){} }, 1000);
            }
            else if (cleanTeks.includes('SELECT :') && state.step === 'menu_manual') { 
                state.step = 'menu_platform'; setTimeout(() => { try { script.stdin.write('4\n'); } catch(e){} }, 1000);
            }
            else if (cleanTeks.includes('PASSWORD:') && state.step === 'menu_platform') { 
                state.step = 'pass'; setTimeout(() => { try { script.stdin.write('Sudi123456\n'); } catch(e){} }, 1000);
            }
            else if (cleanTeks.includes('BERAPA LAMA PENGECEKAN (detik):') && state.step === 'pass') { 
                state.step = 'delay'; setTimeout(() => { try { script.stdin.write('100\n'); } catch(e){} }, 1000);
            }
            else if (cleanTeks.includes('LANGSUNG NGELINK ? (Y/N) :') && state.step === 'delay') { 
                state.step = 'ngelink'; setTimeout(() => { try { script.stdin.write('n\n'); } catch(e){} }, 1000);
            }
            else if (cleanTeks.includes('NOMOR:') && state.step === 'ngelink') { 
                state.step = 'selesai';
                state.status = 'READY';
                state.output = ''; 
                await wa.sendMessage(chatJid, { text: "✅ *Mode Regis Aktif*\nSistem standby. Silakan kirim nomor pertama." });
            }
        } 
        else if (state.status === 'WAITING_RESULT') {
            // Kumpulkan semua output terminal
            state.output += teks;
            
            // Bersihkan teks untuk mengecek apakah balasan server sudah masuk
            let checkText = state.output.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '');

            // KATA KUNCI PEMICU (Sama persis dengan script awal)
            let isServerResponded = checkText.includes('Nomor telepon sudah terdaftar') || 
                                    checkText.includes('LINK WA') || 
                                    checkText.includes('BERHASIL MENDAFTAR AKUN') ||
                                    checkText.includes('Pastikan nomor atau email');

            // Jika kata kunci sudah muncul, beri waktu 1.5 detik agar sisa teks/link selesai tercetak semua, lalu parse!
            if (isServerResponded) {
                if (state.idleTimer) clearTimeout(state.idleTimer);
                
                state.idleTimer = setTimeout(async () => {
                    clearTimeout(state.timer); // Matikan timer darurat 150s
                    
                    let textBersih = state.output.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '');
                    let resultText = "";

                    // --- LOGIKA PARSING ASLI DARI INDEX.JS ---
                    if (textBersih.includes('Nomor telepon sudah terdaftar')) {
                        resultText = `❌ *GAGAL REGISTRASI*\nNomor telepon tersebut sudah terdaftar di sistem Klik Indomaret.`;
                    } 
                    else if (textBersih.includes('LINK WA')) {
                        let splitted = textBersih.split(/LINK WA\s*:/i);
                        if (splitted.length > 1) {
                            // Hapus spasi dan enter agar link menyatu
                            let cleanLink = splitted[1].replace(/\s+/g, '');
                            // Potong simbol sisa terminal di akhir link
                            let finalLink = cleanLink.split('---')[0].split('NOMOR:')[0].split('===')[0].split('───')[0];
                            
                            if (finalLink.includes('https://api.whatsapp.com')) {
                                resultText = `✅ *REGISTRASI BERHASIL*\n\nSilakan klik link di bawah ini untuk mengirim verifikasi OTP ke server:\n\n${finalLink}`;
                            } else {
                                resultText = `✅ *REGISTRASI BERHASIL*\n\nLink didapatkan:\n${finalLink}`;
                            }
                        } else {
                            resultText = "❌ *GAGAL*\nFormat Link WhatsApp OTP tidak dikenali.";
                        }
                    } 
                    else if (textBersih.includes('Pastikan nomor atau email yang anda masukkan benar')) {
                        resultText = `❌ *GAGAL REGISTRASI*\nPastikan nomor WA yang Anda masukkan benar dan bisa menerima pesan.`;
                    } 
                    else if (textBersih.includes('BERHASIL MENDAFTAR AKUN')) {
                        let cleanOutput = textBersih.replace(/NOMOR:\s*$/i, '').replace(/[─=]/g, '').trim();
                        resultText = `✅ *BERHASIL MENDAFTAR AKUN*\n\n${cleanOutput}`;
                    }

                    // Kirim Hasil
                    if (resultText) {
                        await wa.sendMessage(chatJid, { text: resultText });
                    } else {
                        // Jika entah kenapa formatnya aneh, kirim mentahannya yang sudah dibersihkan
                        await wa.sendMessage(chatJid, { text: textBersih.replace(/NOMOR:\s*$/i, '').trim() });
                    }
                    
                    await wa.sendMessage(chatJid, { text: "silahkan masukkan nomor selanjutnya" });
                    
                    // Reset status ke siap menerima nomor berikutnya
                    state.status = 'READY';
                    state.output = ''; 
                    
                }, 1500); 
            }
            // Catatan: Jika isServerResponded bernilai false, bot akan membiarkan terminal (mengabaikan jeda)
            // sampai server Klik Indomaret benar-benar merespons atau batas darurat 150 detik (state.timer) habis.
        }
    });

    script.on('error', (err) => {
        wa.sendMessage(chatJid, { text: `❌ Error eksekusi sistem regis: ${err.message}` });
        delete regisSessions[realSender];
    });
    
    script.on('close', () => {
         if (regisSessions[realSender]) {
             wa.sendMessage(chatJid, { text: "⚠️ Sistem CLI Regis tertutup otomatis. Silakan ketik /exitregis lalu /moderegis kembali." });
             delete regisSessions[realSender];
         }
    });
}


process.on('uncaughtException', function (err) { console.log(chalk.red('[ERROR] Abaikan Error: ' + err.message)); });
process.on('unhandledRejection', (reason, p) => { console.log(chalk.red('[ERROR] Abaikan Error: ' + reason)); });

startBot();
