#!/usr/bin/env python3

import argparse
import os
import platform
import subprocess
import sys
import time
import signal
import logging
import webbrowser
import shutil
import urllib.request
import urllib.error
import socket
from pathlib import Path
import os.path

sys.path.append(os.path.dirname(os.path.abspath(__file__)) + '/server')

from build import BackendBuilder
from logger_initialize import setup_logger

logger = setup_logger("run_app")

class AppRunner:
    def __init__(self):
        self.script_dir = Path(__file__).parent.absolute()
        self.backend_dir = self.script_dir / "server"
        self.frontend_dir = self.script_dir / "client"
        
        # Default settings
        self.build_backend = True
        self.build_frontend = True
        self.build_type = "Debug"
        self.clean_build = False
        self.verbose = False
        self.open_browser = True
        self.backend_port = 8000
        self.frontend_port = 3000
        self.is_windows = platform.system() == "Windows"
        self.production_mode = False
        
        # processes
        self.backend_process = None
        self.frontend_process = None
        self.processes_started = False

        # builder for backend
        self.backend_builder = BackendBuilder()
        
    def parse_arguments(self):
        parser = argparse.ArgumentParser(description='Run the fullstack app')
        parser.add_argument('--no-backend', action='store_true')
        parser.add_argument('--no-frontend', action='store_true')
        parser.add_argument('--build-type', choices=['Debug', 'Release', 'RelWithDebInfo', 'MinSizeRel'],
                            default='Debug')
        parser.add_argument('--production', action='store_true',
                            help='Run in production mode (inc static)')
        parser.add_argument('--clean', action='store_true')
        parser.add_argument('--no-browser', action='store_true')
        parser.add_argument('--backend-port', type=int, default=self.backend_port)
        parser.add_argument('--frontend-port', type=int, default=self.frontend_port)
        parser.add_argument('-v', '--verbose', action='store_true')
        parser.add_argument('--backend-flags', help='Additional cmake flags')
        parser.add_argument('--frontend-flags', help='Additional npm flags')
        parser.add_argument('--compiler', choices=['gcc', 'clang', 'msvc'], 
                            help='Specify compiler manually')

        args = parser.parse_args()
        
        self.build_backend = not args.no_backend
        self.build_frontend = not args.no_frontend
        self.build_type = args.build_type
        self.clean_build = args.clean
        self.verbose = args.verbose
        self.open_browser = not args.no_browser
        self.backend_port = args.backend_port
        self.frontend_port = args.frontend_port
        self.production_mode = args.production or self.build_type in ['Release', 'RelWithDebInfo', 'MinSizeRel'] # beh;ver kanske 'ndra
        self.compiler = args.compiler

        self.backend_flags = []
        if args.backend_flags:
            self.backend_flags = args.backend_flags.split(',')
            
        self.frontend_flags = []
        if args.frontend_flags:
            self.frontend_flags = args.frontend_flags.split(',')
            
        if self.verbose:
            logger.setLevel(logging.DEBUG)
            
        logger.info(f"Running fullstack app with the following config:")
        logger.info(f"  Build backend: {self.build_backend}")
        logger.info(f"  Build frontend: {self.build_frontend}")
        logger.info(f"  Backend build type: {self.build_type}")
        logger.info(f"  Production mode: {self.production_mode}")
        logger.info(f"  Clean build: {self.clean_build}")
        logger.info(f"  Backend port: {self.backend_port}")
        logger.info(f"  Frontend port: {self.frontend_port}")
        logger.info(f"  Open browser: {self.open_browser}")
        
    def check_dependencies(self):
        logger.info(f"Checking dependencies...")
        
        if self.build_backend:
            if not self.backend_builder.check_dependencies():
                return False
            
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
            if self.is_windows:
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
            
        
                
        if self.build_frontend:
            # node
            if not shutil.which("node"):
                logger.error(f"Node.js not found!")
                return False
                
            # npm
            if not shutil.which("npm"):
                logger.error(f"npm not found!")
                return False
        
        logger.info(f"All dependencies are installed.")
        return True
        
    def run_command(self, cmd, cwd=None, env=None, log_output=True, capture_output=False):
        cmd_str = " ".join(str(c) for c in cmd)
        logger.debug(f"Running command: {cmd_str}")
        
        try:
            if capture_output:
                process = subprocess.Popen(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    cwd=cwd or str(self.script_dir),
                    env=env or os.environ.copy()
                )
                
                stdout, stderr = process.communicate()
                if stdout and log_output:
                    print(stdout, end="")
                if stderr and log_output:
                    print(f"{stderr}", end="")
                
                if process.returncode != 0:
                    logger.warning(f"Command {cmd_str} failed with return code {process.returncode}")
                    if not log_output:
                        logger.error(f"Command output:")
                        logger.error(stderr)
                    return False, None
                    
                return True, process
            else:
                # if output is not of interest
                process = subprocess.Popen(
                    cmd,
                    cwd=cwd or str(self.script_dir),
                    env=env or os.environ.copy()
                )
                return True, process
                
        except FileNotFoundError:
            logger.error(f"Command not found: {cmd[0]}")
            return False, None
        except Exception as e:
            logger.error(f"Failed to run command: {e}")
            return False, None
    
    def build_backend_fn(self):
        if not self.build_backend:
            logger.info(f"Skipping backend build")
            return True
            
        logger.info(f"Building backend...")

        
        
        self.backend_builder.build_type = self.build_type
        self.backend_builder.clean_build = self.clean_build
        self.backend_builder.verbose = self.verbose
        if self.backend_flags:
            self.backend_builder.custom_flags.extend(self.backend_flags)
        
        self.backend_builder.custom_flags.append(f"-DBACKEND_PORT={self.backend_port}") 
        # kanske tar bort, endast compile time, PORT anv'nds i runtime nu
        # denna 'r dock snabbare, kanske kan anv'ndas senare

        if self.production_mode:
            self.backend_builder.custom_flags.append(f"-DSTATIC_FILES_PATH=./static")
        
        status, elapsed_time = self.backend_builder.build()
        
        if status != 0:
            logger.error(f"Backend build failed")
            return False
            
        logger.info(f"Backend built successfully in {elapsed_time:.2f} seconds")
        return True
        
    def build_frontend_fn(self):
        if not self.build_frontend:
            logger.info(f"Skipping frontend build")
            return True
            
        logger.info(f"Building frontend...")
            
        frontend_env = os.environ.copy()
        frontend_env["VITE_BACKEND_URL"] = f"http://localhost:{self.backend_port}"
        
        logger.info(f"Installing frontend dependencies...")
        npm_executable = "npm.cmd" if self.is_windows else "npm"

        success, _ = self.run_command(
            [npm_executable, "install"], 
            cwd=str(self.frontend_dir),
            env=frontend_env,
            capture_output=True,
        )
        
        if not success:
            logger.error(f"Failed to install frontend dependencies")
            return False
            
        if self.clean_build:
            logger.info(f"Cleaning frontend build...")
            clean_cmd = [npm_executable, "run", "clean"]
            success, _ = self.run_command(
                clean_cmd, 
                cwd=str(self.frontend_dir),
                env=frontend_env,
                capture_output=True,
            )
            
        if self.build_type in ["Release", "RelWithDebInfo", "MinSizeRel"] or self.production_mode:
            logger.info(f"Building production")
            npm_executable = "npm.cmd" if self.is_windows else "npm"

            build_cmd = [npm_executable, "run", "build"]
            success, _ = self.run_command(
                build_cmd, 
                cwd=str(self.frontend_dir),
                env=frontend_env,
                capture_output=True,
            )
            
            if not success:
                logger.error(f"Failed to build frontend production assets")
                return False
                
            logger.info(f"Copying frontend assets for backend static serving...")
            frontend_build_dir = self.frontend_dir / "dist"
            backend_static_dir = self.backend_dir / "static"
            
            backend_static_dir.mkdir(exist_ok=True, parents=True)
            
            # AI:ad
            try:
                for item in backend_static_dir.glob('*'):
                    if item.is_dir():
                        shutil.rmtree(item)
                    else:
                        item.unlink()
                
                if frontend_build_dir.exists():
                    for item in frontend_build_dir.glob('*'):
                        if item.is_dir():
                            shutil.copytree(item, backend_static_dir / item.name)
                        else:
                            shutil.copy2(item, backend_static_dir / item.name)
                    logger.info(f"Frontend assets copied to {backend_static_dir}")
                else:
                    logger.error(f"Frontend build directory {frontend_build_dir} not found")
                    return False
            except Exception as e:
                logger.error(f"Failed to copy frontend assets: {e}")
                return False
            
            
        
        return True
    
    def start_backend_server(self):
        if not self.build_backend:
            logger.info(f"Not running backend")
            return True

        logger.info(f"Starting backend server on port {self.backend_port}...")
        
        if self.is_windows and self.compiler == "cl":
            backend_exe = self.backend_dir / "build" / "bin" / self.build_type / "server.exe"
        elif self.is_windows:
            backend_exe = self.backend_dir / "build" / "bin" / "server.exe"
        else:
            backend_exe = self.backend_dir / "build" / "bin" / "server"
            
        if not backend_exe.exists():
            logger.error(f"Backend executable not found at {backend_exe}")
            return False
            
        backend_env = os.environ.copy()
        backend_env["PORT"] = str(self.backend_port)
        
        success, process = self.run_command(
            [str(backend_exe)],
            cwd=str(self.backend_dir),
            env=backend_env,
            capture_output=False
        )
        
        if not success:
            logger.error(f"Failed to start backend server")
            return False
            
        self.backend_process = process
        logger.info(f"Backend server started on http://localhost:{self.backend_port}")
        return True
    
    def start_frontend_server(self):
        if not self.build_frontend:
            logger.info(f"Not running frontend")
            return True
        


        if self.production_mode:
            logger.info(f"Running in production mode - frontend will be served by backend")
            return True
            
        logger.info(f"Starting frontend development server on port {self.frontend_port}...")
        
        frontend_env = os.environ.copy()
        frontend_env["VITE_PORT"] = str(self.frontend_port)
        frontend_env["VITE_BACKEND_URL"] = f"http://localhost:{self.backend_port}"
        
        npm_executable = "npm.cmd" if self.is_windows else "npm"
        cmd = [npm_executable, "run", "dev"]
        if self.frontend_flags:
            cmd.extend(self.frontend_flags)
            
        success, process = self.run_command(
            cmd,
            cwd=str(self.frontend_dir),
            env=frontend_env,
            capture_output=False
        )
        
        if not success:
            logger.error(f"Failed to start frontend development server")
            return False
            
        self.frontend_process = process
        logger.info(f"Frontend development server started on http://localhost:{self.frontend_port}")
        return True
    
    def open_app_in_browser(self):
        if not self.open_browser or not self.build_frontend:
            return True
            
        logger.info(f"Opening application in web browser...")
        servers_ready = self.wait_for_servers_ready()
        if not servers_ready:
            logger.warning("Servers not ready, still attempting to open browser")

        
        try:
            if self.production_mode:
                webbrowser.open(f"http://localhost:{self.backend_port}")
            else:
                webbrowser.open(f"http://localhost:{self.frontend_port}")
            return True
        except Exception as e:
            logger.error(f"Failed to open browser: {e}")
            return False
        

    def wait_for_servers_ready(self):
        logger.info(f"Waiting for servers to be ready...")
         
        max_attempts = 20
        retry_interval = 0.5
        
        backend_url = f"http://localhost:{self.backend_port}"
        backend_ready = False
        
        for attempt in range(max_attempts):
            if not self.build_backend: 
                backend_ready = True
                break
            try:
                with urllib.request.urlopen(backend_url, timeout=1) as response:
                    if response.status in [200, 404]:
                        logger.info(f"Backend server ready at {backend_url}")
                        backend_ready = True
                        break
            except (urllib.error.URLError, socket.timeout) as e:
                if attempt == 0:
                    logger.debug(f"Waiting for backend server...")
                time.sleep(retry_interval)
        
        if not backend_ready:
            logger.warning(f"Backend server not responding after {max_attempts} attempts")
        
        if self.production_mode:
            return backend_ready
            
        frontend_url = f"http://localhost:{self.frontend_port}"
        frontend_ready = False
        
        for attempt in range(max_attempts):
            if not self.build_frontend: 
                frontend_ready = True
                break
            try:
                
                with urllib.request.urlopen(frontend_url, timeout=1) as response:
                    if response.status in [200, 404]:  # Either response means server is up
                        logger.info(f"Frontend server ready at {frontend_url}")
                        frontend_ready = True
                        break
            except (urllib.error.URLError, socket.timeout) as e:
                if attempt == 0:
                    logger.debug(f"Waiting for frontend server...")
                time.sleep(retry_interval)
                
        if not frontend_ready:
            logger.warning(f"Frontend server not responding after {max_attempts} attempts")
            
        return backend_ready and (frontend_ready or self.production_mode)
    
    def handle_shutdown(self, signum=None, frame=None):
        logger.info(f"Shutting down application...")
        
        if not self.processes_started:
            return
            
        if self.frontend_process:
            logger.info(f"Stopping frontend development server...")
            try:
                if self.is_windows:
                    self.frontend_process.terminate()
                else:
                    self.frontend_process.send_signal(signal.SIGTERM)
                self.frontend_process.wait(timeout=5)
            except Exception as e:
                logger.warning(f"Error stopping frontend process: {e}")
                try:
                    self.frontend_process.kill()
                except:
                    pass
                    
        if self.backend_process:
            logger.info(f"Stopping backend server...")
            try:
                if self.is_windows:
                    self.backend_process.terminate()
                else:
                    self.backend_process.send_signal(signal.SIGTERM)
                self.backend_process.wait(timeout=5)
            except Exception as e:
                logger.warning(f"Error stopping backend process: {e}")
                try:
                    self.backend_process.kill()
                except:
                    pass
        
        logger.info(f"Application shutdown complete")
        
    def wait_for_stop(self):
        logger.info(f"Application running. Press Ctrl+C to stop.")
        
        try:
            while True:
                if self.backend_process and self.backend_process.poll() is not None:
                    logger.error(f"Backend server stopped unexpectedly with code {self.backend_process.returncode}")
                    break
                    
                if not self.production_mode and self.frontend_process and self.frontend_process.poll() is not None:
                    logger.error(f"Frontend server stopped unexpectedly with code {self.frontend_process.returncode}")
                    break
                    
                time.sleep(1)
        except KeyboardInterrupt:
            logger.info(f"Keyboard interrupt received, stopping application...")
        finally:
            self.handle_shutdown()
    
    def run_app(self):
        start_time = time.time()
        
        signal.signal(signal.SIGINT, self.handle_shutdown)
        signal.signal(signal.SIGTERM, self.handle_shutdown)
        
        try:
            self.parse_arguments()
            
            if not self.check_dependencies():
                return 1
                
            if self.build_backend and not self.build_backend_fn():
                return 1
                
            if self.build_frontend and not self.build_frontend_fn():
                return 1
                
            if not self.start_backend_server():
                return 1
                
            if not self.start_frontend_server():
                self.handle_shutdown()
                return 1
                
            self.processes_started = True
                
            self.open_app_in_browser()
            
            elapsed_time = time.time() - start_time
            logger.info(f"Application started in {elapsed_time:.2f} seconds")
            
            self.wait_for_stop()
            
            return 0
            
        except Exception as e:
            logger.error(f"Error running application: {e}")
            self.handle_shutdown()
            return 1

if __name__ == "__main__":    
    runner = AppRunner()
    status = runner.run_app()
    sys.exit(status)