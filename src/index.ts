import fastify from "fastify";
import { handler } from "./bot";

const server = fastify({ logger: true });

server.get("/", handler);

server.listen({ port: 8080 }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Started server at ${address}`);
});
