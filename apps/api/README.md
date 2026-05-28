# Vkara API

## An open-source API for the Vkara project

## Technologies used

- [Bun](https://github.com/oven-sh/bun)
- [Elysia](https://github.com/elysiajs/elysia)
- Websockets, MongoDB, Redis, Bullmq

## How to run

```bash
# Clone the repository
git clone https://github.com/lehuygiang28/vkara-api

# Install dependencies
bun install

# Run the server
bun run dev # run the websocket server
# bun run dev2 # run the youtube checker
```

For testing that your browser support websockets, visit [this page](https://echo.websocket.org/.ws). If you see some messages send to you every seconds, then your browser supports websockets
