#include "upload_media.h"

#include "upload_handler.h"

#include <json.hpp>
using json = nlohmann::json;

#include <bits/stdc++.h>
#include <cmath>
#include <filesystem>
#include <ios>
#include <ostream>

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

void handleChunkUpload(UploadSession &session, int index, const std::string &data) {
  // Open file in append mode
  std::string chunk_path = session.path;
  chunk_path.append("_chunk_");
  chunk_path.append(std::to_string(index));

  std::ofstream of(chunk_path, std::ios::binary);
  if (of.is_open()) {
    of.write(data.c_str(), data.size());
    of.close();
  }

  handler.incrementChunk(session);
}

int assembleFile(UploadSession &session) {
  std::ofstream of(session.path, std::ios::binary);
  if (!of.is_open()) {
    std::cout << session.path << " not opened!" << std::endl;
    return -1;
  }

  for (int i = 1; i <= session.total_chunks; i++) {
    std::string chunk_path = session.path;
    chunk_path.append("_chunk_");
    chunk_path.append(std::to_string(i));

    std::ifstream f(chunk_path, std::ios::binary);
    if (!f.is_open()) {
      std::cout << chunk_path << " not opened!" << std::endl;
      of.close();
      return -1;
    }

    of << f.rdbuf();
    f.close();
  }

  of.close();

  std::cout << "Written to: " << session.path << std::endl;
  return 0;
}

void send_http_response(struct mg_connection *c, int http_code, int id, std::string status,
                        std::string message) {
  json response = {{"uploadId", id}, {"status", status}, {"message", message}};
  std::string response_str = response.dump();
  mg_http_reply(c, http_code, "Content-Type: application/json\r\n", response_str.c_str());
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

  // Chunks are expected to be 5MiB
  int total_chunks = (file_size / 5242880) + 1;

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
  path.append(file_name);
  if (std::filesystem::exists(path)) {
    std::filesystem::remove(path);
  }

  UploadSession new_session = {};
  new_session.filename = file_name;
  new_session.file_size = file_size;
  new_session.path = path;
  new_session.session_id = upload_id;
  new_session.completed_chunks = num_chunks;
  new_session.total_chunks = total_chunks;
  new_session.us = us;

  handler.newSession(new_session);
  send_http_response(c, 200, upload_id, "initiated", "Upload session initiated successfully.");
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
    send_http_response(c, 404, upload_id, "Not found", "uploadId not found!");
    return;
  }

  if (session->us->session_id != us->session_id) {
    send_http_response(c, 401, upload_id, "Unauthorized", "Invalid session token!");
    return;
  }

  std::string data = json_body["chunkData"];
  int index = json_body["chunkIndex"];
  handleChunkUpload(*session, index, data);

  send_http_response(c, 200, upload_id, "Success", "Chunks received successfully.");
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
  mg_http_reply(c, 200, "Content-Type: application/json\r\n", response_str.c_str());
}

void uploadComplete(struct mg_connection *c, struct mg_http_message *msg, UserSession *us) {
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

  if (assembleFile(*session) != 0) {
    send_http_response(c, 418, upload_id, "Failed",
                       "Something went wrong while assembling all chunks!");
    handler.removeSession(*session);
    return;
  }

  send_http_response(c, 200, upload_id, "Completed", "Upload completed successfully");
  handler.removeSession(*session);
}