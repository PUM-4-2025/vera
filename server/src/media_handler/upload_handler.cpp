#include "upload_handler.h"

UploadHandler::UploadHandler() {};
UploadHandler::~UploadHandler() {
  m_uploads_guard_.lock();
  m_uploads_.clear();
  m_uploads_guard_.unlock();
}

void UploadHandler::newSession(const UploadSession &session) {
  m_uploads_guard_.lock();
  m_uploads_.push_back(session);
  m_uploads_guard_.unlock();
}

bool UploadHandler::isUniqueId(int id) {
  m_uploads_guard_.lock();
  
  for (const auto &session : m_uploads_) {
    if (session.session_id == id) {
      m_uploads_guard_.unlock();
      return false;
    }
  }

  m_uploads_guard_.unlock();
  return true;
}

UploadSession* UploadHandler::getSession(int id) {
  m_uploads_guard_.lock();
  
  for (auto &session : m_uploads_) {
    if (session.session_id == id) {
      m_uploads_guard_.unlock();
      return &session;
    }
  }

  m_uploads_guard_.unlock();
  return nullptr;
}