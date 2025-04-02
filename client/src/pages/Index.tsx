import { useState } from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import VideoPlayer from '@/components/VideoPlayer';
import { ThemeProvider } from '@/utils/ThemeContext';

const Index = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <ThemeProvider>
      <div className="h-screen w-screen overflow-hidden flex flex-col">
        <Header toggleSidebar={toggleSidebar} isSidebarOpen={sidebarOpen} />

        <div className="flex flex-1 overflow-hidden">
          <Sidebar isOpen={sidebarOpen} />

          <main
            className={`flex-1 p-6 transition-all ${sidebarOpen ? 'md:ml-0' : 'md:ml-0'} overflow-y-auto`}
          >
            <VideoPlayer videoSrc="" />
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
};

export default Index;
