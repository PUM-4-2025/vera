#pragma once

#ifndef PROJECT_CONFIG_H
#define PROJECT_CONFIG_H

#define STRINGIFY(x) #x
#define TOSTRING(x) STRINGIFY(x)

#define STATIC_FILES_PATH ""
#define BACKEND_PORT "8000" // not used atm, might be faster than env in the future

#endif // PROJECT_CONFIG_H
