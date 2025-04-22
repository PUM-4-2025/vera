'''
Build script if you are using the submodule version of opencv. Don't use if you have installed opencv somewhere else.
'''


import os
import subprocess
import multiprocessing
import platform
import sys

def run_cmd(cmd, cwd=None):
    print(f"Running: {cmd}")
    process = subprocess.run(cmd, shell=True, cwd=cwd, check=True)
    return process.returncode == 0

def get_cpu_count():
    return multiprocessing.cpu_count()

def main():
    opencv_dir = os.path.join("extern", "opencv")
    os.chdir(opencv_dir)    
    build_dir = "build"
    os.makedirs(build_dir, exist_ok=True)    
    cmake_args = [
        "cmake", "..",
        "-DCMAKE_INSTALL_PREFIX=../install",
        "-DCMAKE_BUILD_TYPE=Release",
        "-DBUILD_SHARED_LIBS=ON",
        "-DBUILD_EXAMPLES=OFF",
        "-DBUILD_TESTS=OFF",
        "-DBUILD_PERF_TESTS=OFF",
        "-DBUILD_opencv_apps=OFF",
        "-DBUILD_opencv_python2=OFF",
        "-DBUILD_opencv_python3=OFF"
    ]
    
    run_cmd(" ".join(cmake_args), cwd=build_dir)
    cpu_count = get_cpu_count()
    
    if platform.system() == "Windows":
        run_cmd(f"cmake --build . --config Release", cwd=build_dir)
        run_cmd(f"cmake --install . --config Release", cwd=build_dir)
    else:
        run_cmd(f"cmake --build . -j{cpu_count}", cwd=build_dir)
        run_cmd(f"cmake --install .", cwd=build_dir)
    
    print("OpenCV build and install completed successfully")

if __name__ == "__main__":
    main()