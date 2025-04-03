#ifndef UPLOADMEDIA_H
#define UPLOADMEDIA_H

#include "http_server.h"

void register_media_handlers(HttpServer &server);

void init_upload(struct mg_connection *, struct mg_http_message *);

void upload_status(struct mg_connection *, struct mg_http_message *);

void upload_chunk(struct mg_connection *, struct mg_http_message *);

#endif