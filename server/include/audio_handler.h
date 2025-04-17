#ifndef AUDIO_HANDLER_H
#define AUDIO_HANDLER_H

#include "http_server.h"

void registerAudioHandlers(HttpServer &server);

void runAudioAnalysis(struct mg_connection *c, struct mg_http_message *msg, UserSession *us);

#endif