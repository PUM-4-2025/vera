#include "files.h"
#include "http_server.h"
#include "video.h"

#include <opencv2/opencv.hpp>

#include <mongoose.h>
#include <json.hpp>
using json = nlohmann::json;


void runVideoAnalysis(struct mg_connection *c, struct mg_http_message *msg, HttpServer *hs) {
    // TODO: REPLACE_TOKEN
    UserSession *us = hs->getUserSession("");
    std::string us_folder = getUserMediaDir(*us);

    // Get path to file that should be analysed
    std::string body = msg->body.buf;
    json json_body = json::parse(body);
    std::string filename = json_body["fileName"];


    cv::Mat img = cv::imread("s.png");
    cv::imshow("bild", img);

}