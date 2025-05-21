#include "upload_handler.h"

#include "upload_media.h"

#include <iostream>
#include <optional>
#include <vector>

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

void UploadHandler::newSession(UploadSession session) {
  m_uploads_guard_.lock();
  m_uploads_.push_back(session);
  m_uploads_guard_.unlock();
}

void UploadHandler::removeSession(const UploadSession &session) {
  m_uploads_guard_.lock();
  for (auto it = m_uploads_.begin(); it != m_uploads_.end();) {
    if (it->session_id == session.session_id) {
      m_uploads_.erase(it);
      break;
    }
  }
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

std::optional<UploadSession> UploadHandler::getSession(int id) {
  m_uploads_guard_.lock();

  for (auto session : m_uploads_) {
    if (session.session_id == id) {
      m_uploads_guard_.unlock();
      return std::optional<UploadSession>{session};
    }
  }

  m_uploads_guard_.unlock();
  return std::nullopt;
}

void UploadHandler::incrementChunk(UploadSession &session) {
  m_uploads_guard_.lock();
  for (auto &s : m_uploads_) {
    if (s.session_id == session.session_id) {
      s.completed_chunks++;
    }
  }
  m_uploads_guard_.unlock();
}

bool UploadHandler::sessionCompleted(const UploadSession &session) {
  bool is_complete = false;
  m_uploads_guard_.lock();
  for (auto &s : m_uploads_) {
    if (s.session_id == session.session_id) {
      is_complete = s.completed_chunks == s.total_chunks;
    }
  }
  m_uploads_guard_.unlock();
  return is_complete;
}
