import { FastifyRequest } from "fastify";
import Telegram from "node-telegram-bot-api";
import { OpenAI } from "openai";
import { CustomSessionObject, getNewAccessTokenUsingRefreshToken } from ".";
import { credentials } from "./credentials";
import {
  addGoogleImage,
  getGoogleAlbum,
  getUploadToken,
  removeGoogleImage,
} from "./google";
require("log-timestamp");

const normalRes = "1792x1024";

const bot = new Telegram(credentials.telegramToken, { polling: true });
const openai = new OpenAI({ apiKey: credentials.openAIKey });

export const getWeatherForecast = async (url: string) => {
  try {
    const response = await fetch(url);
    let text = "";
    await response
      .json()
      .then((data) => (text = data.regiondata[0].products[0].text));
    return text;
  } catch (error) {
    console.error("An error occurred:", error);
    return null;
  }
};

export const handler = async (request: FastifyRequest) => {
  bot.on("polling_error", (msg) => console.log(msg));
  const token = await getNewAccessTokenUsingRefreshToken(request);

  const key = token.access_token;

  const weatherForecast = await getWeatherForecast(
    "https://www.dmi.dk/dmidk_byvejrWS/rest/texts/2618425"
  );

  if (!weatherForecast) return "No weather forecast found!!!!!";

  try {
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You will now act as a prompt generator. I will describe weather conditions for you, and you will create a detailed prompt that could be used for image generation. The image must also have a narrative element and tell a story. The styles should be either cubism, surrealism, abstract, digital art or impressionism. You must pick a style randomly. You must also not include any temperature degrees in the prompt and it should paint a picture of the overall weather during the daytime - not taking weather transitions into account.",
        },
        { role: "user", content: weatherForecast },
      ],
      model: "gpt-4",
    });

    const prompt = completion.choices[0].message.content;
    console.log(prompt);

    const album = await getGoogleAlbum(key);
    const previousImageId = album ? album.coverPhotoMediaItemId : undefined;

    if (!prompt) return "No prompt generated";

    const image = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: normalRes,
    });

    if (!image.data[0].url) return "No image generated";

    console.log("Image binary", image.data[0]);
    let blob = await fetch(image.data[0].url).then((r) => r.blob());

    if (image) {
      const buffer = await blob.arrayBuffer();
      const photo = Buffer.from(buffer);
      bot.sendPhoto(credentials.chatId, photo);
    }

    const uploadToken = await getUploadToken(key, blob);
    console.log("Upload token", uploadToken);
    const mediaItem = await addGoogleImage(
      key,
      uploadToken,
      prompt.substring(0, 950)
    );
    console.log("Media item", mediaItem);
    if (
      mediaItem?.newMediaItemResults.length === 0 ||
      !mediaItem?.newMediaItemResults[0]
    ) {
      console.log("Failed to retrieve media item from Google Photos");
      return "Failed to retrieve media item from Google Photos";
    }

    if (previousImageId) {
      await removeGoogleImage(key, previousImageId);
    }

    (request.session as CustomSessionObject).previousImageId =
      mediaItem.newMediaItemResults[0].mediaItem.id;

    console.log(
      `Added ${
        (request.session as CustomSessionObject).previousImageId
      } to session}`
    );
    console.log("Successfully uploaded image to Google Photos 🎉");
    return "Successfully uploaded image to Google Photos";
  } catch (error: any) {
    console.error(error);
    bot.sendMessage(credentials.chatId, error.message);
  }
};
