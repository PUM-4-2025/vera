#include "http_utils.h"

#include <json.hpp>
using json = nlohmann::json;

void send_http_response(struct mg_connection *c, int http_code, int id, std::string status,
                        std::string message) {
  json response = {{"uploadId", id}, {"status", status}, {"message", message}};
  std::string response_str = response.dump();
  mg_http_reply(c, http_code,
                "Access-Control-Allow-Origin: *\r\n"
                "Content-Type: application/json\r\n"
                "X-Content-Type-Options: nosniff\r\n",
                response_str.c_str());
}

/**
 * TODO: Reimplement this function. Currently doesn't work.
 * Currently CORS is not used in client. Could be worth enabling CORS
 * to follow better developer practice.
 */
int handlePreflight(struct mg_connection *c, struct mg_http_message *msg) {
  if (msg->body.len == 0 || msg->method.buf == "OPTIONS") {
    mg_http_reply(c, 204,
                  "Access-Control-Allow-Origin: *\r\n"
                  "Access-Control-Allow-Methods: GET, POST\r\n"
                  "Access-Control-Allow-Headers: content-type\r\n"
                  "Access-Control-Allow-Credentials: false\r\n",
                  "");
    return 0;
  }
  return 1;
}

