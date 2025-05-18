#include "audio.h"
#include "files.h"
#include "http_server.h"
#include "http_utils.h"

#include <iostream>
#include <json.hpp>
#include <mongoose.h>
using json = nlohmann::json;

void registerAudioHandlers(HttpServer &server) {
  server.registerHandler("/api/v1/analysis/startAudio", runAudioAnalysis);
}

void runAudioAnalysis(struct mg_connection *c, struct mg_http_message *msg, HttpServer *hs) {
  if (handlePreflight(c, msg) == 0) {
    return;
  }

  std::string body = msg->body.buf;
  json json_body = json::parse(body);

  std::string user_token = json_body["token"];

  std::cout << user_token << "\n";
  UserSession *us = hs->getUserSession(user_token);

  if (us == nullptr) {
    json response = {{"status", "Not found"}, {"message", "UserSession not found!"}};
    std::string response_str = response.dump();
    send_http_response(c, 401, response_str);
  }

  std::string us_folder = getUserMediaDir(*us);

  // Get path to file that should be analysed
  std::string f = json_body["fileName"];
  std::string filename = sanitizeName(f);

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

  json response = {{"status", "OK"}, {"audio", audio_visuals}};
  std::string response_str = response.dump();

  send_http_response(c, 200, response_str);
}
