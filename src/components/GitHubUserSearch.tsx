import React, { useState, useCallback, useRef } from 'react';

interface GitHubUser {
   login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  html_url: string;
  repos_url: string; 
  score: number; 
}

interface GitHubRepo {
  id: number;
  node_id: string;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  fork: boolean;
}

interface GitHubSearchResponse<T> {
  total_count: number;
    incomplete_results: boolean;
    items: T[];
}

const GitHubUserSearch = () => {
     const [searchTerm, setSearchTerm] = useState<string>('');
  const [users, setUsers] = useState<GitHubUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<GitHubUser | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [notFoundMessage, setNotFoundMessage] = useState<string | null>(null);

 
  const expandedUserRef = useRef<string | null>(null);

  const githubApiFetch = useCallback(async <T,>(url: string): Promise<T | null> => {
    setError(null); 
    setNotFoundMessage(null);
    try {
      const headers: HeadersInit = {
        'Accept': 'application/vnd.github.v3+json',
      };
    
      const response = await fetch(url, { headers });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (err: any) {
      console.error('API call failed:', err);
      setError(err.message || 'An unknown error occurred.');
      return null;
    }
  }, []);

  
  const handleSearch = useCallback(async () => {
    if (!searchTerm.trim()) {
      setUsers([]);
      setSelectedUser(null);
      setRepos([]);
      expandedUserRef.current = null;
      setNotFoundMessage(null);
      return;
    }

    setLoadingUsers(true);
    setNotFoundMessage(null);
    const data = await githubApiFetch<GitHubSearchResponse<GitHubUser>>(`https://api.github.com/search/users?q=${encodeURIComponent(searchTerm)}&per_page=5`);
    
   if (data && data.items) {
      if (data.items.length === 0) {
        setNotFoundMessage(`User "${searchTerm}" not found on GitHub.`);
        setUsers([]); // Pastikan daftar user kosong
      } else {
        setUsers(data.items);
      }
      setSelectedUser(null); 
      setRepos([]); 
      expandedUserRef.current = null;
    } else {
      setUsers([]); 
    }
    setLoadingUsers(false);
  }, [searchTerm, githubApiFetch]);

 
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  
  const handleUserClick = useCallback(async (user: GitHubUser) => {
    if (selectedUser?.id === user.id) {
        setSelectedUser(null);
        setRepos([]);
        expandedUserRef.current = null;
        return;
    }

    setSelectedUser(user);
    setRepos([]); 
    setLoadingRepos(true);
    expandedUserRef.current = user.login; 

    const data = await githubApiFetch<GitHubRepo[]>(`${user.repos_url}?per_page=100`); 
    
    if (data) {
      setRepos(data);
    } else {
        setRepos([]);
    }
    setLoadingRepos(false);
  }, [selectedUser, githubApiFetch]);
  return (

        <div className="bg-gray-900 text-white flex flex-col items-center py-10 px-4">
        <h1 className="text-4xl font-bold mb-8 text-blue-400">GitHub Repositories Explorer</h1>

      <div className="flex flex-col sm:flex-row gap-4 mb-8 w-full max-w-md">
        <input
          type="text"
          placeholder="Enter GitHub username..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-grow p-3 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white text-lg"
        />
        <button
          onClick={handleSearch}
          disabled={loadingUsers}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition-colors duration-200 disabled:bg-gray-700 disabled:cursor-not-allowed text-lg"
        >
          {loadingUsers ? 'Searching...' : 'Search'}
        </button>
      </div>

      {error && (
        <p className="text-red-500 mb-4 text-center text-lg">
          Error: {error}
          <br/>
         
          {error.includes('rate limit exceeded') && (
            <span>You have exceeded the API rate limit (60 requests/hour without authentication). Please wait or use a Personal Access Token.</span>
          )}
        </p>
      )}


       {notFoundMessage && !loadingUsers && (
        <p className="text-yellow-400 mb-4 text-center text-xl font-semibold">
          {notFoundMessage}
        </p>
      )}
      {users.length > 0 && (
        <div className="w-full max-w-md bg-gray-800 rounded-lg shadow-xl p-6">
          <h2 className="text-2xl font-semibold mb-4 text-blue-300">Search Results:</h2>
          <ul>
            {users.map((user) => (
              <li key={user.id} className="mb-4">
                <div
                  onClick={() => handleUserClick(user)}
                  className="flex items-center justify-between bg-gray-700 p-4 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors duration-200"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={user.avatar_url}
                      alt={user.login}
                      className="w-12 h-12 rounded-full border-2 border-blue-400"
                    />
                    <span className="text-xl font-medium text-white">{user.login}</span>
                  </div>
                  <span>
                    {selectedUser?.id === user.id ? (
                      <svg className="w-6 h-6 transform rotate-180 transition-transform duration-200" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
                    ) : (
                      <svg className="w-6 h-6 transition-transform duration-200" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
                    )}
                  </span>
                </div>

                {selectedUser?.id === user.id && (
                  <div className="mt-4 p-4 bg-gray-600 rounded-lg shadow-inner h-96 overflow-auto">
                    {loadingRepos ? (
                      <p className="text-center text-gray-300">Loading repositories...</p>
                    ) : repos.length > 0 ? (
                      <ul>
                        {repos.map((repo) => (
                          <li key={repo.id} className="bg-gray-700 p-3 rounded-lg mb-2 last:mb-0">
                            <a
                              href={repo.html_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-300 hover:underline flex justify-between items-center text-lg font-medium"
                            >
                              <span>{repo.name}</span>
                              <span className="flex items-center text-yellow-300 text-base">
                                {repo.stargazers_count}
                                <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.538 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.783.57-1.838-.197-1.538-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.381-1.81.588-1.81h3.462a1 1 0 00.95-.69l1.07-3.292z"></path></svg>
                              </span>
                            </a>
                            {repo.description && (
                              <p className="text-gray-300 text-sm mt-1">{repo.description}</p>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-center text-gray-300">No repositories found for this user.</p>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!searchTerm.trim() && !loadingUsers && !loadingRepos && !error && (
        <p className="text-gray-400 mt-5 text-xl">Start by searching for a GitHub user!</p>
      )}

    </div>

  )
}

export default GitHubUserSearch