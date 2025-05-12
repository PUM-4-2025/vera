#ifndef VIDEO_H
#define VIDEO_H

#include <string>

#include "http_server.h"

/**
 * API functionality for backend
 */

void runVideoAnalysis(struct mg_connection *c, struct mg_http_message *msg, HttpServer *hs);

/**
 * Backend functions for performing actual analysis
 */
std::vector<int> analyse_video(std::vector<int> cords);

#endif