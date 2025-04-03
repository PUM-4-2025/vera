// Interfaces
export interface RecentProject {
  name: string;
  path: string;
  description: string;
  lastOpened: string;
}

const RECENT_PROJECTS_KEY = 'vera_recent_projects';

// Get recent projects from localStorage
export const getRecentProjects = (): RecentProject[] => {
  try {
    const recentProjectsJson = localStorage.getItem(RECENT_PROJECTS_KEY);
    if (recentProjectsJson) {
      return JSON.parse(recentProjectsJson);
    }
  } catch (error) {
    console.error('Failed to parse recent projects from localStorage:', error);
  }
  return [];
};

// Add a project to recent projects
export const addRecentProject = (project: RecentProject): void => {
  try {
    let recentProjects = getRecentProjects();

    // Remove if project with same path already exists
    recentProjects = recentProjects.filter((p) => p.path !== project.path);

    // Add new project to the beginning
    recentProjects.unshift(project);

    // Keep only the most recent projects (limit to 10 for storage efficiency)
    if (recentProjects.length > 10) {
      recentProjects = recentProjects.slice(0, 10);
    }

    localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(recentProjects));
  } catch (error) {
    console.error('Failed to save recent project to localStorage:', error);
  }
};

// Get the three most recent projects
export const getThreeMostRecentProjects = (): RecentProject[] => {
  return getRecentProjects().slice(0, 3);
};
