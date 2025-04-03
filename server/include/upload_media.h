#ifndef UPLOADMEDIA_H
#define UPLOADMEDIA_H

#include "http_server.h"

#include <mutex>
#include <vector>

void register_media_handlers(HttpServer &server);
void init_upload(struct mg_connection *c, struct mg_http_message *msg);
void upload_status(struct mg_connection *c, struct mg_http_message *msg);
void upload_chunk(struct mg_connection *c, struct mg_http_message *msg);

typedef struct UploadSession {
  std::string filename;
  int file_size;
  int session_id;
  int completed_chunks;
  int total_chunks;
} UploadSession;

class UploadHandler {
public:
  UploadHandler();
  ~UploadHandler();

  void new_session(UploadSession session);
  void remove_session(int upload_id);

private:
  std::vector<UploadSession> m_uploads_;
  std::mutex m_uploads_guard_;
};

#endif