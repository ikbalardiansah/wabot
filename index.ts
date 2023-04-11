import express from "express";
import { initWhatsapp, getStatus } from "./helper/whatsappbot";

const port = 8000;

const app = express();

app.get("/", getStatus);

app.listen(port, async () => {
  console.log(`Server running on ${port}`);
  await initWhatsapp();
});
