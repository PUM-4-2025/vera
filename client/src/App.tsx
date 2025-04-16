import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProjectProvider } from './contexts/ProjectContext';
import Index from './pages/Index';
import Welcome from './pages/Welcome';
import NotFound from './pages/NotFound';
import { FFmpegProvider } from './contexts/FFmpegContext';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <FFmpegProvider>
        <ProjectProvider>
          <Sonner />
          <BrowserRouter>
          <Routes>
            <Route path="/" element={<Welcome />} />
            <Route path="/editor" element={<Index />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </BrowserRouter>
        </ProjectProvider>
      </FFmpegProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
