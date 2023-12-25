import Telegram from "node-telegram-bot-api";
import { OpenAI } from "openai";
import puppeteer from "puppeteer";
import { credentials } from "../credentials";

const bot = new Telegram(credentials.telegramToken, { polling: true });
const openai = new OpenAI({ apiKey: credentials.openAIKey });

export const scraper = async (url: string, selector: string) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);

  await page.waitForSelector(selector);
  const data = await page.$eval(selector, (el) => el.textContent);

  await browser.close();

  return data;
};

export const handler = async () => {
  const weatherForecast = await scraper(
    "https://www.dmi.dk/lokation/show/DK/2618425/K%C3%B8benhavn/",
    ".weather-forecast"
  );

  if (!weatherForecast) return "No weather forecast found";

  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content:
          "You will now act as a prompt generator. I will describe weather conditions for you, and you will create a prompt that could be used for image generation. The image must also have a narrative element and tell a story. The styles should be either cubism, surrealism, abstract, digital art or impressionism. You must pick a style randomly. You must also not include any temperature degrees in the prompt and it should paint a picture of the overall weather during the daytime - not taking weather transitions into account.",
      },
      { role: "user", content: weatherForecast },
    ],
    model: "gpt-4",
  });

  const prompt = completion.choices[0].message.content;
  console.log(prompt);

  if (!prompt) return "No prompt generated";

  const image = await openai.images.generate({
    model: "dall-e-3",
    prompt,
    n: 1,
    size: "1024x1024",
  });

  if (!image.data[0].url) return "No image generated";

  if (image) bot.sendPhoto(credentials.chatId, image.data[0].url);
};

bot.on("message", handler);
