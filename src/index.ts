import { fastifyCookie } from "@fastify/cookie";
import oauthPlugin from "@fastify/oauth2";
import { FastifySessionObject, fastifySession } from "@fastify/session";
import fastify, {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import fastifyCron from "fastify-cron";
import { handler } from "./bot";
import { credentials } from "./credentials";
require("log-timestamp");
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

const server = fastify({
  logger: true,
});

server.get("/", handler);
server.register(fastifyCookie);
server.register(fastifySession, {
  cookieName: "pablo",
  secret: "a secret with minimum length of 32 characters",
  cookie: { secure: false },
});

server.register(fastifyCron, {
  jobs: [
    {
      name: "Daily cron job",
      cronTime: "30 * * * *",
      // Note: the callbacks (onTick & onComplete) take the server
      // as an argument, as opposed to nothing in the node-cron API:
      onTick: async (fastify: FastifyInstance) => {
        try {
          const response = await fastify.inject("/");
          console.log(response.json());
        } catch (err) {
          console.error(err);
        }
      },
      onComplete: (fastify: FastifyInstance) => {
        console.log("cron job completed");
        fastify.log.info("cron job completed");
      },
    },
  ],
});

server.register(oauthPlugin, {
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

server.get(
  "/auth/google/callback",
  async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { token } = await (
        server as any
      ).googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);
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

  const { token: newToken } = await (
    server as any
  ).googleOAuth2.getNewAccessTokenUsingRefreshToken({
    refresh_token: refreshToken,
  });

  (req.session as CustomSessionObject).token = newToken;
  return newToken;
};

server.listen({ port: 8080 }, (err: any, address: any) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  server.cron.startAllJobs();
  console.log(`Started server at ${address}`);
});
