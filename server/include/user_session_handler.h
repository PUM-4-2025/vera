#include "user_session.h"
#ifndef USERSESSIONHANDLER_H
#define USERSESSIONHANDLER_H

#include <mutex>
#include <vector>

class UserSessionHandler {
public:
    UserSessionHandler();
    ~UserSessionHandler();
  void newSession(UserSession session);
  void removeSession(const UserSession &session);
  UserSession* getSession(std::string upload_id);
  bool isUniqueId(std::string id);

private:
  std::vector<UserSession> m_users_;
  std::mutex m_users_guard_;
};

#endif