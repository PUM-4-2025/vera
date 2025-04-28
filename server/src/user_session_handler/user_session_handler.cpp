

#include "user_session_handler.h"
#include "user_session.h"
#include <vector>

UserSessionHandler::UserSessionHandler(){};
UserSessionHandler::~UserSessionHandler(){
    m_users_guard_.lock();
    m_users_.clear();
    m_users_guard_.unlock();
}

void UserSessionHandler::newSession(UserSession session){
    m_users_guard_.lock();
    m_users_.push_back(session);
    m_users_guard_.unlock();
}

void UserSessionHandler::removeSession(const UserSession &session){
    m_users_guard_.lock();
    for (auto it = m_users_.begin(); it != m_users_.end();){
        if (it->userId == session.userId){
            m_users_.erase(it);
            break;
        }
    }
    m_users_guard_.unlock();
}

bool UserSessionHandler::isUniqueId(std::string id){
    m_users_guard_.lock();

    for(const auto &session : m_users_){
        if(session.userId == id){
            m_users_guard_.unlock();
            return true;
        }
    }
    m_users_guard_.unlock();
    return false;
}

UserSession* UserSessionHandler::getSession(std::string id){
    m_users_guard_.lock();
    for(auto &session : m_users_){
        if(session.userId == id){
            m_users_guard_.unlock();
            return &session;
        }
    }
    m_users_guard_.unlock();
    return nullptr;
}