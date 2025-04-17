#include "files.h"
#include "http_server.h"
#include "audio.h"

#include <mongoose.h>

void registerAudioHandlers(HttpServer &server) {
    server.registerHandler("/api/v1/analysis/startAudio", runAudioAnalysis);
}

void runAudioAnalysis(struct mg_connection *c, struct mg_http_message *msg, HttpServer *hs) {
    // TODO: REPLACE_TOKEN
    UserSession *us = hs->getUserSession("");
    std::string us_folder = getUserMediaDir(*us);
    
    mg_http_reply(c, 200, "Content-Type: application/json", "");
}