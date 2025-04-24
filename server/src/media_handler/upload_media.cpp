#include "upload_media.h"
#include "upload_handler.h"
#include "files.h"
#include "http_utils.h"

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
    send_http_response(c, 200, upload_id, "initiated", "Upload session initiated successfully.");
  } catch (...) {
    send_http_response(c, 500, 0, "Failure",
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
    char id_buf[20] = "0";
    mg_http_get_var(&msg->query, "id", id_buf, sizeof id_buf);

    UploadSession *session = UPLOAD_HANDLER.getSession(std::stoi(id_buf));

    if (session == nullptr) {
      send_http_response(c, 404, session->session_id, "Not found", "uploadId not found!");
      return;
    }

    if (session->us->session_id != us->session_id) {
      send_http_response(c, 401, session->session_id, "Unauthorized", "Invalid session token!");
      return;
    }

    // Limit file sizes to 50 GiB for now
    int max_size = 50 * 1024 * 1024 * 1024;
    mg_http_upload(c, msg, &mg_fs_posix, session->dir.c_str(), max_size);
    UPLOAD_HANDLER.incrementChunk(*session);
  } catch (...) {
    send_http_response(c, 500, 0, "Failure",
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
      send_http_response(c, 404, upload_id, "Not found", "uploadId not found!");
      return;
    }

    if (session->us->session_id != us->session_id) {
      send_http_response(c, 401, upload_id, "Unauthorized", "Invalid session token!");
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
    send_http_response(c, 500, 0, "Failure",
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
      send_http_response(c, 404, upload_id, "Not found", "uploadId not found!");
      return;
    }

    if (session->us->session_id != us->session_id) {
      send_http_response(c, 401, upload_id, "Unauthorized", "Invalid session token!");
      return;
    }

    if (!UPLOAD_HANDLER.sessionCompleted(*session)) {
      send_http_response(c, 418, upload_id, "Failed",
                         "Uploaded chunks != expected number of chunks. Upload failed!");
      UPLOAD_HANDLER.removeSession(*session);
      return;
    }

    send_http_response(c, 200, upload_id, "Completed", "Upload completed successfully");
    UPLOAD_HANDLER.removeSession(*session);
  } catch (...) {
    send_http_response(c, 500, 0, "Failure",
                       "Server experienced an exception while handling complete request.");
  }
}
