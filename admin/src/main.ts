import { createServer } from "node:http";

const port = 3003;

const server = createServer((_, response) => {
  response.writeHead(200, {
    "content-type": "text/plain; charset=utf-8",
  });
  response.end("helloworld");
});

server.listen(port, "0.0.0.0");
