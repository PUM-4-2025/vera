import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusIcon } from 'lucide-react'; // Assuming you use lucide-react for icons
import { cn } from '@/lib/utils'; // Import cn utility

interface BookmarkSidebarProps {
  isOpen: boolean;
}

const BookmarkSidebar: React.FC<BookmarkSidebarProps> = ({ isOpen }) => {
  return (
    <aside
      className={cn(
        'h-[calc(100vh-3.5rem)] bg-background border-l text-foreground transition-all flex flex-col dark:bg-sidebar dark:border-border relative',
        isOpen
          ? 'w-[280px] opacity-100 translate-x-0'
          : 'w-0 opacity-0 translate-x-full'
      )}
    >
      <div className="p-4 border-b dark:border-border flex justify-between items-center">
        <h2 className="text-lg font-semibold">Bookmarks</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            /* TODO: Implement add bookmark functionality */
          }}
        >
          <PlusIcon className="h-5 w-5" />
        </Button>
      </div>
      <div className="flex-1 p-4 overflow-y-auto">
        {/* Placeholder for bookmark list */}
        <p className="text-sm text-muted-foreground">
          No bookmarks yet. Click the + button to add a new bookmark.
        </p>
      </div>
    </aside>
  );
};

export default BookmarkSidebar;
