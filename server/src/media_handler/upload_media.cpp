#include "upload_media.h"

#include "mongoose.h"
#include "upload_handler.h"

#include <json.hpp>
using json = nlohmann::json;

#include <cmath>
#include <filesystem>
#include <ios>
#include <fstream>
#include <iostream>

UploadHandler handler;

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
  } while (!handler.isUniqueId(id));

  return id;
}

/*/
char **base64Decode(const std::string &in) {
  const std::string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  int T[256];
  memset(T, -1, sizeof(T));
  for (int i = 0; i < 64; i++)
    T[static_cast<unsigned char>(chars[i])] = i;

  // Compute maximum output size: every 4 base64 chars = 3 bytes
  size_t max_output_size = (in.length() * 3) / 4;

  // Allocate output buffer (+1 for null-terminator)
  char *decoded = (char *)malloc(max_output_size + 1);
  if (!decoded)
    return nullptr;

  size_t out_index = 0;
  int val = 0, valb = -8;
  for (unsigned char c : in) {
    if (T[c] == -1)
      break;
    val = (val << 6) + T[c];
    valb += 6;
    if (valb >= 0) {
      decoded[out_index++] = (char)((val >> valb) & 0xFF);
      valb -= 8;
    }
  }

  decoded[out_index] = '\0';  // Null-terminate

  // Wrap in a char**
  char **result = (char **)malloc(sizeof(char *));
  if (!result) {
    free(decoded);
    return nullptr;
  }

  *result = decoded;
  return result;
}
*/

void send_http_response(struct mg_connection *c, int http_code, int id, std::string status,
                        std::string message) {
  json response = {{"uploadId", id}, {"status", status}, {"message", message}};
  std::string response_str = response.dump();
  mg_http_reply(c, http_code, "Access-Control-Allow-Origin: *\r\n"
    "Content-Type: application/json\r\n"
    "X-Content-Type-Options: nosniff\r\n", response_str.c_str());
}

/**
 * TODO: Reimplement this function. Currently doesn't work. 
 * Currently CORS is not used in client. Could be worth enabling CORS
 * to follow better developer practice. 
 */
int handlePreflight(struct mg_connection *c, struct mg_http_message *msg) {
  if (msg->body.len == 0 || msg->method.buf == "OPTIONS") {
    mg_http_reply(c, 204, "Access-Control-Allow-Origin: *\r\n"
      "Access-Control-Allow-Methods: GET, POST\r\n"
      "Access-Control-Allow-Headers: content-type\r\n"
      "Access-Control-Allow-Credentials: false\r\n", ""); 
    return 0;
  }
  return 1;
} 


/**
 * Handles HTTP request for initiating new uploads.
 */
void initUpload(struct mg_connection *c, struct mg_http_message *msg, UserSession *us) {
  if (handlePreflight(c, msg) == 0) {
    return;
  }

  try {
    std::string body = msg->body.buf;

    json json_body = json::parse(body);
    std::string file_name = json_body["fileName"];
    int file_size = json_body["fileSize"];

    int upload_id = getUploadId();
    int num_chunks = 0;

    // Chunks are expected to be 5kiB
    int max_chunk_size = 5 * 1024;
    int total_chunks = (file_size / max_chunk_size) + 1;

    // Create new directory for downloads
    std::string path = "/tmp/vera/";

    if (!std::filesystem::exists(path)) {
      std::filesystem::create_directory(path);
    }

    path.append(us->session_id);
    path.append("/");

    if (!std::filesystem::exists(path)) {
      std::filesystem::create_directory(path);
    }

    UploadSession new_session = {};
    new_session.filename = file_name;
    new_session.file_size = file_size;
    new_session.dir = path;
    new_session.session_id = upload_id;
    new_session.completed_chunks = num_chunks;
    new_session.total_chunks = total_chunks;
    new_session.us = us;

    handler.newSession(new_session);
    send_http_response(c, 200, upload_id, "initiated", "Upload session initiated successfully.");
  } catch (...) {
    send_http_response(c, 500, 0, "Failure", "Server experienced an exception while handling initialize request.");
  }
}

/**
 * Handles HTTP request for uploading a chunk of a file.
 */
void uploadChunk(struct mg_connection *c, struct mg_http_message *msg, UserSession *us) {
  if (handlePreflight(c, msg) == 0) {
    return;
  }

  try {
    char id_buf[20] = "0";
    mg_http_get_var(&msg->query, "id", id_buf, sizeof id_buf);

    UploadSession *session = handler.getSession(std::stoi(id_buf));

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
    handler.incrementChunk(*session);
  } catch (...) {
    send_http_response(c, 500, 0, "Failure", "Server experienced an exception while handling chunk upload request.");
  }
}

/**
 * Handles HTTP request for status of an upload.
 */
void uploadStatus(struct mg_connection *c, struct mg_http_message *msg, UserSession *us) {
  if (handlePreflight(c, msg) == 0) {
    return;
  }

  try {
    std::string body = msg->body.buf;
    json json_body = json::parse(body);
    int upload_id = json_body["uploadId"];

    UploadSession *session = handler.getSession(upload_id);

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
    mg_http_reply(c, 200, "Access-Control-Allow-Origin: *\r\n"
      "Content-Type: application/json\r\n"
      "X-Content-Type-Options: nosniff\r\n", response_str.c_str());
  } catch ( ... ) {
    send_http_response(c, 500, 0, "Failure", "Server experienced an exception while handling status request.");
  }
}

void uploadComplete(struct mg_connection *c, struct mg_http_message *msg, UserSession *us) {
  if (handlePreflight(c, msg) == 0) {
    return;
  }

  try {
    std::string body = msg->body.buf;
    json json_body = json::parse(body);
    int upload_id = json_body["uploadId"];

    UploadSession *session = handler.getSession(upload_id);

    if (session == nullptr) {
      send_http_response(c, 404, upload_id, "Not found", "uploadId not found!");
      return;
    }

    if (session->us->session_id != us->session_id) {
      send_http_response(c, 401, upload_id, "Unauthorized", "Invalid session token!");
      return;
    }

    if (!handler.sessionCompleted(*session)) {
      send_http_response(c, 418, upload_id, "Failed",
                        "Uploaded chunks != expected number of chunks. Upload failed!");
      handler.removeSession(*session);
      return;
    }

    send_http_response(c, 200, upload_id, "Completed", "Upload completed successfully");
    handler.removeSession(*session);
  } catch (...) {
    send_http_response(c, 500, 0, "Failure", "Server experienced an exception while handling complete request.");
  }
}