#include "files.h"
#include "http_server.h"
#include "http_utils.h"
#include "video.h"

#include <json.hpp>
#include <mongoose.h>
#include <opencv2/opencv.hpp>
#include <vector>
using json = nlohmann::json;

float getFramePerSecond(std::string path) {
  float fps;
  cv::VideoCapture cap(path);
  fps = (float)cap.get(cv::CAP_PROP_FPS);
  cap.release();

  // Return fps if fps > 0
  return (fps > 0) ? fps : 20;
}

void registerVideoHandlers(HttpServer &server) {
  server.registerHandler("/api/v1/analysis/startMotion", runVideoAnalysis);
}

void runVideoAnalysis(struct mg_connection *c, struct mg_http_message *msg, HttpServer *hs) {
  if (handlePreflight(c, msg) == 0) {
    return;
  }

  std::string body = msg->body.buf;
  json json_body = json::parse(body);

  std::string user_token = json_body["token"];

  UserSession *us = hs->getUserSession(user_token);

  if (us == nullptr) {
    json response = {{"status", "Not found"}, {"message", "UserSession not found!"}};
    std::string response_str = response.dump();
    send_http_response(c, 401, response_str);
  }

  std::string path = getUserMediaDir(*us);

  // Get path to file that should be analysed
  std::string f = json_body["fileName"];
  std::string filename = sanitizeName(f);

  path.append(filename);

  int x = json_body["x"];
  int w = json_body["w"];
  int y = json_body["y"];
  int h = json_body["h"];

  std::vector<int> coords = {x, w, y, h};

  std::vector<int> result = analyse_video(path, coords);

  json response = {{"status", "OK"}, {"motion", result}};
  std::string response_str = response.dump();
  send_http_response(c, 200, response_str);
}
