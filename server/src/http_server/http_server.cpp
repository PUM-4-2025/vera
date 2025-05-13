#include "http_server.h"
#include "http_utils.h"

#include <cstdlib>
#include <iostream>
#include <mongoose.h>
#include <utility>

#include <json.hpp>
using json = nlohmann::json;

HttpServer::HttpServer() {
  mg_mgr_init(&m_mgr_);
}

HttpServer::~HttpServer() {
  stop();
  mg_mgr_free(&m_mgr_);
}

void HttpServer::listenTo(std::string address) {
  m_address_ = std::move(address);
}

void HttpServer::setStaticFilesPath(std::string path) {
  m_static_dir_ = std::move(path);
}

void HttpServer::start() {
  mg_http_listen(&m_mgr_, m_address_.c_str(), eventHandler, this);

  std::cout << "Webserver running on: " << m_address_ << std::endl;
  std::cout << "Serving static files from: " << m_static_dir_ << std::endl;

  m_running_ = true;
  while (m_running_) {
    mg_mgr_poll(&m_mgr_, 1000);
  }
}

void HttpServer::stop() {
  m_running_ = false;
  std::cout << "Shutting down the server..." << std::endl;
}

void HttpServer::registerHandler(const std::string &api_path, RequestHandler handler) {
  m_handlers_.push_back({api_path, handler});
}

UserSession *HttpServer::getUserSession(std::string sessionToken) {
  m_session_guard_.lock();
  for(auto *session : m_active_sessions_){
    if(session->session_id == sessionToken){
      m_session_guard_.unlock();
      return session;
    }
  }
  m_session_guard_.unlock();
  return nullptr;
}

void HttpServer::appendUserSession(UserSession us) {
  UserSession *usp = (UserSession *)malloc(sizeof us);
  usp->session_id = us.session_id;

  m_session_guard_.lock();
  m_active_sessions_.push_back(usp);
  m_session_guard_.unlock();
}

void HttpServer::removeUserSession(UserSession us) {
  m_session_guard_.lock();
  for (auto it = m_active_sessions_.begin(); it != m_active_sessions_.end(); it++) {
    if ((*it)->session_id == us.session_id) {
      free(*it);
      m_active_sessions_.erase(it);
      break;
    }
  }
  m_session_guard_.unlock();
}

bool HttpServer::isUniqueId(std::string id){
    m_session_guard_.lock();

    for(const auto &session : m_active_sessions_){
        if(session->session_id == id){
            m_session_guard_.unlock();
            return false;
        }
    }
    m_session_guard_.unlock();
    return true;
}


/**
 */
void HttpServer::eventHandler(struct mg_connection *c, int ev, void *ev_data) {
  auto *server = static_cast<HttpServer *>(c->fn_data);

  if (ev == MG_EV_HTTP_MSG) {
    auto *hm = (struct mg_http_message *)ev_data;  // Parsed HTTP request

    // Handle normal requests
    for (const auto &handler_info : server->m_handlers_) {
      std::string uri(hm->uri.buf, hm->uri.len);
      if (uri == handler_info.path || uri.find(handler_info.path + "/") == 0) {

        // Probably a poor way to handle errors, but
        // this will currently ensure that the server
        // does not crash in case an error occurs in the
        // request handler.
        try {
          handler_info.handler(c, hm, server);
        } catch (const std::exception &exc) {
          std::cout << "Handler crash occured!" << "\n ------------------------------- \n";
          std::cout << "ERR: " << exc.what() << "\n ------------------------------- \n";

          json response = {{"status", "ERR"}, {"message", "API handler crashed while handling request!"}};
          std::string response_str = response.dump();
          mg_http_reply(c, 500, "Access-Control-Allow-Origin: *\r\n"
                "Content-Type: application/json\r\n"
                "X-Content-Type-Options: nosniff\r\n", 
                response_str.c_str());
        }
        return;
      }
    }

    struct mg_http_serve_opts opts = {};            // Zero-initialize all fields
    opts.root_dir = server->m_static_dir_.c_str();  // For all other URLs,
    mg_http_serve_dir(c, hm, &opts);                // Serve static files
  }
}

void registerUserSessionHandlers(HttpServer &server){
    server.registerHandler("/api/v1/user-sessions/initiate", initUserSession);
}

void initUserSession(struct mg_connection *c, struct mg_http_message *msg, HttpServer *hs){
    if(handlePreflight(c, msg) == 0){
        return;
    }
    
    try{
        std::string body = msg->body.buf;

        json json_body = json::parse(body);
        std::string userId = json_body["userId"];

        UserSession new_session;
        new_session.session_id = userId;

        hs->appendUserSession(new_session);

        std::string message = "User Session " + userId + " initiated successfully.";
        json response = {{"status", "Initiated"}, {"message", message}};
        std::string response_str = response.dump();
        send_http_response(c, 200, response_str);
    }
    catch (...){
        json response = {{"status", "Failure"}, {"message", "Server encountered an exeption while initiating new UserSession"}};
        std::string response_str = response.dump();
        send_http_response(c, 500, response_str);
    }

}