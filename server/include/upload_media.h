#ifndef UPLOADMEDIA_H
#define UPLOADMEDIA_H

#include "http_server.h"

void registerMediaHandlers(HttpServer &server);
void initUpload(struct mg_connection *c, struct mg_http_message *msg, UserSession *us);
void uploadStatus(struct mg_connection *c, struct mg_http_message *msg, UserSession *us);
void uploadChunk(struct mg_connection *c, struct mg_http_message *msg, UserSession *us);
void uploadComplete(struct mg_connection *c, struct mg_http_message *msg, UserSession *us);

using UploadSession = struct UploadSession {
  std::string filename;
  int file_size;
  std::string dir;
  int session_id;
  int completed_chunks;
  int total_chunks;
  UserSession *us;
};

#endif