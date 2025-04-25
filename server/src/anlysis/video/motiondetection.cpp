
#include "motiondetection.h"
#include <opencv2/opencv.hpp>         // Core OpenCV stuff
#include <opencv2/core/cuda.hpp>      // CUDA utilities (like device count check)
//#include <opencv2/cudabgsegm.hpp>      CUDA version of MOG2
//#include <opencv2/cudaimgproc.hpp>    // Optional: for CUDA image processing (e.g., resizing, filters)


void analyse_video(){
    if (cv::cuda::getCudaEnabledDeviceCount() > 0){
        
        std::cout << "cuda finns" << std::endl;

    }
    else{
        std::cout << "inte cuda" << std::endl;



    }



}
