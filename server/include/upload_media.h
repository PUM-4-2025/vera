#ifndef UPLOADMEDIA_H
#define UPLOADMEDIA_H

#include "http_server.h"

void registerMediaHandlers(HttpServer &server);
void *initUpload(void *p);
void *uploadStatus(void *p);
void *uploadChunk(void *p);
void *uploadComplete(void *p);

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
