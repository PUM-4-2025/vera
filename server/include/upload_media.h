#ifndef UPLOADMEDIA_H
#define UPLOADMEDIA_H

#include "http_server.h"

#include <mutex>
#include <vector>

void registerMediaHandlers(HttpServer &server);
void initUpload(struct mg_connection *c, struct MgHttpMessage *msg);
void uploadStatus(struct mg_connection *c, struct MgHttpMessage *msg);
void uploadChunk(struct mg_connection *c, struct MgHttpMessage *msg);

using UploadSession = struct UploadSession {
  std::string filename;
  int file_size;
  int session_id;
  int completed_chunks;
  int total_chunks;
};

class UploadHandler {
public:
  UploadHandler();
  ~UploadHandler();

  void newSession(UploadSession session);
  void removeSession(int upload_id);
  bool isUniqueId(int id);

private:
  std::vector<UploadSession> m_uploads_;
  std::mutex m_uploads_guard_;
};

#endif