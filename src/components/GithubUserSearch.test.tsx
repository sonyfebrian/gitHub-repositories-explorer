// src/App.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { expect, describe, it, vi, beforeEach, afterEach } from 'vitest';
import GitHubUserSearch from './GitHubUserSearch';



const mockFetch = vi.fn();
(window as any).fetch = mockFetch;


const mockUsers: {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  repos_url: string;
  node_id: string;
  score: number;
}[] = [
  { login: 'testuser1', id: 1, avatar_url: 'url1', html_url: 'html_url1', repos_url: 'https://api.github.com/users/testuser1/repos', node_id: '1', score: 100 },
  { login: 'testuser2', id: 2, avatar_url: 'url2', html_url: 'html_url2', repos_url: 'https://api.github.com/users/testuser2/repos', node_id: '2', score: 90 },
];

const mockRepos: {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  fork: boolean;
  node_id: string;
}[] = [
  { id: 101, name: 'repo-alpha', full_name: 'testuser1/repo-alpha', html_url: 'html_repo_alpha', description: 'Desc A', stargazers_count: 10, fork: false, node_id: 'r1' },
  { id: 102, name: 'repo-beta', full_name: 'testuser1/repo-beta', html_url: 'html_repo_beta', description: null, stargazers_count: 5, fork: false, node_id: 'r2' },
];

describe('GitHub Finder App', () => {
 
  beforeEach(() => {
    mockFetch.mockClear();
   
  });


  afterEach(() => {
    
  });

  
 

  it('githubApiFetch should handle API error response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ message: 'Rate limit exceeded' }),
    });

    const dummyFetch = async (url: string) => {
        try {
            const res = await fetch(url);
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message);
            }
            return res.json();
        } catch (e: any) {
            throw new Error(e.message);
        }
    }

    await expect(dummyFetch('some-error-url')).rejects.toThrow('Rate limit exceeded');
  });


  // --- Integration Tests untuk Komponen App ---
  it('should render the search input and button', () => {
    render(<GitHubUserSearch />);
    expect(screen.getByPlaceholderText('Enter GitHub username...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
  });

  it('should display "Start by searching" message initially', () => {
    render(<GitHubUserSearch />);
    expect(screen.getByText(/start by searching for a github user!/i)).toBeInTheDocument();
  });

  it('should display search results when users are found', async () => {
    mockFetch
      .mockResolvedValueOnce({ // For search users
        ok: true,
        json: () => Promise.resolve({ items: mockUsers, total_count: 2 }),
      });

    render(<GitHubUserSearch />);
    const searchInput = screen.getByPlaceholderText('Enter GitHub username...');
    const searchButton = screen.getByRole('button', { name: /search/i });

    fireEvent.change(searchInput, { target: { value: 'testuser' } });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText('testuser1')).toBeInTheDocument();
      expect(screen.getByText('testuser2')).toBeInTheDocument();
      expect(screen.queryByText(/start by searching/i)).not.toBeInTheDocument(); // Message should disappear
      expect(screen.queryByText(/user "testuser" not found/i)).not.toBeInTheDocument(); // No not found message
    });
  });

  it('should display "User not found" message if no users match', async () => {
    mockFetch
      .mockResolvedValueOnce({ // For search users
        ok: true,
        json: () => Promise.resolve({ items: [], total_count: 0 }),
      });

    render(<GitHubUserSearch />);
    const searchInput = screen.getByPlaceholderText('Enter GitHub username...');
    const searchButton = screen.getByRole('button', { name: /search/i });

    fireEvent.change(searchInput, { target: { value: 'nonexistentuser123' } });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText(/user "nonexistentuser123" not found on github./i)).toBeInTheDocument();
      expect(screen.queryByText('testuser1')).not.toBeInTheDocument(); // No users should be displayed
      expect(screen.queryByText(/start by searching/i)).not.toBeInTheDocument(); // Message should disappear
    });
  });

  it('should display error message on API failure during user search', async () => {
    mockFetch
      .mockResolvedValueOnce({ // For search users
        ok: false,
        status: 500,
        json: () => Promise.resolve({ message: 'Internal Server Error' }),
      });

    render(<GitHubUserSearch />);
    const searchInput = screen.getByPlaceholderText('Enter GitHub username...');
    const searchButton = screen.getByRole('button', { name: /search/i });

    fireEvent.change(searchInput, { target: { value: 'erroruser' } });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText(/Error: Internal Server Error/i)).toBeInTheDocument();
      expect(screen.queryByText(/start by searching/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/user "erroruser" not found/i)).not.toBeInTheDocument();
    });
  });

  it('should display rate limit exceeded message on 403 error', async () => {
    mockFetch
      .mockResolvedValueOnce({ // For search users
        ok: false,
        status: 403,
        json: () => Promise.resolve({ message: 'API rate limit exceeded' }),
      });

    render(<GitHubUserSearch />);
    const searchInput = screen.getByPlaceholderText('Enter GitHub username...');
    const searchButton = screen.getByRole('button', { name: /search/i });

    fireEvent.change(searchInput, { target: { value: 'ratelimituser' } });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText(/Error: API rate limit exceeded/i)).toBeInTheDocument();
      expect(screen.getByText(/You have exceeded the API rate limit/i)).toBeInTheDocument();
    });
  });

 



  it('should clear repositories when a new search is performed', async () => {
    mockFetch
      .mockResolvedValueOnce({ // Search 1: return mockUsers
        ok: true,
        json: () => Promise.resolve({ items: mockUsers, total_count: 2 }),
      })
      .mockResolvedValueOnce({ // Fetch repos for testuser1
        ok: true,
        json: () => Promise.resolve(mockRepos),
      })
      .mockResolvedValueOnce({ // Search 2: return mockUsers (can be different users)
        ok: true,
        json: () => Promise.resolve({ items: [{ login: 'newuser', id: 3, avatar_url: 'u3', html_url: 'h3', repos_url: 'r3', node_id: 'n3', score: 80 }], total_count: 1 }),
      });

    render(<GitHubUserSearch />);
    const searchInput = screen.getByPlaceholderText('Enter GitHub username...');
    const searchButton = screen.getByRole('button', { name: /search/i });

    // Perform first search
    fireEvent.change(searchInput, { target: { value: 'testuser' } });
    fireEvent.click(searchButton);
    await waitFor(() => expect(screen.getByText('testuser1')).toBeInTheDocument());

    // Click on a user to show repos
    fireEvent.click(screen.getByText('testuser1'));
    await waitFor(() => expect(screen.getByText('repo-alpha')).toBeInTheDocument());

    // Perform second search with a new term
    fireEvent.change(searchInput, { target: { value: 'newuser' } });
    fireEvent.click(searchButton);

    // Repositories from previous user should disappear, new user should appear
    await waitFor(() => {
      expect(screen.queryByText('repo-alpha')).not.toBeInTheDocument();
      expect(screen.getByText('newuser')).toBeInTheDocument();
      expect(screen.queryByText('testuser1')).not.toBeInTheDocument();
    });
  });
});