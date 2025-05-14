#include "upload_media.h"

#include "files.h"
#include "http_utils.h"
#include "mongoose.h"
#include "upload_handler.h"

#include <iostream>
#include <json.hpp>
#include <string>
using json = nlohmann::json;

UploadHandler UPLOAD_HANDLER;

/**
 * Registers all the file upload handlers to the HttpServer.
 */
void registerMediaHandlers(HttpServer &server) {
  server.registerHandler("/api/v1/uploads/initiate", initUpload);
  server.registerHandler("/api/v1/uploads/chunks", uploadChunk);
  server.registerHandler("/api/v1/uploads/status", uploadStatus);
  server.registerHandler("/api/v1/uploads/complete", uploadComplete);
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
  } while (!UPLOAD_HANDLER.isUniqueId(id));

  return id;
}

/**
 * Handles HTTP request for initiating new uploads.
 */
void initUpload(struct mg_connection *c, struct mg_http_message *msg, HttpServer *hs) {
  if (handlePreflight(c, msg) == 0) {
    return;
  }

  try {
    std::string body = msg->body.buf;
    json json_body = json::parse(body);

    std::string user_token = json_body["token"];
    UserSession *us = hs->getUserSession(user_token);

    if (us == nullptr) {
      json response = {{"status", "Unauthorized"}, {"message", "Invalid session token!"}};
      std::string response_str = response.dump();
      send_http_response(c, 401, response_str);
      return;
    }

    std::string file_name = json_body["fileName"];
    int file_size = json_body["fileSize"];

    std::string c_filename = sanitizeName(file_name);

    // Exit early and don't perform upload if file exists
    if (fileExists(c_filename, *us) && getFilesize(c_filename, *us) == file_size) {
      json response = {{"status", "Uninitialized"},
                       {"message", "File already exists. No upload required!"}};
      std::string response_str = response.dump();
      send_http_response(c, 200, response_str);
      return;
    }

    int upload_id = getUploadId();
    int num_chunks = 0;

    // Chunks are expected to be 16 kiB
    int max_chunk_size = 16 * 1024;
    int total_chunks = (file_size / max_chunk_size) + 1;

    std::string path = getUserMediaDir(*us);

    UploadSession new_session = {};
    new_session.filename = c_filename;
    new_session.file_size = file_size;
    new_session.dir = path;
    new_session.session_id = upload_id;
    new_session.completed_chunks = num_chunks;
    new_session.total_chunks = total_chunks;
    new_session.us = us;

    UPLOAD_HANDLER.newSession(new_session);
    json response = {{"uploadId", upload_id},
                     {"status", "initiated"},
                     {"message", "Upload session initiated successfully."}};
    std::string response_str = response.dump();
    send_http_response(c, 200, response_str);
  } catch (...) {
    json response = {
        {"status", "Failure"},
        {"message", "Server experienced an exception while handling initialize request."}};
    std::string response_str = response.dump();
    send_http_response(c, 500, response_str);
  }
}

/**
 * Handles HTTP request for uploading a chunk of a file.
 */
void uploadChunk(struct mg_connection *c, struct mg_http_message *msg, HttpServer *hs) {
  try {
    char token_buf[20] = "0";
    mg_http_get_var(&msg->query, "token", token_buf, sizeof token_buf);

    UserSession *us = hs->getUserSession(token_buf);

    char id_buf[20] = "0";
    mg_http_get_var(&msg->query, "id", id_buf, sizeof id_buf);

    UploadSession *session = UPLOAD_HANDLER.getSession(std::stoi(id_buf));

    if (session == nullptr) {
      json response = {{"status", "Not found"}, {"message", "uploadId not found!"}};
      std::string response_str = response.dump();
      send_http_response(c, 404, response_str);
      return;
    }

    if (us == nullptr || session->us->session_id != us->session_id) {
      json response = {{"status", "Unauthorized"}, {"message", "Invalid session token!"}};
      std::string response_str = response.dump();
      send_http_response(c, 401, response_str);
      return;
    }

    // Limit file sizes to 50 GiB for now
    int max_size = 50 * 1024 * 1024 * 1024;
    std::string headers = getVeraHeaders();
    mg_http_upload(c, msg, &mg_fs_posix, session->dir.c_str(), max_size, headers.c_str());
    UPLOAD_HANDLER.incrementChunk(*session);
  } catch (...) {
    json response = {
        {"status", "Failure"},
        {"message", "Server experienced an exception while handling chunk upload request."}};
    std::string response_str = response.dump();
    send_http_response(c, 500, response_str);
  }
}

