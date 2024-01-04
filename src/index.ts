import fastify from "fastify";
import { handler } from "./bot";

const cron = require("node-cron");

const server = fastify();

server.get("/", handler);
cron.schedule("0 6 * * *", handler);

server.listen({ port: 8080 }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Started server at ${address}`);
});
