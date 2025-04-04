#include "upload_media.h"

#include <json.hpp>
using json = nlohmann::json;

#include <bits/stdc++.h>

UploadHandler handler;

/**
 * Returns a unique id for uploading media.
 * Uses rand and current time as a seed.
 */
int get_upload_id() {
  srand(time(0));
  int id;

  do {
    id = rand();
  } while (!handler.isUniqueId(id));

  return id;
}

void register_media_handlers(HttpServer &server) {
  server.registerHandler("/api/v1/uploads/initiate", init_upload);
  server.registerHandler("/api/v1/uploads/chunks", upload_chunk);
  server.registerHandler("/api/v1/uploads/status", upload_status);
}

void init_upload(struct mg_connection *c, struct mg_http_message *msg) {
  std::string body = msg->body.buf;
  json json_body = json::parse(body);
  std::string file_name = json_body["fileName"];
  int file_size = json_body["fileSize"];

  int upload_id = get_upload_id();
  int num_chunks = 0;
  int total_chunks = file_size / 5242880;

  UploadSession new_session = {
      file_name,
      file_size,
      upload_id,
      num_chunks,
      total_chunks,

  };
  handler.new_session(new_session);

  json response = {{"uploadId", upload_id},
                   {"status", "initiated"},
                   {"message", "Upload session initiated successfully."}};
  std::string response_str = response.dump();

  mg_http_reply(c, 200, "Content-Type: application/json\r\n", response_str.c_str());
}

void upload_chunk(struct mg_connection *, struct mg_http_message *) {}

void upload_status(struct mg_connection *, struct mg_http_message *) {}

UploadHandler::UploadHandler() {};
UploadHandler::~UploadHandler() {
  m_uploads_guard_.lock();
  m_uploads_.clear();
  m_uploads_guard_.unlock();
}

void UploadHandler::new_session(UploadSession session) {
  m_uploads_guard_.lock();
  m_uploads_.push_back(session);
  m_uploads_guard_.unlock();
}

bool UploadHandler::isUniqueId(int id) {
  m_uploads_guard_.lock();
  
  for (const auto &session : m_uploads_) {
    if (session.session_id == id) {
      m_uploads_guard_.unlock();
      return false;
    }
  }

  m_uploads_guard_.unlock();
  return true;
}