#ifndef HTTP_UTILS_H
#define HTTP_UTILS_H

#include "mongoose.h"

#include <string>

void send_http_response(struct mg_connection *c, int http_code, std::string body);

int handlePreflight(struct mg_connection *c, struct mg_http_message *msg);

std::string getVeraHeaders();

#endif
