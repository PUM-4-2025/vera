#include "upload_media.h"

#include "../../extern/json/json.hpp"
using json = nlohmann::json;

/**
 * Returns a unique id for uploading media.
 * TODO: Replace with proper implementation once sessions are
 * able to be tracked.
 */
int get_upload_id() {
  return 1;
}

void register_media_handlers(HttpServer &server) {
  server.registerHandler("/api/v1/uploads/initiate", init_upload);
  server.registerHandler("/api/v1/uploads/chunks", upload_chunk);
  server.registerHandler("/api/v1/uploads/status", upload_status);
}

void init_upload(struct mg_connection *c, struct mg_http_message *msg) {
  std::string body = msg->body.buf;
  json json_body = json::parse(body);

  int upload_id = get_upload_id();
  json response = {{"uploadId", upload_id},
                   {"status", "initiated"},
                   {"message", "Upload session initiated successfully."}};
  std::string response_str = response.dump();

  mg_http_reply(c, 200, "Content-Type: application/json\r\n", response_str.c_str());
}

void upload_chunk(struct mg_connection *, struct mg_http_message *) {}

void upload_status(struct mg_connection *, struct mg_http_message *) {}
