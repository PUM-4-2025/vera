#include "upload_media.h"
#include "upload_handler.h"
#include "files.h"

#include "mongoose.h"
#include <json.hpp>
using json = nlohmann::json;

#include <cmath>

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
  int id = rand();

  while (!UPLOAD_HANDLER.isUniqueId(id)) {
    id = rand();
  }

  return id;
}

void sendHttpResponse(struct mg_connection *c, int http_code, std::string status, int id, 
                        std::string message) {
  json response = {{"uploadId", id}, {"status", status}, {"message", message}};
  std::string response_str = response.dump();
  mg_http_reply(c, http_code,
                "Access-Control-Allow-Origin: *\r\n"
                "Content-Type: application/json\r\n"
                "X-Content-Type-Options: nosniff\r\n",
                response_str.c_str());
}

/**
 * TODO: Reimplement this function. Currently doesn't work.
 * Currently CORS is not used in client. Could be worth enabling CORS
 * to follow better developer practice.
 */
int handlePreflight(struct mg_connection *c, struct mg_http_message *msg) {
  if (msg->body.len == 0 || msg->method.buf == "OPTIONS") {
    mg_http_reply(c, 204,
                  "Access-Control-Allow-Origin: *\r\n"
                  "Access-Control-Allow-Methods: GET, POST\r\n"
                  "Access-Control-Allow-Headers: content-type\r\n"
                  "Access-Control-Allow-Credentials: false\r\n",
                  "");
    return 0;
  }
  return 1;
}

/**
 * Handles HTTP request for initiating new uploads.
 */
void initUpload(struct mg_connection *c, struct mg_http_message *msg, HttpServer *hs) {
  if (handlePreflight(c, msg) == 0) {
    return;
  }

  // TODO: REPLACE_TOKEN
  UserSession *us = hs->getUserSession("");

  try {
    std::string body = msg->body.buf;

    json json_body = json::parse(body);
    std::string file_name = json_body["fileName"];
    int file_size = json_body["fileSize"];

    int upload_id = getUploadId();
    int num_chunks = 0;

    // Chunks are expected to be 16 kiB
    int max_chunk_size = 16 * 1024;
    int total_chunks = (file_size / max_chunk_size) + 1;

    std::string path = getUserMediaDir(*us);

    UploadSession new_session = {};
    new_session.filename = file_name;
    new_session.file_size = file_size;
    new_session.dir = path;
    new_session.session_id = upload_id;
    new_session.completed_chunks = num_chunks;
    new_session.total_chunks = total_chunks;
    new_session.us = us;

    UPLOAD_HANDLER.newSession(new_session);
    sendHttpResponse(c, 200, "initiated", upload_id, "Upload session initiated successfully.");
  } catch (...) {
    sendHttpResponse(c, 500, "Failure", 0, 
                       "Server experienced an exception while handling initialize request.");
  }
}

/**
 * Handles HTTP request for uploading a chunk of a file.
 */
void uploadChunk(struct mg_connection *c, struct mg_http_message *msg, HttpServer *hs) {
  if (handlePreflight(c, msg) == 0) {
    return;
  }

  // TODO: REPLACE_TOKEN
  UserSession *us = hs->getUserSession("");

  try {
    std::string id_buf; 
    mg_http_get_var(&msg->query, "id", id_buf.data(), id_buf.size());

    UploadSession *session = UPLOAD_HANDLER.getSession(std::stoi(id_buf));

    if (session == nullptr) {
      sendHttpResponse(c, 404, "Not found", session->session_id, "uploadId not found!");
      return;
    }

    if (session->us->session_id != us->session_id) {
      sendHttpResponse(c, 401, "Unauthorized",session->session_id,  "Invalid session token!");
      return;
    }

    // Limit file sizes to 50 GiB for now
    int max_size = 50 * 1024 * 1024 * 1024;
    mg_http_upload(c, msg, &mg_fs_posix, session->dir.c_str(), max_size);
    UPLOAD_HANDLER.incrementChunk(*session);
  } catch (...) {
    sendHttpResponse(c, 500, "Failure", 0, 
                       "Server experienced an exception while handling chunk upload request.");
  }
}

/**
 * Handles HTTP request for status of an upload.
 */
void uploadStatus(struct mg_connection *c, struct mg_http_message *msg, HttpServer *hs) {
  if (handlePreflight(c, msg) == 0) {
    return;
  }

  // TODO: REPLACE_TOKEN
  UserSession *us = hs->getUserSession("");

  try {
    std::string body = msg->body.buf;
    json json_body = json::parse(body);
    int upload_id = json_body["uploadId"];

    UploadSession *session = UPLOAD_HANDLER.getSession(upload_id);

    if (session == nullptr) {
      sendHttpResponse(c, 404, "Not found",  upload_id,"uploadId not found!");
      return;
    }

    if (session->us->session_id != us->session_id) {
      sendHttpResponse(c, 401, "Unauthorized",upload_id,  "Invalid session token!");
      return;
    }

    int uploaded_chunks = session->completed_chunks;
    int total_chunks = session->total_chunks;

    // Edge case, more information is expected to be returned.
    // Therefore the send_http_response() helper function is not used here.
    json response = {{"uploadId", upload_id},
                     {"status", "In progress"},
                     {"uploadedChunks", uploaded_chunks},
                     {"totalChunks", total_chunks}};
    std::string response_str = response.dump();
    mg_http_reply(c, 200,
                  "Access-Control-Allow-Origin: *\r\n"
                  "Content-Type: application/json\r\n"
                  "X-Content-Type-Options: nosniff\r\n",
                  response_str.c_str());
  } catch (...) {
    sendHttpResponse(c, 500, "Failure", 0, 
                       "Server experienced an exception while handling status request.");
  }
}

void uploadComplete(struct mg_connection *c, struct mg_http_message *msg, HttpServer *hs) {
  if (handlePreflight(c, msg) == 0) {
    return;
  }

  // TODO: REPLACE_TOKEN
  UserSession *us = hs->getUserSession("");

  try {
    std::string body = msg->body.buf;
    json json_body = json::parse(body);
    int upload_id = json_body["uploadId"];

    UploadSession *session = UPLOAD_HANDLER.getSession(upload_id);

    if (session == nullptr) {
      sendHttpResponse(c, 404, "Not found", upload_id, "uploadId not found!");
      return;
    }

    if (session->us->session_id != us->session_id) {
      sendHttpResponse(c, 401, "Unauthorized", upload_id, "Invalid session token!");
      return;
    }

    if (!UPLOAD_HANDLER.sessionCompleted(*session)) {
      sendHttpResponse(c, 418, "Failed", upload_id, 
                         "Uploaded chunks != expected number of chunks. Upload failed!");
      UPLOAD_HANDLER.removeSession(*session);
      return;
    }

    sendHttpResponse(c, 200, "Completed", upload_id, "Upload completed successfully");
    UPLOAD_HANDLER.removeSession(*session);
  } catch (...) {
    sendHttpResponse(c, 500, "Failure", 0, 
                       "Server experienced an exception while handling complete request.");
  }
}
