# Pablo bot

## Idea
The idea of this is to make a server that uses a cron job to daily generate art related to the weather forecast. It does so by using a web scraper to get weather forecast, then uses gpt to generate a prompt from that, then uses dalle 3 to generate the image and send it via Telegram.

## Development
To start the development server run:
```bash
bun dev
```

Open http://localhost:8080/ with your browser to trigger the / get handler.