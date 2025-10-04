import React, { useEffect, useState, useRef } from "react";

// External CSS (you should move this style to a separate .css file or use CSS-in-JS)
const style = `
/* ... all your CSS styles from above ... */
`; // see note below

const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_TOKEN = ''; // Add your GitHub token here for higher rate limits

// Utility functions
// const formatNumber = (num) => {
//   if (num >= 1000000) {
//     return (num / 1000000).toFixed(1) + 'M';
//   } else if (num >= 1000) {
//     return (num / 1000).toFixed(1) + 'K';
//   }
//   return num.toString();
// };
// formatNumber()

function calculateStreaks(dates) {
  if (dates.length === 0) {
    return { currentStreak: 0, longestStreak: 0, totalDays: 0 };
  }
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  let totalDays = dates.length;

  const hasRecentActivity = dates.includes(todayStr) || dates.includes(yesterdayStr);

  if (hasRecentActivity) {
    let checkDate = new Date(today);
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (dates.includes(dateStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  for (let i = 0; i < dates.length; i++) {
    if (i === 0) {
      tempStreak = 1;
    } else {
      const currentDate = new Date(dates[i]);
      const prevDate = new Date(dates[i - 1]);
      const diffTime = currentDate - prevDate;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  return { currentStreak, longestStreak, totalDays };
}

// Main Portfolio Component
const Portfolio = () => {
  // State
  const [username, setUsername] = useState("octocat");
  const [userData, setUserData] = useState(null);
  const [reposData, setReposData] = useState([]);
  const [eventsData, setEventsData] = useState([]);
  const [languageStats, setLanguageStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [milestone, setMilestone] = useState(null);
  const [error, setError] = useState("");
  const contributionChartRef = useRef();
  const languageChartRef = useRef();
  const [contributionChart, setContributionChart] = useState(null);
  const [languageChart, setLanguageChart] = useState(null);

  // Add style tag for CSS
  useEffect(() => {
    if (!document.getElementById("portfolio-css-style")) {
      const styleTag = document.createElement("style");
      styleTag.id = "portfolio-css-style";
      styleTag.innerHTML = style;
      document.head.appendChild(styleTag);
    }
  }, []);

  // Load Chart.js dynamically
  useEffect(() => {
    if (!window.Chart) {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/chart.js";
      script.onload = () => {};
      document.body.appendChild(script);
    }
  }, []);

  // Fetch all data
  useEffect(() => {
    loadGitHubStats();
    // eslint-disable-next-line
  }, []);

  async function loadGitHubStats() {
    if (!username) {
      setError("Please enter a GitHub username");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [user, repos, events, langs] = await Promise.all([
        fetchGitHubUser(username),
        fetchGitHubRepos(username),
        fetchGitHubEvents(username),
        fetchLanguageStats(username)
      ]);
      setUserData(user);
      setReposData(repos);
      setEventsData(events);
      setLanguageStats(langs);
      setMilestone(checkMilestones(user, repos, events));
      // Create/Update Charts
      setTimeout(() => {
        createContributionChart(events);
        createLanguageChart(langs);
      }, 400);
    } catch (err) {
      let errorMessage = "Error loading GitHub statistics. ";
      if (err.message.includes('404')) {
        errorMessage += "User not found. Please check the username.";
      } else if (err.message.includes('403')) {
        errorMessage += "Rate limit exceeded. Please try again later.";
      } else if (err.message.includes('NetworkError')) {
        errorMessage += "Network error. Please check your internet connection.";
      } else {
        errorMessage += "Please check the username and try again.";
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  // API Calls
  async function fetchGitHubUser(username) {
    const res = await fetch(`${GITHUB_API_BASE}/users/${username}`, {
      headers: GITHUB_TOKEN ? { Authorization: `token ${GITHUB_TOKEN}` } : {},
    });
    if (!res.ok) throw new Error(`User not found: ${res.status}`);
    return await res.json();
  }

  async function fetchGitHubRepos(username) {
    const res = await fetch(
      `${GITHUB_API_BASE}/users/${username}/repos?sort=updated&per_page=100`,
      {
        headers: GITHUB_TOKEN ? { Authorization: `token ${GITHUB_TOKEN}` } : {},
      }
    );
    if (!res.ok) throw new Error(`Repositories not found: ${res.status}`);
    return await res.json();
  }

  async function fetchGitHubEvents(username) {
    const res = await fetch(
      `${GITHUB_API_BASE}/users/${username}/events?per_page=100`,
      {
        headers: GITHUB_TOKEN ? { Authorization: `token ${GITHUB_TOKEN}` } : {},
      }
    );
    if (!res.ok) throw new Error(`Events not found: ${res.status}`);
    return await res.json();
  }

  async function fetchLanguageStats(username) {
    const repos = await fetchGitHubRepos(username);
    const languageStats = {};
    const limitedRepos = repos.slice(0, 20);
    const languagePromises = limitedRepos.map(async (repo) => {
      if (repo.language) {
        try {
          const res = await fetch(
            `${GITHUB_API_BASE}/repos/${username}/${repo.name}/languages`,
            {
              headers: GITHUB_TOKEN
                ? { Authorization: `token ${GITHUB_TOKEN}` }
                : {},
            }
          );
          if (res.ok) return await res.json();
        } catch (err) {
            console.log(err)
        }
      }
      return {};
    });
    const languageData = await Promise.all(languagePromises);
    languageData.forEach((languages) => {
      Object.entries(languages).forEach(([lang, bytes]) => {
        languageStats[lang] = (languageStats[lang] || 0) + bytes;
      });
    });
    return languageStats;
  }

  // Chart functions
  function createContributionChart(events) {
    if (!window.Chart || !contributionChartRef.current) return;
    // Process events data for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const contributionData = {};
    events.forEach((event) => {
      if (
        event.type === "PushEvent" &&
        new Date(event.created_at) >= sixMonthsAgo
      ) {
        const date = new Date(event.created_at).toISOString().split("T")[0];
        contributionData[date] =
          (contributionData[date] || 0) +
          (event.payload.commits ? event.payload.commits.length : 0);
      }
    });

    const labels = Object.keys(contributionData).sort();
    const data = labels.map((date) => contributionData[date]);
    if (contributionChart) contributionChart.destroy();
    const chart = new window.Chart(contributionChartRef.current.getContext("2d"), {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Commits",
            data: data,
            borderColor: "#667eea",
            backgroundColor: "rgba(102, 126, 234, 0.1)",
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1 },
          },
        },
        plugins: {
          legend: { display: false },
        },
      },
    });
    setContributionChart(chart);
  }

  function createLanguageChart(langs) {
    if (!window.Chart || !languageChartRef.current) return;
    const sortedLanguages = Object.entries(langs)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8);
    const labels = sortedLanguages.map(([lang]) => lang);
    const data = sortedLanguages.map(([, bytes]) => bytes);
    const colors = [
      "#667eea",
      "#764ba2",
      "#f093fb",
      "#f5576c",
      "#4facfe",
      "#00f2fe",
      "#43e97b",
      "#38f9d7",
    ];
    if (languageChart) languageChart.destroy();
    const chart = new window.Chart(languageChartRef.current.getContext("2d"), {
      type: "doughnut",
      data: {
        labels: labels,
        datasets: [
          {
            data: data,
            backgroundColor: colors.slice(0, labels.length),
            borderWidth: 2,
            borderColor: "#fff",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: { padding: 20, usePointStyle: true },
          },
        },
      },
    });
    setLanguageChart(chart);
  }

  // Milestone calculation
  function checkMilestones(userData, reposData, eventsData) {
    const milestones = [];
    const totalCommits = eventsData
      .filter((event) => event.type === "PushEvent")
      .reduce(
        (sum, event) => sum + (event.payload.commits ? event.payload.commits.length : 0),
        0
      );
    const totalStars = reposData.reduce((sum, repo) => sum + repo.stargazers_count, 0);
    const totalRepos = userData.public_repos;
    const followers = userData.followers;
    const commitMilestones = [100, 500, 1000, 2500, 5000, 10000];
    const starMilestones = [50, 100, 250, 500, 1000, 2500];
    const repoMilestones = [10, 25, 50, 100, 200];
    const followerMilestones = [25, 50, 100, 250, 500, 1000];

    // Commits
    const achievedCommits = commitMilestones.filter((m) => totalCommits >= m);
    if (achievedCommits.length) {
      const latest = Math.max(...achievedCommits);
      milestones.push({
        type: "commits",
        value: latest,
        total: totalCommits,
        message: `🎉 Just hit ${latest.toLocaleString()}+ commits on GitHub! Currently at ${totalCommits.toLocaleString()} total commits.`,
      });
    }
    // Stars
    const achievedStars = starMilestones.filter((m) => totalStars >= m);
    if (achievedStars.length) {
      const latest = Math.max(...achievedStars);
      milestones.push({
        type: "stars",
        value: latest,
        total: totalStars,
        message: `⭐ Amazing! My repositories have received ${latest.toLocaleString()}+ stars! Total: ${totalStars.toLocaleString()} stars.`,
      });
    }
    // Repos
    const achievedRepos = repoMilestones.filter((m) => totalRepos >= m);
    if (achievedRepos.length) {
      const latest = Math.max(...achievedRepos);
      milestones.push({
        type: "repos",
        value: latest,
        total: totalRepos,
        message: `📚 Reached ${latest}+ public repositories! Now at ${totalRepos} repositories on GitHub.`,
      });
    }
    // Followers
    const achievedFollowers = followerMilestones.filter((m) => followers >= m);
    if (achievedFollowers.length) {
      const latest = Math.max(...achievedFollowers);
      milestones.push({
        type: "followers",
        value: latest,
        total: followers,
        message: `👥 Thank you! Just reached ${latest}+ followers on GitHub! Currently at ${followers} followers.`,
      });
    }
    return milestones.length > 0 ? milestones[0] : null;
  }

  // LinkedIn Post
  function createLinkedInPost(milestone) {
    const milestoneMessage = milestone.message;
    return `${milestoneMessage}

#GitHub #Coding #Developer #Achievement #Milestone #${milestone.type} #OpenSource

Check out my GitHub portfolio to see more of my coding journey! 🚀`;
  }

  // Streak calculation
  function getStreakStats(eventsData) {
    const commitDates = new Set();
    eventsData.forEach((event) => {
      if (event.type === "PushEvent" && event.payload.commits) {
        const eventDate = new Date(event.created_at).toISOString().split("T")[0];
        commitDates.add(eventDate);
      }
    });
    const sortedDates = Array.from(commitDates).sort();
    return calculateStreaks(sortedDates);
  }

  // Handlers
  const handleUsernameChange = (e) => setUsername(e.target.value);
  const handleLoadStats = () => loadGitHubStats();
  const handleLinkedInPost = () => {
    if (!milestone) return;
    const postContent = createLinkedInPost(milestone);
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(postContent).then(() => {
        alert("Post content copied to clipboard! Opening LinkedIn...");
        window.open("https://www.linkedin.com/feed/", "_blank");
      });
    } else {
      alert(`LinkedIn Post Content:\n\n${postContent}`);
    }
  };

  // Render
  return (
    <div className="container">
      {/* Header Section */}
      <header className="header">
        <div className="profile-section">
          <div className="profile-left">
            <img
              id="profile-image"
              src={userData?.avatar_url || "https://via.placeholder.com/150"}
              alt="Profile"
              className="profile-img"
            />
            <h1 id="profile-name">
              {userData?.name || userData?.login || "Your Name"}
            </h1>
          </div>
          <div className="profile-info">
            <p id="profile-bio" className="bio">
              {userData?.bio || "Software Developer & GitHub Enthusiast"}
            </p>
            <div className="social-links">
              <a
                href={userData?.html_url || "#"}
                id="github-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className="fab fa-github"></i>
              </a>
              {/* You can add more dynamic links here */}
              <a href="#" id="linkedin-link" target="_blank" rel="noopener noreferrer">
                <i className="fab fa-linkedin"></i>
              </a>
              <a href="#" id="twitter-link" target="_blank" rel="noopener noreferrer">
                <i className="fab fa-twitter"></i>
              </a>
            </div>
          </div>
          {/* LinkedIn Post Button */}
          {milestone && (
            <div
              className="linkedin-post-btn celebrate"
              id="linkedin-post-btn"
              onClick={handleLinkedInPost}
              tabIndex={0}
              style={{ display: "flex" }}
            >
              <i className="fab fa-linkedin"></i>
              <span>Add Milestone to LinkedIn</span>
            </div>
          )}
        </div>
      </header>

      {/* GitHub Statistics Section */}
      <section className="github-stats">
        <h2>
          <i className="fab fa-github"></i> GitHub Statistics
        </h2>
        <div className="stats-streak-wrapper">
          {/* Stats Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-code-branch"></i>
              </div>
              <div className="stat-content">
                <h3 id="total-commits">
                  {eventsData
                    .filter((event) => event.type === "PushEvent")
                    .reduce(
                      (sum, event) =>
                        sum + (event.payload.commits ? event.payload.commits.length : 0),
                      0
                    )
                    .toLocaleString()}
                </h3>
                <p>Total Commits</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-code-pull-request"></i>
              </div>
              <div className="stat-content">
                <h3 id="total-prs">
                  {eventsData.filter((event) => event.type === "PullRequestEvent").length}
                </h3>
                <p>Pull Requests</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-repo"></i>
              </div>
              <div className="stat-content">
                <h3 id="total-repos">
                  {userData?.public_repos ? userData.public_repos.toLocaleString() : 0}
                </h3>
                <p>Repositories</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-star"></i>
              </div>
              <div className="stat-content">
                <h3 id="total-stars">
                  {reposData.reduce((sum, repo) => sum + repo.stargazers_count, 0)}
                </h3>
                <p>Stars Received</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-eye"></i>
              </div>
              <div className="stat-content">
                <h3 id="total-forks">
                  {reposData.reduce((sum, repo) => sum + repo.forks_count, 0)}
                </h3>
                <p>Forks</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-users"></i>
              </div>
              <div className="stat-content">
                <h3 id="followers">
                  {userData?.followers ? userData.followers.toLocaleString() : 0}
                </h3>
                <p>Followers</p>
              </div>
            </div>
          </div>
          {/* Commit Streak Box */}
          <div className="streak-container">
            {(() => {
              const { currentStreak, longestStreak, totalDays } = getStreakStats(eventsData);
              return (
                <>
                  <div className="streak-box">
                    <div className="streak-icon">
                      <i className="fas fa-fire"></i>
                    </div>
                    <div className="streak-info">
                      <h3 id="current-streak">{currentStreak}</h3>
                      <p>Current Streak</p>
                    </div>
                  </div>
                  <div className="streak-box">
                    <div className="streak-icon">
                      <i className="fas fa-trophy"></i>
                    </div>
                    <div className="streak-info">
                      <h3 id="longest-streak">{longestStreak}</h3>
                      <p>Longest Streak</p>
                    </div>
                  </div>
                  <div className="streak-box">
                    <div className="streak-icon">
                      <i className="fas fa-calendar"></i>
                    </div>
                    <div className="streak-info">
                      <h3 id="total-days">{totalDays}</h3>
                      <p>Total Days</p>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
        {/* GitHub Activity Chart */}
        <div className="chart-container">
          <h3>Contribution Activity (Last 6 Months)</h3>
          <canvas ref={contributionChartRef} id="contributionChart" />
        </div>
        {/* Language Distribution */}
        <div className="chart-container">
          <h3>Most Used Languages</h3>
          <canvas ref={languageChartRef} id="languageChart" />
        </div>
      </section>

      {/* Recent Repositories Section */}
      <section className="repositories">
        <h2>
          <i className="fas fa-folder"></i> Recent Repositories
        </h2>
        <div id="repos-container" className="repos-grid">
          {(reposData.slice(0, 6) || []).map((repo) => (
            <div className="repo-card" key={repo.id}>
              <div className="repo-header">
                <a
                  href={repo.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="repo-name"
                >
                  {repo.name}
                </a>
                <div className="repo-stats">
                  <span>
                    <i className="fas fa-star"></i> {repo.stargazers_count}
                  </span>
                  <span>
                    <i className="fas fa-code-branch"></i> {repo.forks_count}
                  </span>
                </div>
              </div>
              <p className="repo-description">
                {repo.description || "No description available"}
              </p>
              <div className="repo-topics">
                {repo.language && <span className="topic-tag">{repo.language}</span>}
                {repo.topics &&
                  repo.topics.slice(0, 3).map((topic) => (
                    <span className="topic-tag" key={topic}>
                      {topic}
                    </span>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Skills Section */}
      <section className="skills">
        <h2>
          <i className="fas fa-tools"></i> Skills & Technologies
        </h2>
        <div className="skills-container">
          <div className="skill-category">
            <h3>Programming Languages</h3>
            <div className="skill-tags" id="languages-skills">
              {Object.entries(languageStats)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .map(([lang]) => (
                  <span className="skill-tag" key={lang}>
                    {lang}
                  </span>
                ))}
            </div>
          </div>
          <div className="skill-category">
            <h3>Frameworks & Tools</h3>
            <div className="skill-tags" id="frameworks-skills">
              {["React", "Vue.js", "Angular", "Node.js", "Express", "Django", "Flask", "Spring", "Laravel", "Rails"]
                .sort(() => 0.5 - Math.random())
                .slice(0, 6)
                .map((framework) => (
                  <span className="skill-tag" key={framework}>
                    {framework}
                  </span>
                ))}
            </div>
          </div>
        </div>
      </section>

      {/* GitHub Configuration */}
      <div className="config-section">
        <h3>Configure Your GitHub Username</h3>
        <div className="config-input">
          <input
            type="text"
            id="github-username"
            placeholder="Enter your GitHub username"
            value={username}
            onChange={handleUsernameChange}
            disabled={loading}
          />
          <button
            id="load-stats"
            className="btn-primary"
            onClick={handleLoadStats}
            disabled={loading}
          >
            {loading ? <span className="loading"></span> : "Load Statistics"}
          </button>
        </div>
        {error && <div style={{ color: '#ff6b6b', marginTop: 16 }}>{error}</div>}
      </div>
    </div>
  );
};

export default Portfolio;

