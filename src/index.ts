import cron from "@elysiajs/cron";
import { Elysia } from "elysia";
import { handler } from "./bot";

const app = new Elysia()
  .use(
    cron({
      name: "daily-art",
      pattern: "0 6 * * *",
      run() {
        handler;
      },
    })
  )
  .get("/", handler)
  .listen(8080);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
