import { fastifyCookie } from "@fastify/cookie";
import oauthPlugin from "@fastify/oauth2";
import { FastifySessionObject, fastifySession } from "@fastify/session";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fastifyCron from "fastify-cron";
import { handler } from "./bot";
import { credentials } from "./credentials";

const fastify = require("fastify")();

export interface CustomSessionObject extends FastifySessionObject {
  token: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
    scope: string;
    id_token: string;
  };
  refreshToken: string;
  previousImageId: string;
}

fastify.get("/", handler);
fastify.register(fastifyCookie);
fastify.register(fastifySession, {
  cookieName: "pablo",
  secret: "a secret with minimum length of 32 characters",
  cookie: { secure: false },
  expires: 1800000,
});

fastify.register(fastifyCron, {
  jobs: [
    {
      // Only these two properties are required,
      // the rest is from the node-cron API:
      // https://github.com/kelektiv/node-cron#api
      cronTime: "0 6 * * *", // Everyday at midnight UTC

      // Note: the callbacks (onTick & onComplete) take the server
      // as an argument, as opposed to nothing in the node-cron API:
      onTick: (fastify: FastifyInstance) => {
        fastify.get("/", handler);
        fastify.log.info("cron job running");
      },
    },
  ],
});

fastify.register(oauthPlugin, {
  name: "googleOAuth2",
  scope: [
    "openid",
    "https://www.googleapis.com/auth/photoslibrary",
    "https://www.googleapis.com/auth/photoslibrary.appendonly",
    "https://www.googleapis.com/auth/photoslibrary.sharing",
  ],
  credentials: {
    client: {
      id: credentials.googleClientId,
      secret: credentials.googleClientSecret,
    },
    auth: oauthPlugin.GOOGLE_CONFIGURATION,
  },
  startRedirectPath: "/login/google",
  callbackUri: "http://localhost:8080/auth/google/callback",
  callbackUriParams: {
    access_type: "offline", // will tell Google to send a refreshToken too
  },
  generateStateFunction: () => {
    return "some state";
  },
  checkStateFunction: () => true,
});

fastify.get(
  "/auth/google/callback",
  async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { token } =
        await fastify.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(
          request
        );
      (request.session as CustomSessionObject).token = token;
      (request.session as CustomSessionObject).refreshToken =
        token.refresh_token;

      reply.redirect("/");
    } catch (error) {
      console.log(error);
    }
  }
);

export const getNewAccessTokenUsingRefreshToken = async (
  req: FastifyRequest
) => {
  const refreshToken =
    (req.session as CustomSessionObject).refreshToken ||
    credentials.refreshToken;

  if (!refreshToken) throw new Error("No refresh token found");

  const { token: newToken } =
    await fastify.googleOAuth2.getNewAccessTokenUsingRefreshToken({
      refresh_token: refreshToken,
    });

  (req.session as CustomSessionObject).token = newToken;
  return newToken;
};

fastify.listen({ port: 8080 }, (err: any, address: any) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  fastify.cron.startAllJobs();
  console.log(`Started server at ${address}`);
});
