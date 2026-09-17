import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason
} from "@whiskeysockets/baileys";
import pino from "pino";

async function startNova() {
  const { state, saveCreds } = await useMultiFileAuthState("./auth_info");

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: true
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
    if (connection === "open") {
      console.log("╭━━〔 🤖 NOVA MINI 〕━━➢");
      console.log("┃ ✅ WhatsApp connected!");
      console.log("╰━━━━━━━━━━━━━━━━━━━━➢");
    }

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;

      console.log("❌ Connection closed.");

      if (shouldReconnect) {
        console.log("🔄 Reconnecting...");
        startNova();
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];

    if (!msg.message || msg.key.fromMe) return;

    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      "";

    const command = text.trim().toLowerCase();

    if (command === ".ping") {
      await sock.sendMessage(msg.key.remoteJid, {
        text: "🏓 Pong!\n\n🤖 NOVA MINI is online."
      });
    }

    if (command === ".menu") {
      await sock.sendMessage(msg.key.remoteJid, {
        text:
`╭━━〔 🤖 NOVA MINI 〕━━➢
┃
┃ 📥 DOWNLOAD
┃ ➠ .youtube
┃ ➠ .tiktok
┃ ➠ .song
┃ ➠ .video
┃
┃ 🛠️ OTHER
┃ ➠ .ping
┃ ➠ .help
┃
╰━━━━━━━━━━━━━━━━━━━━➢`
      });
    }

    if (command === ".help") {
      await sock.sendMessage(msg.key.remoteJid, {
        text: "🤖 NOVA MINI\n\nType .menu to see available commands."
      });
    }
  });
}

startNova();