/**
 * Handles HTTP request for status of an upload.
 */
void uploadStatus(struct mg_connection *c, struct mg_http_message *msg, HttpServer *hs) {
  if (handlePreflight(c, msg) == 0) {
    return;
  }

  try {
    std::string body = msg->body.buf;
    json json_body = json::parse(body);

    std::string user_token = json_body["token"];
    UserSession *us = hs->getUserSession(user_token);

    int upload_id = json_body["uploadId"];

    UploadSession *session = UPLOAD_HANDLER.getSession(upload_id);

    if (session == nullptr) {
      json response = {{"status", "Not found"}, {"message", "uploadId not found!"}};
      std::string response_str = response.dump();
      send_http_response(c, 404, response_str);
      return;
    }

    if (us == nullptr || session->us->session_id != us->session_id) {
      json response = {{"status", "Unauthorized"}, {"message", "Invalid session token!"}};
      std::string response_str = response.dump();
      send_http_response(c, 401, response_str);
      return;
    }

    int uploaded_chunks = session->completed_chunks;
    int total_chunks = session->total_chunks;

    json response = {{"uploadId", upload_id},
                     {"status", "In progress"},
                     {"uploadedChunks", uploaded_chunks},
                     {"totalChunks", total_chunks}};
    std::string response_str = response.dump();
    send_http_response(c, 200, response_str);
  } catch (...) {
    json response = {{"status", "Failure"},
                     {"message", "Server experienced an exception while handling status request."}};
    std::string response_str = response.dump();
    send_http_response(c, 500, response_str);
  }
}

void uploadComplete(struct mg_connection *c, struct mg_http_message *msg, HttpServer *hs) {
  if (handlePreflight(c, msg) == 0) {
    return;
  }

  try {
    std::string body = msg->body.buf;
    json json_body = json::parse(body);

    std::string user_token = json_body["token"];
    UserSession *us = hs->getUserSession(user_token);

    int upload_id = json_body["uploadId"];
    std::string filename = json_body["fileName"];
    std::string c_filename = sanitizeName(filename);

    UploadSession *session = UPLOAD_HANDLER.getSession(upload_id);

    if (session == nullptr) {
      json response = {{"status", "Not found"}, {"message", "uploadId not found!"}};
      std::string response_str = response.dump();
      send_http_response(c, 404, response_str);
      return;
    }

    if (us == nullptr || session->us->session_id != us->session_id) {
      json response = {{"status", "Unauthorized"}, {"message", "Invalid session token!"}};
      std::string response_str = response.dump();
      send_http_response(c, 401, response_str);
      return;
    }

    if (!UPLOAD_HANDLER.sessionCompleted(*session)) {
      json response = {{"status", "Failed"},
                       {"message", "Upload chunks != expected number of chunks. Upload failed!"}};
      std::string response_str = response.dump();
      send_http_response(c, 418, response_str);
      UPLOAD_HANDLER.removeSession(*session);
      return;
    }

    if (session->file_size != getFilesize(filename, *us)) {
      json response = {{"status", "Failed"},
                       {"message", "Uploaded file size != expected file size. Upload failed!"}};
      std::string response_str = response.dump();
      send_http_response(c, 418, response_str);
      UPLOAD_HANDLER.removeSession(*session);
      return;
    }

    // Rename to OpenCV/FFmpeg compatible name
    renameFile(filename, c_filename, *us);

    json response = {{"uploadId", upload_id},
                     {"status", "Completed"},
                     {"message", "Upload completed successfully."}};
    std::string response_str = response.dump();
    send_http_response(c, 200, response_str);
    UPLOAD_HANDLER.removeSession(*session);
  } catch (...) {
    json response = {
        {"status", "Failure"},
        {"message", "Server experienced an exception while handling complete request."}};
    std::string response_str = response.dump();
    send_http_response(c, 500, response_str);
  }
}
