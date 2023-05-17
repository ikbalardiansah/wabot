import express from "express";
import { initWhatsapp, getStatus } from "../helper/whatsappbot";
import serverless from "serverless-http";

const port = 8000;
const app = express();
const router = express.Router();

app.get("/", getStatus);

app.listen(port, async () => {
  console.log(`Server running on ${port}`);
  await initWhatsapp();
});

app.use('/.netlify/functions/index', router)
module.exports.handler = serverless(app);
