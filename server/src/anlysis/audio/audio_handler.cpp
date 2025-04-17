#include "audio_handler.h"
#include "files.h"
#include "http_server.h"
#include "mongoose.h"

void registerAudioHandlers(HttpServer &server) {
    server.registerHandler("/api/v1/analysis/startAudio", runAudioAnalysis);
}

void runAudioAnalysis(struct mg_connection *c, struct mg_http_message *msg, HttpServer *hs) {
    // TODO: Use proper token from web request
    std::string token = "sometoken";
    UserSession *us = hs->getUserSession(token);
    std::string us_folder = getUserMediaDir(*us);
    
    mg_http_reply(c, 200, "Content-Type: application/json", "");
}