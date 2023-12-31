import Telegram from "node-telegram-bot-api";
import { OpenAI } from "openai";
import { credentials } from "./credentials";

const bot = new Telegram(credentials.telegramToken, { polling: true });
const openai = new OpenAI({ apiKey: credentials.openAIKey });

// Scraper with puppeteer - not used as puppeteer is not supported on pm2
// export const scraper = async (url: string, selector: string) => {
//   const browser = await puppeteer.launch();
//   const page = await browser.newPage();
//   await page.goto(url);

//   await page.waitForSelector(selector);
//   const data = await page.$eval(selector, (el) => el.textContent);

//   await browser.close();

//   return data;
// };

export const getWeatherForecast = async (url: string) => {
  try {
    const response = await fetch(url);
    let text = "";
    await response
      .json()
      .then((data) => (text = data.regiondata[0].products[0].text));
    console.log(text);
    return text;
  } catch (error) {
    console.error("An error occurred:", error);
    return null;
  }
};

export const handler = async () => {
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
  } catch (error: any) {
    console.error(error);
    bot.sendMessage(credentials.chatId, error.message);
  }
};
