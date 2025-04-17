#include "common.h"
#include "audio_handler.h"
#include "files.h"
#include "mongoose.h"

void registerAudioHandlers(HttpServer &server) {
    server.registerHandler("/api/v1/analysis/startAudio", runAudioAnalysis);
}

void runAudioAnalysis(struct mg_connection *c, struct mg_http_message *msg, int *us) {
    // TODO: Use proper token from web request
    std::string token = "sometoken";
    UserSession user_sess = server.getUserSession(token);
    std::string us_folder = getUserMediaDir(user_sess);
    
    mg_http_reply(c, 200, "Content-Type: application/json", "");
}