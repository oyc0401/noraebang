import { createServer } from "node:http";

const port = 3003;

const server = createServer((_, response) => {
  response.writeHead(200, {
    "content-type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify({ service: "jpop-admin", status: "ok" }));
});

server.listen(port, "0.0.0.0");
