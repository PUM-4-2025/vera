import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { CreateProjectCard } from '../../../src/components/CreateProjectCard'; // Adjust the import path as needed


describe('CreateProjectCard', () => {
  const mockProps = {
    formData: {
      projectName: 'Test Project',
      projectDescription: 'Test Description',
    },
    selectedLocation: {
      dirHandle: {} as FileSystemDirectoryHandle,
      displayPath: '/test/path',
    },
    onFormChange: vi.fn(),
    onSelectLocation: vi.fn(),
    onCreateProject: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly with provided props', () => {
    render(<CreateProjectCard {...mockProps} />);

    // Check title and description
    expect(screen.getByText('Create New Project')).toBeDefined();
    expect(
      screen.getByText('Provide details for your new VERA project')
    ).toBeDefined();

    // Check inputs have correct values
    const nameInput = screen.getByLabelText('Project Name');
    expect(nameInput.getAttribute('value')).toBe('Test Project');

    const descriptionTextarea = screen.getByLabelText('Description') as HTMLTextAreaElement;
    expect(descriptionTextarea.value).toBe('Test Description');

    // Check location display
    const locationInput = screen.getByLabelText('Project Location');
    expect(locationInput.getAttribute('value')).toBe('/test/path/test_project');
  });

  it('calls onFormChange when input values change', () => {
    render(<CreateProjectCard {...mockProps} />);

    const nameInput = screen.getByLabelText('Project Name');
    fireEvent.change(nameInput, { target: { value: 'Changed Project Name' } });
    expect(mockProps.onFormChange).toHaveBeenCalled();

    const descriptionTextarea = screen.getByLabelText('Description');
    fireEvent.change(descriptionTextarea, {
      target: { value: 'Changed Description' },
    });
    expect(mockProps.onFormChange).toHaveBeenCalledTimes(2);
  });

  it('calls onSelectLocation when Browse button is clicked', () => {
    render(<CreateProjectCard {...mockProps} />);

    const browseButton = screen.getByText('Browse');
    fireEvent.click(browseButton);
    expect(mockProps.onSelectLocation).toHaveBeenCalled();
  });

  it('calls onCreateProject when Create Project button is clicked', () => {
    render(<CreateProjectCard {...mockProps} />);

    const createButton = screen.getByText('Create Project');
    fireEvent.click(createButton);
    expect(mockProps.onCreateProject).toHaveBeenCalled();
  });

  it('calls onCancel when Back button is clicked', () => {
    render(<CreateProjectCard {...mockProps} />);

    const backButton = screen.getByText('Back');
    fireEvent.click(backButton);
    expect(mockProps.onCancel).toHaveBeenCalled();
  });

  // it('disables Create Project button when conditions are not met', () => {
  //   const incompleteProps = {
  //     ...mockProps,
  //     formData: {
  //       ...mockProps.formData,
  //       projectName: '', // Empty project name
  //     },
  //   };

  //   render(<CreateProjectCard {...incompleteProps} />);

  //   const createButton = screen.getByText('Create Project');
  //   expect(createButton.disabled).toBe(true);
  // });

  it('shows correct path format based on project name', () => {
    const propsWithSpecialChars = {
      ...mockProps,
      formData: {
        ...mockProps.formData,
        projectName: 'Test Project 123!@#',
      },
    };

    render(<CreateProjectCard {...propsWithSpecialChars} />);

    const locationInput = screen.getByLabelText('Project Location');
    expect(locationInput.getAttribute('value')).toBe('/test/path/test_project_123___');
  });

  it('shows helper text when no location is selected', () => {
    const propsNoLocation = {
      ...mockProps,
      selectedLocation: {
        dirHandle: null,
        displayPath: '',
      },
    };

    render(<CreateProjectCard {...propsNoLocation} />);

    expect(
      screen.getByText('The project will be created in a new folder inside the selected location.')
    ).toBeDefined();
  });
});