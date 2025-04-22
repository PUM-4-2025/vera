#ifndef AUDIO_H
#define AUDIO_H

#include <string>

#include "http_server.h"

/**
 * API functionality for backend
 */
void registerAudioHandlers(HttpServer &server);

void runAudioAnalysis(struct mg_connection *c, struct mg_http_message *msg, HttpServer *hs);

/**
 * Backend functions for performing actual analysis
 */
int dbAnalysis(const std::string &in_txt, float threshold_db, int min_duration_seconds, UserSession &us);

void extract(const std::string &, UserSession &us);

int visual(const std::string &, UserSession &us);



#endif