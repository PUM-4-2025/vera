#include "files.h"
#include "http_server.h"
#include "audio.h"
#include "http_utils.h"

#include <iostream>
#include <mongoose.h>
#include <json.hpp>
#include <string>
#include <vector>
using json = nlohmann::json;

void registerAudioHandlers(HttpServer &server) {
    server.registerHandler("/api/v1/analysis/startAudio", runAudioAnalysis);
}

void runAudioAnalysis(struct mg_connection *c, struct mg_http_message *msg, HttpServer *hs) {
    if (handlePreflight(c,msg) == 0) {
        return;
    }

    // TODO: REPLACE_TOKEN
    UserSession *us = hs->getUserSession("");
    std::string us_folder = getUserMediaDir(*us);

    // Get path to file that should be analysed
    std::string body = msg->body.buf;
    json json_body = json::parse(body);
    std::string filename = json_body["fileName"];

    // Extract audio
    extract(filename, *us);
    std::string wav_file = filename + ".wav";

    // Extract amplitude
    visual(wav_file, *us);
    std::string txt_file = wav_file + ".txt";

    // Anaylse audio
    db_analysis(txt_file, 40, 180, *us);
    std::string result_file = txt_file + ".csv";

    // Read csv results
    std::string txt_path = us_folder + txt_file;
    std::string audio_visuals = readTextFile(txt_path, *us);
    
    // Convert string to list of doubles.
    // Has to be double or else json will change the
    // values due to lack of precision.
    std::vector<double> nums;
    std::string str_num;
    for (const char &i: audio_visuals) {
        if (i == *"\n") {
            nums.push_back(std::stod(str_num));
            str_num.clear();
        } else {
            str_num.push_back(i);
        }
    }

    json response = {{"status", "OK"}, {"audio", nums}};
    std::string response_str = response.dump();
    send_http_response(c, 200, response_str);
}