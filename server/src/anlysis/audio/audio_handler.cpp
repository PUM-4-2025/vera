#include "files.h"
#include "http_server.h"
#include "audio.h"

#include <mongoose.h>

#include <json.hpp>
using json = nlohmann::json;

void registerAudioHandlers(HttpServer &server) {
    server.registerHandler("/api/v1/analysis/startAudio", runAudioAnalysis);
}

void runAudioAnalysis(struct mg_connection *c, struct mg_http_message *msg, HttpServer *hs) {
    std::string body = msg->body.buf;
    json json_body = json::parse(body);

    std::string user_token = json_body["token"];
    UserSession *us = hs->getUserSession(user_token);

    std::string us_folder = getUserMediaDir(*us);

    // TODO: Fill with proper order for audio analysis
    // Requires some help from Oscar.
    
    mg_http_reply(c, 200, "Content-Type: application/json", "");
}