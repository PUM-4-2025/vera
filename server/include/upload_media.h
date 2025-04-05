#ifndef UPLOADMEDIA_H
#define UPLOADMEDIA_H

#include "http_server.h"
#include <atomic>


void registerMediaHandlers(HttpServer &server);
void initUpload(struct mg_connection *c, struct mg_http_message *msg);
void uploadStatus(struct mg_connection *c, struct mg_http_message *msg);
void uploadChunk(struct mg_connection *c, struct mg_http_message *msg);

using UploadSession = struct UploadSession {
  std::string filename;
  int file_size;
  int session_id;
  std::atomic<int> completed_chunks;
  int total_chunks;
};

#endif