#include "upload_handler.h"
#include "upload_media.h"

/*
 * A lot of methods are written in here to stop race conditions
 * from happening. Even though some methods would be trivial to 
 * write in ohter functions, the locking mechanism is needed
 * to assure that uploads are synced. 
 */

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

void UploadHandler::incrementChunk(UploadSession &session) {
  m_uploads_guard_.lock();
  session.completed_chunks++;
  m_uploads_guard_.unlock();
}