
#include "http_server.h"

void registerUserSessionHandlers(HttpServer &server);
void initSession(struct mg_connection *c, struct mg_http_message *msg);

using UserSession = struct UserSession{
    std::string userId;
};