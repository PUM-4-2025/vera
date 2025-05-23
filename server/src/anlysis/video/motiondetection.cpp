#include "video.h"

#include <iostream>
#include <opencv2/opencv.hpp>
#include <vector>
#define STOP_IF_STILL_FOR 0.5

std::vector<int> analyse_video(std::string path, std::vector<int> cords) {
  cv::VideoCapture cap(path);
  int video_width = static_cast<int>(cap.get(cv::CAP_PROP_FRAME_WIDTH));
  int video_height = static_cast<int>(cap.get(cv::CAP_PROP_FRAME_HEIGHT));

  int x = cords[0];
  int w = cords[1];
  int y = cords[2];
  int h = cords[3];

  bool in_motion = false;
  int motion_start = 0;
  int motion_end = 0;
  int no_motion_count = 0;
  std::vector<int> motion_frames;

  double fps = cap.get(cv::CAP_PROP_FPS);
  int stop_still_for_frames = static_cast<int>(std::round(STOP_IF_STILL_FOR * fps));

  if (!cap.isOpened()) {
    std::cerr << "Error: Cannot open video file.-------------------------" << std::endl;
    return {};
  }

  if (w <= 0 || h <= 0) {
    throw std::invalid_argument("Invalid width and/or height");
  }

  if (x < 0 || y < 0 || x + w > video_width || y + h > video_height) {
    throw std::invalid_argument("ROI is outside of video bounds.");
  }

  if (!cap.isOpened()) {
    std::cerr << "Error: Cannot open video file.-------------------------" << std::endl;
    return motion_frames;
  }

  cv::Ptr<cv::BackgroundSubtractor> subtractor = cv::createBackgroundSubtractorMOG2();
  cv::Mat frame, fgMask, cropped_frame;
  int frame_counter = 0;

  while (true) {
    cap >> frame;
    if (frame.empty())
      break;

    cv::Rect roi(x, y, w, h);
    cv::Mat cropped_frame = frame(roi);

    subtractor->apply(cropped_frame, fgMask);

    cv::erode(fgMask, fgMask, cv::Mat());
    cv::dilate(fgMask, fgMask, cv::Mat());

    double motion_pixels = cv::countNonZero(fgMask);

    if (motion_pixels > 500) {  // Finjustera
      if (!in_motion) {
        // Starta rörelse
        motion_start = frame_counter;
        in_motion = true;
        no_motion_count = 0;
      }
      // Rörelse, så vi nollställer räknaren
      no_motion_count = 0;
    } else {
      no_motion_count++;
      // Stanna rörelse och lägg till start & slut
      if (in_motion && no_motion_count >= stop_still_for_frames) {
        motion_end = frame_counter - 1;
        motion_frames.push_back(motion_start);
        motion_frames.push_back(motion_end);
        in_motion = false;
        no_motion_count = 0;
      }
    }
    frame_counter += 1;
  }

  // Skriver ut alla rörelse-bilder (start & slut)
  for (int i : motion_frames) {
    std::cout << i / fps << std::endl;
  }

  cap.release();
  cv::destroyAllWindows();

  return motion_frames;
}
