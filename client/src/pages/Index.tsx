import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import VideoPlayer from '@/components/VideoPlayer';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { useProject } from '@/contexts/ProjectContext';

const Index = () => {
  const navigate = useNavigate();
  const { projectDirectoryHandle } = useProject();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Redirect to welcome page if no project is loaded
  useEffect(() => {
    if (!projectDirectoryHandle) {
      navigate('/');
    }
  }, [projectDirectoryHandle, navigate]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Don't render anything if no project is loaded
  if (!projectDirectoryHandle) {
    return null;
  }

  return (
    <ThemeProvider>
      <div className="h-screen w-screen overflow-hidden flex flex-col">
        <Header toggleSidebar={toggleSidebar} isSidebarOpen={sidebarOpen} />

        <div className="flex flex-1 overflow-hidden">
          <Sidebar isOpen={sidebarOpen} />

          <main
            className={`flex-1 p-6 transition-all ${sidebarOpen ? 'md:ml-0' : 'md:ml-0'} overflow-y-auto`}
          >
            <VideoPlayer />
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
};

export default Index;
