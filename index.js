import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason
} from "@whiskeysockets/baileys";
import pino from "pino";
import http from "http";

// Render Web Service එකට port එකක් අවශ්‍යයි
const PORT = process.env.PORT || 10000;

http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("🤖 NOVA MINI is online!");
}).listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Web server running on port ${PORT}`);
});

async function startNova() {
  const { state, saveCreds } =
    await useMultiFileAuthState("./auth_info");

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" })
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async ({
    connection,
    lastDisconnect,
    qr
  }) => {

    if (qr) {
      console.log("📱 WhatsApp QR code received.");
      console.log(qr);
    }

    if (connection === "open") {
      console.log("╭━━〔 🤖 NOVA MINI 〕━━➢");
      console.log("┃ ✅ WhatsApp connected!");
      console.log("╰━━━━━━━━━━━━━━━━━━━━➢");
    }

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !==
        DisconnectReason.loggedOut;

      console.log("❌ Connection closed.");

      if (shouldReconnect) {
        console.log("🔄 Reconnecting...");
        setTimeout(startNova, 5000);
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];

    if (!msg?.message || msg.key.fromMe) return;

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
        text: `╭━━〔 🤖 NOVA MINI 〕━━➢
┃
┃ 🛠️ OTHER
┃ ➠ .ping
┃ ➠ .help
┃ ➠ .menu
┃
╰━━━━━━━━━━━━━━━━━━━━➢`
      });
    }

    if (command === ".help") {
      await sock.sendMessage(msg.key.remoteJid, {
        text:
          "🤖 NOVA MINI\n\nType .menu to see available commands."
      });
    }
  });
}

startNova().catch((err) => {
  console.error("❌ NOVA MINI error:", err);
});
