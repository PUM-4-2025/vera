#include "http_server.h"

#include <iostream>
#include <mongoose.h>
#include <utility>

HttpServer::HttpServer() {
  mg_mgr_init(&m_mgr_);
}

HttpServer::~HttpServer() {
  stop();
  mg_mgr_free(&m_mgr_);
}

void HttpServer::listenTo(const std::string &address) {
  m_address_ = address;
}

void HttpServer::setStaticFilesPath(const std::string &path) {
  m_static_dir_ = path;
}

void HttpServer::start() {
  mg_http_listen(&m_mgr_, m_address_.c_str(), eventHandler, this);

  std::cout << "Webserver running on: " << m_address_ << "\n";
  std::cout << "Serving static files from: " << m_static_dir_ << "\n";

  m_running_ = true;
  while (m_running_) {
    mg_mgr_poll(&m_mgr_, 1000);
  }
}

void HttpServer::stop() {
  m_running_ = false;
  std::cout << "Shutting down the servr..." << "\n";
}

void HttpServer::registerHandler(const std::string &api_path, RequestHandler handler) {
  m_handlers_.push_back({api_path, std::move(handler)});
}

UserSession *HttpServer::getUserSession(const std::string &session_token) {
  m_session_guard_.lock();
  // TODO: Replace with proper getting of UserSessions
  // Do something in here with the m_active_sessions_ vector
  UserSession *us = &m_active_sessions_.front();
  m_session_guard_.unlock();

  return us;
}

void HttpServer::appendUserSession(const UserSession &us) {
  m_session_guard_.lock();
  m_active_sessions_.push_back(us);
  m_session_guard_.unlock();
}

void HttpServer::removeUserSession(const UserSession &us) {
  m_session_guard_.lock();
  for (auto it = m_active_sessions_.begin(); it != m_active_sessions_.end(); it++) {
    if (it->session_id == us.session_id) {
      m_active_sessions_.erase(it);
      break;
    }
  }
  m_session_guard_.unlock();
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
        } catch (...) {
          std::cout << "Handler crash occured!" << "\n";
        }
        return;
      }
    }

    struct mg_http_serve_opts opts = {};            // Zero-initialize all fields
    opts.root_dir = server->m_static_dir_.c_str();  // For all other URLs,
    mg_http_serve_dir(c, hm, &opts);                // Serve static files
  }
}
