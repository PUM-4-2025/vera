#include "user_session.h"
#include "user_session_handler.h"


#include <json.hpp>
#include <string>

using json = nlohmann::json;

UserSessionHandler USER_SESSION_HANDLER;

void registerUserSessionHandlers(HttpServer &server){
    server.registerHandler("api/v1/user-sessions/initiate", initUserSession);
}

void initUserSession(struct mg_connection *c, struct mg_http_message *msg, HttpServer *hs){
    if(handlePreflight(c, msg) == 0){
        return;
    }
    
    try{
        std::string body = msg->body.buf;

        json json_body = json::parse(body);
        std::string userId = json_body["userId"];

        UserSession new_session = {};
        new_session.userId = userId;

        USER_SESSION_HANDLER.newSession(new_session);
        char buffer[256];
        snprintf(buffer, sizeof(buffer), "User Session %s initiated successfully.", userId);
        send_http_response(c, 200, 0, "Initiated", buffer);
    }
    catch (...){
        send_http_response(c, 500, 0, "Failiure", "Server encountered an exeption while initiating new UserSession");
    }

}


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