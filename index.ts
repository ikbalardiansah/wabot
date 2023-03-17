import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  BufferJSON,
} from "@adiwajshing/baileys";
import { Boom } from "@hapi/boom";
import axios from "axios";
import express from "express";
import http from "http";
// @ts-ignore
import stringExtractor from "string-extractor";

const app = express();
const port = 8000;
const PORT = process.env.PORT || 8000;
const server = http.createServer(app);
const io = require("socket.io")(server);
const qrcode = require("qrcode");

app.get("/", (req, res) => {
  res.sendFile("index.html", { root: __dirname });
});

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState("auth");
  const sock = makeWASocket({
    // can provide additional config here
    printQRInTerminal: true,
    auth: state,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      const shouldReconnect =
        (lastDisconnect?.error as Boom)?.output?.statusCode !==
        DisconnectReason.loggedOut;
      console.log(
        "connection closed due to ",
        lastDisconnect?.error,
        ", reconnecting ",
        shouldReconnect
      );
      // reconnect if not logged out
      if (shouldReconnect) {
        connectToWhatsApp();
      }
    } else if (connection === "open") {
      console.log("opened connection");
    }
  });

  sock.ev.on("messages.upsert", async (m) => {
    console.log(JSON.stringify(m, undefined, 2));

    // Balas chat masuk, harus di jawab selamat datang
    const msg = m.messages[0];

    if (msg.message?.conversation?.toLowerCase() === "list") {
      const sections = [
        {
          title: "Menu",
          rows: [
            { title: "Belanja lewat CS", rowId: "option1" },
            {
              title: "Lacak Order",
              rowId: "option2",
            },
            { title: "Lokasi Toko", rowId: "option3" },
            {
              title: "Promo",
              rowId: "option4",
            },
            { title: "Check Stok Produk", rowId: "option5" },
            { title: "Chat dengan CS", rowId: "option6" },
          ],
        },
      ];
      const listMessage = {
        text: "Halo kak! Saya Ikbal admin KLIKnKLIK, silahkan pilih menu untuk menggunakan layanan ini yah.",
        footer: "Kunjungi juga website kita di: https://www.kliknklik.com",
        title: "Selamat datang di layanan online KLIKnKLIK",
        buttonText: "List Menu",
        sections,
      };

      const sendMsg = await sock.sendMessage(msg.key.remoteJid!, listMessage);
    } else if (
      msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId ==
      "option1"
    ) {
      await sock.sendMessage(
        msg.key.remoteJid!,
        {
          text: "Mohon ditunggu sebentar. CS kami akan segera terhubung.",
        },
        { quoted: msg }
      );
    } else if (
      msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId ==
      "option6"
    ) {
      await sock.sendMessage(
        msg.key.remoteJid!,
        {
          text: "Mohon ditunggu sebentar. ",
        },
        { quoted: msg }
      );
    } else if (
      msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId ==
      "option5"
    ) {
      const buttons = [
        { buttonId: "id5", buttonText: { displayText: "Laptop" }, type: 1 },
        { buttonId: "id6", buttonText: { displayText: "Aksesoris" }, type: 1 },
      ];

      const buttonMessage = {
        text: "Silahkan pilih Stok Produk",
        footer:
          "Ini adalah pesan otomatis, jadi bisa saja ada kekeliruan. Untuk menanyakan produk yang pasti bisa langsung tanyakan ke Customer Service dengan ketik `List`.",
        buttons: buttons,
        headerType: 1,
      };

      const sendMsg = await sock.sendMessage(msg.key.remoteJid!, buttonMessage);
    } else if (msg.message?.buttonsResponseMessage?.selectedButtonId == "id5") {
      const str1 = `Ketik laptop yang ingin anda cari, contoh:\n\n*LAPTOP ACER ASPIRE 3 A315 INTEL I5*`;

      await sock.sendMessage(
        msg.key.remoteJid!,
        {
          text: str1,
        },
        { quoted: msg }
      );
    } else if (msg.message?.conversation?.toLowerCase().includes("laptop")) {
      axios
        .get(
          "https://script.google.com/macros/s/AKfycbySbIcrp7Wd_SQXaxLqUMFXxoSnzUjinTwMrsVWTA-iN0GKIYwzU0rftmh3ejolCaZawg/exec"
        )
        .then(async (response) => {
          const data = response.data.data;

          let result: any[] = [];
          const pattern = `LAPTOP {{laptop}}`;
          const opts = { ignoreCase: true };
          const extract = stringExtractor(pattern, opts);

          const { laptop } = extract(msg.message?.conversation);
          console.log(laptop);

          let header = `Stok Laptop\n\nType : *${laptop}*`;
          let x = 0;

          data.forEach(async (element: any) => {
            if (element.type.toLowerCase().includes(laptop.toLowerCase())) {
              result.push(element);
            }
          });

          header =
            header +
            `\n\nHasil Stok : ${result.length} Unit tersisa.\n\n_Jika ingin menanyakan stok produk lebih detail seperti RAM, Processor, dan lain-lain silahkan hubungi custumer service kami dengan mengetik "List"._`;

          await sock.sendMessage(
            msg.key.remoteJid!,
            {
              text: header,
            },
            { quoted: msg }
          );
        });
    } else if (msg.message?.buttonsResponseMessage?.selectedButtonId == "id6") {
      await sock.sendMessage(
        msg.key.remoteJid!,
        {
          text: "Fitur ini sedang di maintence. Silahkan ketik `List` untuk kembali menu di awal. ",
        },
        { quoted: msg }
      );
    } else if (
      msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId ==
      "option4"
    ) {
      const buttons = [
        {
          buttonId: "id3",
          buttonText: { displayText: "Tanya Customer Service" },
          type: 1,
        },
        {
          buttonId: "id4",
          buttonText: { displayText: "Order Lewat Customer Service" },
          type: 1,
        },
      ];

      const buttonMessage = {
        image: { url: "https://i.imgur.com/eT7R8wg.png" },
        caption: "PROMO BULAN INI!",
        footer: "Dapatkan promo menarik",
        buttons: buttons,
        headerType: 4,
      };

      const sendMsg = await sock.sendMessage(
        msg.key.remoteJid!,
        buttonMessage,
        { quoted: msg }
      );
    } else if (msg.message?.buttonsResponseMessage?.selectedButtonId == "id3") {
      await sock.sendMessage(
        msg.key.remoteJid!,
        {
          text: "Mohon ditunggu sebentar. ",
        },
        { quoted: msg }
      );
    } else if (msg.message?.buttonsResponseMessage?.selectedButtonId == "id4") {
      await sock.sendMessage(
        msg.key.remoteJid!,
        {
          text: "Mohon ditunggu sebentar. ",
        },
        { quoted: msg }
      );
    } else if (
      msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId ==
      "option3"
    ) {
      const sections = [
        {
          title: "List Toko",
          rows: [
            { title: "Cabang Jakarta", rowId: "option7" },
            { title: "Cabang Bogor", rowId: "option8" },
            { title: "Cabang Tangerang", rowId: "option9" },
            { title: "Cabang Depok", rowId: "option10" },
            { title: "Cabang Bekasi", rowId: "option11" },
            { title: "Cabang Bandung", rowId: "option12" },
          ],
        },
      ];

      const listMessage = {
        text: "Offline Store KLIKnKLIK",
        footer: "Kunjungi juga website kita di: https://www.kliknklik.com",
        title: "Lokasi Toko",
        buttonText: "Lihat Toko",
        sections,
      };

      const sendMsg = await sock.sendMessage(msg.key.remoteJid!, listMessage);
    } else if (
      msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId ==
      "option7"
    ) {
      await sock.sendMessage(
        msg.key.remoteJid!,
        {
          text: "Check disini https://www.kliknklik.com/toko-jakarta/ ",
        },
        { quoted: msg }
      );
    } else if (
      msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId ==
      "option8"
    ) {
      await sock.sendMessage(
        msg.key.remoteJid!,
        {
          text: "Check disini https://www.kliknklik.com/toko-bogor/ ",
        },
        { quoted: msg }
      );
    } else if (
      msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId ==
      "option9"
    ) {
      await sock.sendMessage(
        msg.key.remoteJid!,
        {
          text: "Check disini https://www.kliknklik.com/toko-depok ",
        },
        { quoted: msg }
      );
    } else if (
      msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId ==
      "option10"
    ) {
      await sock.sendMessage(
        msg.key.remoteJid!,
        {
          text: "Check disini https://www.kliknklik.com/toko-tangerang/ ",
        },
        { quoted: msg }
      );
    } else if (
      msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId ==
      "option11"
    ) {
      await sock.sendMessage(
        msg.key.remoteJid!,
        {
          text: "Check disini https://www.kliknklik.com/toko-bekasi/ ",
        },
        { quoted: msg }
      );
    } else if (
      msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId ==
      "option12"
    ) {
      await sock.sendMessage(
        msg.key.remoteJid!,
        {
          text: "Check disini https://www.kliknklik.com/toko-bandung/ ",
        },
        { quoted: msg }
      );
    } else if (
      msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId ==
      "option2"
    ) {
      const str1 = `Silakan masukkan nomor resi anda. Contoh :\n\nNomor Resi : JNAP-0061460488`;
      const str2 = `Nomor Resi :`;

      await sock.sendMessage(
        msg.key.remoteJid!,
        { text: str1 },
        { quoted: msg }
      );

      await sock.sendMessage(
        msg.key.remoteJid!,
        { text: str2 },
        { quoted: msg }
      );
    } else if (msg.message?.conversation?.toLowerCase().includes("resi")) {
      let result: any[] = [];
      const pattern = `Nomor Resi : {{nomorResi}}`;
      const opts = { ignoreCase: true };
      const extract = stringExtractor(pattern, opts);

      const { nomorResi } = extract(msg.message?.conversation);

      await sock.sendMessage(
        msg.key.remoteJid!,
        {
          text:
            "Silahkan check disini https://cekresi.com/?noresi=" + nomorResi,
        },
        { quoted: msg }
      );
    }
  });
}

// run in main file
connectToWhatsApp();

// Socket IO
io.on("connection", function (socket: any) {
  socket.emit("message", "Connecting....");

  qrcode.toDataURL("qrcode", function (err: any, url: any) {
    socket.emit(url);
    socket.emit("message", "QR Code diterima, silahkan SCAN!");
  });
});

server.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
