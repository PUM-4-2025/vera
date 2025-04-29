#include "http_utils.h"

#include <json.hpp>
using json = nlohmann::json;

void send_http_response(struct mg_connection *c, int http_code, std::string body) {
  mg_http_reply(c, http_code,
                "Access-Control-Allow-Origin: *\r\n"
                "Content-Type: application/json\r\n"
                "X-Content-Type-Options: nosniff\r\n",
                body.c_str());
}

/**
 * Handles CORS preflight message from web-browsers.
 */
int handlePreflight(struct mg_connection *c, struct mg_http_message *msg) {
  if (msg->body.len == 0 || msg->method.buf == "OPTIONS") {
    mg_http_reply(c, 204,
                  "Access-Control-Allow-Origin: *\r\n"
                  "Access-Control-Allow-Methods: GET, POST\r\n"
                  "Access-Control-Allow-Headers: Content-Type\r\n"
                  "Access-Control-Allow-Credentials: false\r\n",
                  "");
    return 0;
  }
  return 1;
}