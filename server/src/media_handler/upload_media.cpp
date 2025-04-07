#include "upload_media.h"
#include "upload_handler.h"

#include "json.hpp"
using json = nlohmann::json;

#include <bits/stdc++.h>
#include <filesystem>

UploadHandler handler;

/**
 * Registers all the file upload handlers to the HttpServer. 
 */
void registerMediaHandlers(HttpServer &server) {
  server.registerHandler("/api/v1/uploads/initiate", initUpload);
  server.registerHandler("/api/v1/uploads/chunks", uploadChunk);
  server.registerHandler("/api/v1/uploads/status", uploadStatus);
}

/**
 * Returns a unique id for uploading media.
 * Uses rand and current time as a seed.
 */
int getUploadId() {
  srand(time(0));
  int id;

  do {
    id = rand();
  } while (!handler.isUniqueId(id));

  return id;
}

void handleChunkUpload(UploadSession &session) {

  handler.incrementChunk(session);
}


/**
 * Handles HTTP request for initiating new uploads. 
 */
void initUpload(struct mg_connection *c, struct mg_http_message *msg, UserSession *us) {
  std::string body = msg->body.buf;
  json json_body = json::parse(body);
  std::string file_name = json_body["fileName"];
  int file_size = json_body["fileSize"];

  int upload_id = getUploadId();
  int num_chunks = 0; 
  int total_chunks = file_size / 5242880;

  UploadSession new_session = {};
  new_session.filename = file_name;
  new_session.file_size = file_size;
  new_session.session_id = upload_id;
  new_session.completed_chunks = num_chunks;
  new_session.total_chunks = total_chunks;
  new_session.us = us;

  handler.newSession(new_session);

  // Create new directory for downloads
  std::string path = "/tmp/";
  path.append(us->session_id);
  path.append("/");
  
  if (!std::filesystem::exists(path)) {
    std::filesystem::create_directory(path);
  }

  json response = {{"uploadId", upload_id},
                   {"status", "initiated"},
                   {"message", "Upload session initiated successfully."}};
  std::string response_str = response.dump();

  mg_http_reply(c, 200, "Content-Type: application/json\r\n", response_str.c_str());
}

/**
 * Handles HTTP request for uploading a chunk of a file.
 */
void uploadChunk(struct mg_connection *c, struct mg_http_message *msg, UserSession *us) {
  std::string body = msg->body.buf;
  json json_body = json::parse(body);
  int upload_id = json_body["uploadId"];

  UploadSession *session = handler.getSession(upload_id);

  if (session == nullptr) {
    json response = {{"uploadId", upload_id},
                     {"status", "Not found!"}};
    std::string response_str = response.dump();
    mg_http_reply(c, 404, "Content-Type: application/json\r\n", response_str.c_str());
    return;
  }

  if (session->us->session_id != us->session_id) {
    json response = {{"uploadId", upload_id},
                     {"status", "Unauthorized"}};
    std::string response_str = response.dump();
    mg_http_reply(c, 401, "Content-Type: application/json\r\n", response_str.c_str());
    return;
  }

  handleChunkUpload(*session);

  json response = {{"status", "Success"},
                    {"message", "Chunks recieved successfully"}};
  std::string response_str = response.dump();
  mg_http_reply(c, 200, "Content-Type: application/json\r\n", response_str.c_str());
}

/**
 * Handles HTTP request for status of an upload.
 */
void uploadStatus(struct mg_connection *c, struct mg_http_message *msg, UserSession *us) {
  std::string body = msg->body.buf;
  json json_body = json::parse(body);
  int upload_id = json_body["uploadId"];

  UploadSession *session = handler.getSession(upload_id);

  if (session == nullptr) {
    json response = {{"uploadId", upload_id},
                     {"status", "Not found!"}};
    std::string response_str = response.dump();
    mg_http_reply(c, 404, "Content-Type: application/json\r\n", response_str.c_str());
    return;
  }

  if (session->us->session_id != us->session_id) {
    json response = {{"uploadId", upload_id},
                     {"status", "Unauthorized"}};
    std::string response_str = response.dump();
    mg_http_reply(c, 401, "Content-Type: application/json\r\n", response_str.c_str());
    return;
  }

  int uploaded_chunks = session->completed_chunks;
  int total_chunks = session->total_chunks;

  json response = {{"uploadId", upload_id},
                    {"status", "In progress"},
                    {"uploadedChunks", uploaded_chunks},
                    {"totalChunks", total_chunks}};
  std::string response_str = response.dump();
  mg_http_reply(c, 200, "Content-Type: application/json\r\n", response_str.c_str());
}
