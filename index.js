import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason
} from "@whiskeysockets/baileys";
import pino from "pino";
import http from "http";

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
    lastDisconnect
  }) => {

    if (connection === "open") {
      console.log("🤖 NOVA MINI connected!");
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

    const command = text.trim();
    const lower = command.toLowerCase();

    if (lower === ".ping") {
      await sock.sendMessage(msg.key.remoteJid, {
        text: "🏓 Pong!\n\n🤖 NOVA MINI is online."
      });
    }

    if (lower === ".menu") {
      await sock.sendMessage(msg.key.remoteJid, {
        text: `╭━━〔 🤖 NOVA MINI 〕━━➢
┃
┃ 🛠️ BASIC
┃ ➠ .ping
┃ ➠ .help
┃ ➠ .menu
┃
┃ 📚 API
┃ ➠ .define <word>
┃
╰━━━━━━━━━━━━━━━━━━━━➢`
      });
    }

    if (lower === ".help") {
      await sock.sendMessage(msg.key.remoteJid, {
        text:
          "🤖 NOVA MINI\n\nType .menu to see available commands."
      });
    }

    if (lower.startsWith(".define ")) {
      const word = command.slice(8).trim();

      if (!word) {
        await sock.sendMessage(msg.key.remoteJid, {
          text: "📚 Usage: .define <word>"
        });
        return;
      }

      try {
        const response = await fetch(
          `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`
        );

        if (!response.ok) {
          await sock.sendMessage(msg.key.remoteJid, {
            text: `❌ No definition found for: ${word}`
          });
          return;
        }

        const data = await response.json();
        const entry = data[0];

        const meaning = entry.meanings?.[0];
        const definition =
          meaning?.definitions?.[0]?.definition ||
          "No definition available.";

        await sock.sendMessage(msg.key.remoteJid, {
          text:
`📚 WORD: ${word}

🔤 Type: ${meaning?.partOfSpeech || "Unknown"}

📖 Meaning:
${definition}

🤖 NOVA MINI`
        });

      } catch (error) {
        console.error(error);

        await sock.sendMessage(msg.key.remoteJid, {
          text: "❌ API error. Please try again later."
        });
      }
    }
  });
}

startNova().catch((error) => {
  console.error("❌ NOVA MINI error:", error);
});
