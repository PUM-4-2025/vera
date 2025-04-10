#!/usr/bin/env python3

import argparse
import os
import platform
import shutil
import subprocess
import sys
import time
from pathlib import Path
import logging
import multiprocessing
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) # add path to coloredformatter
from logger_initialize import setup_logger


logger = setup_logger("backend_build")

class BackendBuilder:
    def __init__(self):
        self.script_dir = Path(__file__).parent.absolute()
        self.build_dir = self.script_dir / "build"
        
        # Default settings
        self.build_type = "Debug"
        self.clean_build = False
        self.verbose = False
        self.run_tests = True
        self.generate_compile_commands = True
        self.is_windows = platform.system() == "Windows"
        self.compiler = None
        self.jobs = max(1, multiprocessing.cpu_count() - 1) # num of cores
        self.custom_flags = []
        
    def parse_arguments(self):
        parser = argparse.ArgumentParser(description='Build the backend')
        parser.add_argument('--build-type', choices=['Debug', 'Release', 'RelWithDebInfo', 'MinSizeRel'],
                            default='Debug', help='CMake build type')
        parser.add_argument('--clean', action='store_true', help='Clean build')
        parser.add_argument('--no-tests', action='store_true', help='Disable building tests')
        parser.add_argument('--no-compile-commands', action='store_true', 
                            help='Disable generating compile_commands.json')
        parser.add_argument('--compiler', choices=['gcc', 'clang', 'msvc'], 
                            help='Specify compiler manually')
        parser.add_argument('-j', '--jobs', type=int, 
                            help=f'Number of parallel jobs (default: {self.jobs})')
        parser.add_argument('-v', '--verbose', action='store_true', help='Verbose output')
        parser.add_argument('--install', action='store_true', 
                            help='Install after building (to build/install)')
        parser.add_argument('--custom-flags', help='Additional cmake flags')
        
        args, unknown = parser.parse_known_args()
        
        self.build_type = args.build_type
        self.clean_build = args.clean
        self.run_tests = not args.no_tests
        self.generate_compile_commands = not args.no_compile_commands
        self.verbose = args.verbose
        self.install = args.install
        
        if args.compiler:
            self.compiler = args.compiler
            
        if args.jobs:
            self.jobs = args.jobs
            
        
        if args.custom_flags:
            self.custom_flags = args.custom_flags.split(',')
        
        if self.verbose:
            logger.setLevel(logging.DEBUG)
            
        logger.info(f"Building backend with the following config:")
        logger.info(f"  Build type: {self.build_type}")
        logger.info(f"  Clean build: {self.clean_build}")
        logger.info(f"  Build tests: {self.run_tests}")
        logger.info(f"  Jobs: {self.jobs}")
        logger.info(f"  Install: {self.install}")
        
    def check_dependencies(self):
        logger.info(f"Checking dependencies...")
        
        # cmake
        if not shutil.which("cmake"):
            logger.error(f"CMake not found!")
            return False
        
        # compiler
        compiler_found = False
        
        # if specified manually
        if self.compiler:
            if self.compiler == 'gcc' and shutil.which("g++"):
                compiler_found = True
            elif self.compiler == 'clang' and shutil.which("clang++"):
                compiler_found = True
            elif self.compiler == 'msvc' and (shutil.which("cl") or self.is_windows):
                compiler_found = True
        else:
            # if not manually specified
            if shutil.which("clang++"):
                self.compiler = "clang"
                compiler_found = True
            elif shutil.which("g++"):
                self.compiler = "gcc"
                compiler_found = True
            elif shutil.which("cl"):
                self.compiler = "cl"
                compiler_found = True

        if not compiler_found:
            logger.error(f"No C++ compiler found.")
            return False


        
        if not compiler_found:
            logger.error(f"No C++ compiler found.")
            return False
        
        # ctest?
        
        logger.info(f"All dependencies are installed.")
        return True
    
    def clean_build_directory(self):
        if self.clean_build and self.build_dir.exists():
            logger.info(f"Cleaning build directory...")
            try:
                shutil.rmtree(self.build_dir)
            except Exception as e:
                logger.error(f"Failed to remove build dir: {e}")
                return False
                
        self.build_dir.mkdir(exist_ok=True)
        return True
    
    def run_command(self, cmd, cwd=None, env=None, log_output=True):
        cmd_str = " ".join(str(c) for c in cmd)
        logger.debug(f"Running command: {cmd_str}")
        
        try:
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                cwd=cwd or str(self.script_dir),
                env=env or os.environ.copy()
            )
            
            stdout, stderr = process.communicate()
            if stdout:
                if log_output:
                    print(stdout, end="")
            if stderr:
                if log_output:
                    print(f"{stderr}", end="")
            
            if process.returncode != 0:
                logger.warning(f"Command {cmd_str} failed with return code {process.returncode}")
                if not log_output:
                    logger.error(f"Command output:")
                    logger.error(stderr)
                return False
                
            return True
            
        except FileNotFoundError:
            logger.error(f"Command not found: {cmd[0]}")
            return False
        except Exception as e:
            logger.error(f"Failed to run command: {e}")
            return False
    
    def configure_cmake(self):
        logger.info(f"Configuring backend using cmake")
        
        cmake_config_cmd = [
            "cmake", 
            "-B", str(self.build_dir), 
            "-S", str(self.script_dir),
            f"-DCMAKE_BUILD_TYPE={self.build_type}"
        ]
        
        if self.compiler:
            if self.compiler == 'gcc':
                cmake_config_cmd.extend(["-DCMAKE_C_COMPILER=gcc", "-DCMAKE_CXX_COMPILER=g++"])
            elif self.compiler == 'clang':
                cmake_config_cmd.extend(["-DCMAKE_C_COMPILER=clang", "-DCMAKE_CXX_COMPILER=clang++"])
            # For MSVC, CMake should auto-detect?

            if self.compiler != 'msvc' and self.is_windows:
                cmake_config_cmd.append("-DCMAKE_GENERATOR_TOOLSET=")
                cmake_config_cmd.append("-G Ninja")
        
        if self.generate_compile_commands:
            cmake_config_cmd.append("-DCMAKE_EXPORT_COMPILE_COMMANDS=ON")
        
        if self.run_tests:
            cmake_config_cmd.append("-DBUILD_TESTING=ON")
        
        for flag in self.custom_flags:
            cmake_config_cmd.append(flag)
        
        
        return self.run_command(cmake_config_cmd)
    
    def build_project(self):
        logger.info(f"Building project...")
        
        cmake_build_cmd = [
            "cmake", 
            "--build", 
            str(self.build_dir), 
            "--config", 
            self.build_type,
            "--parallel", 
            str(self.jobs)
        ]
        
        if self.verbose:
            cmake_build_cmd.append("--verbose")
        
        return self.run_command(cmake_build_cmd)
    
    def run_tests_fn(self):
        if not self.run_tests:
            logger.info(f"Skipping tests")
            return True
            
        logger.info(f"Running tests...")
        
        ctest_cmd = [
            "ctest", 
            "--test-dir", 
            str(self.build_dir), 
            "--build-config", 
            self.build_type
        ]
        
        if self.verbose:
            ctest_cmd.append("-V")
        
        return self.run_command(ctest_cmd)
    
    def install_project(self):
        if not self.install:
            return True
            
        logger.info(f"Installing project...")
        
        install_dir = self.build_dir / "install"
        install_dir.mkdir(exist_ok=True)
        
        cmake_install_cmd = [
            "cmake",
            "--install",
            str(self.build_dir),
            "--prefix",
            str(install_dir)
        ]
        
        return self.run_command(cmake_install_cmd)
    
    def build(self):
        start_time = time.time()
        
        self.parse_arguments()
        
        if not self.check_dependencies():
            return 1, None
        
        if not self.clean_build_directory():
            return 1, None
        
        if not self.configure_cmake():
            return 1, None
        
        if not self.build_project():
            return 1, None
        
        
        if self.install and not self.install_project():
            return 1, None
        
        
        if self.run_tests and not self.run_tests_fn():
            logger.warning(f"Tests failed.")

        elapsed_time = time.time() - start_time
        return 0, elapsed_time


if __name__ == "__main__":
    builder = BackendBuilder()
    status, elapsed_time = builder.build()
    if status != 0:
        logger.error("\n╔═════════════════╗\n║  Build failed!  ║\n╚═════════════════╝")
    else:
        logger.info(f"\n╔══════════════════════════════════════════════════════════╗\n║  Backend built and tested successfully in {elapsed_time:.2f} seconds!  ║\n╚══════════════════════════════════════════════════════════╝")
    sys.exit()