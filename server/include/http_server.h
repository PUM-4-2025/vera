/*
 * Abstraction class for building a webserver and handling web requests.
 */

#ifndef HTTPSERVER_H
#define HTTPSERVER_H

#include <atomic>
#include <functional>
#include <mongoose.h>
#include <string>
#include <vector>

using UserSession = struct Session {
  std::string session_id;
};

class HttpServer {
public:
  /**
   * Pass adress as a string to listen to, e.g. "localhost:8080"
   */
  HttpServer();
  ~HttpServer();

  void listenTo(std::string address);
  void setStaticFilesPath(std::string path);
  void start();
  void stop();

  using RequestHandler = std::function<void(struct mg_connection *, struct mg_http_message *, UserSession *)>;
  void registerHandler(const std::string &api_path, RequestHandler handler);

private:
  struct mg_mgr m_mgr_{};
  std::string m_address_;
  std::string m_static_dir_ = "./static";
  std::atomic<bool> m_running_{false};

  struct HandlerInfo {
    std::string path;
    RequestHandler handler;
  };

  std::vector<HandlerInfo> m_handlers_;
  std::vector<UserSession> m_active_sessions_; // push usersession to this object

  static void eventHandler(struct mg_connection *c, int ev, void *ev_data);
};

#endif