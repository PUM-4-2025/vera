/*
 * Abstraction class for building a webserver and handling web requests.
 */

#ifndef HTTPSERVER_H
#define HTTPSERVER_H

#include <atomic>
#include <functional>
#include <mongoose.h>
#include <mutex>
#include <string>
#include <vector>

using UserSession = struct Session {
  const char *session_id;
};

struct ThreadData {
  struct mg_connection *c;
  struct mg_http_message *hm;
  struct HttpServer *hs;
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
  UserSession *getUserSession(std::string sessionToken);
  void appendUserSession(UserSession us);
  void removeUserSession(UserSession us);
  bool isUniqueId(std::string id);

  using RequestHandler = std::function<void(struct ThreadData *)>;
  void registerHandler(const std::string &api_path, void *(*f)(void *));

private:
  struct mg_mgr m_mgr_{};
  std::string m_address_;
  std::string m_static_dir_ = "";
  std::atomic<bool> m_running_{false};

  struct HandlerInfo {
    std::string path;
    void *(*handler)(void *);
  };

  std::vector<HandlerInfo> m_handlers_;
  std::mutex m_session_guard_;
  std::vector<UserSession *> m_active_sessions_;

  static void eventHandler(struct mg_connection *c, int ev, void *ev_data);
};

void registerUserSessionHandlers(HttpServer &server);
void *initUserSession(void *p);

#endif
