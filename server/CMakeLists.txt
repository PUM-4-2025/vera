cmake_minimum_required(VERSION 3.10)
project(server)

set(CMAKE_CXX_STANDARD 14)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)
set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)

option(BUILD_TESTING "Build the tests" ON)

add_compile_options(-Wall -Wextra)

include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}/include
)

set(CORE_SOURCES
    ${CMAKE_CURRENT_SOURCE_DIR}/src/main.cpp
    ${CMAKE_CURRENT_SOURCE_DIR}/src/http_server/http_server.cpp
    ${CMAKE_CURRENT_SOURCE_DIR}/extern/mongoose/mongoose.c
    # Add more source files here
)

set(UTIL_SOURCES
    # logger?
    # config?
)

set(ALL_SOURCES
    ${CORE_SOURCES}
    ${UTIL_SOURCES}
)

add_executable(server ${ALL_SOURCES})

# debug config (default)
set(CMAKE_CXX_FLAGS_DEBUG "${CMAKE_CXX_FLAGS_DEBUG} -Wpedantic -Wshadow -Wconversion -g")

# Release config
set(CMAKE_CXX_FLAGS_RELEASE "${CMAKE_CXX_FLAGS_RELEASE} -O3 -DNDEBUG")


if(BUILD_TESTING)
    set(LIB_SOURCES ${ALL_SOURCES})
    list(REMOVE_ITEM LIB_SOURCES ${CMAKE_CURRENT_SOURCE_DIR}/src/main.cpp)

    #add_library(server_lib STATIC ${LIB_SOURCES})
    enable_testing()
    find_package(GTest REQUIRED)
    add_subdirectory(tests)
endif()