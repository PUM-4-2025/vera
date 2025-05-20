#ifndef VIDEO_H
#define VIDEO_H

#include "http_server.h"

#include <string>

float getFramePerSecond(std::string path);
/*
* Getter for frameRate of video
*/

void registerVideoHandlers(HttpServer &server);

/**
 * API functionality for backend
 */

void runVideoAnalysis(struct mg_connection *c, struct mg_http_message *msg, HttpServer *hs);

/**
 * Backend functions for performing actual analysis
 */
std::vector<int> analyse_video(std::string path, std::vector<int> cords);

#endif
