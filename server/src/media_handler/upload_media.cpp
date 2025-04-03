#include "upload_media.h"

void register_media_handlers(HttpServer &server) {
  server.registerHandler("/api/v1/uploads/initiate", init_upload);
  server.registerHandler("/api/v1/uploads/chunks", upload_chunk);
  server.registerHandler("/api/v1/uploads/status", upload_status);
}

void init_upload(struct mg_connection *c, struct mg_http_message *msg) {
  mg_str body = msg->body;

  mg_http_reply(c, 200, "Content-Type: text/plain\r\n", body.buf);
}

void upload_chunk(struct mg_connection *, struct mg_http_message *) {}

void upload_status(struct mg_connection *, struct mg_http_message *) {}