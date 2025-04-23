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
    // TODO: REPLACE_TOKEN
    UserSession *us = hs->getUserSession("");
    std::string us_folder = getUserMediaDir(*us);

    // Get path to file that should be analysed
    std::string body = msg->body.buf;
    json json_body = json::parse(body);
    std::string filename = json_body["filename"];

    // Extract audio
    extract(filename, *us);
    std::string wav_file = filename.append(".wav");

    // Extract amplitude
    visual(wav_file, *us);
    std::string txt_file = wav_file.append(".txt");

    // Anaylse audio
    db_analysis(txt_file, 40, 180, *us);
    std::string result_file = txt_file.append(".csv");

    // Read csv results
    std::string audio_visuals = readTextFile(txt_file, *us);

    json response = {{"status", "OK"}, {"audio", audio_visuals}};
    std::string response_str = response.dump();
    
    mg_http_reply(c, 200, "Content-Type: application/json", response_str.c_str());
}