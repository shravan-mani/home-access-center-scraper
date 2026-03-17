'use client';

import { useState } from 'react';
import { handleScrapeAction } from './actions';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setData(null);

    const formData = new FormData(e.currentTarget);
    const result = await handleScrapeAction(formData);

    if (result.error) {
      setError(result.error);
    } else {
      setData(result.data);
    }
    setLoading(false);
  };

  if (data) {
    return (
      <div style={{ padding: '20px', fontFamily: 'monospace' }}>
        <button onClick={() => setData(null)}>Back to Login</button>
        <hr />
        <h2>Student: {data.studentName}</h2>
        {data.classes.map((cls: any, idx: number) => (
          <div key={idx} style={{ marginBottom: '30px', border: '1px solid black', padding: '10px' }}>
            <h3>{cls.name}</h3>
            <p>Teacher: {cls.teacher} | Grade: {cls.grade} | Last Updated: {cls.lastUpdated}</p>
            <table border={1} style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr>
                  <th style={{ padding: '8px' }}>Due Date</th>
                  <th style={{ padding: '8px' }}>Assignment</th>
                  <th style={{ padding: '8px' }}>Category</th>
                  <th style={{ padding: '8px' }}>Score / Total</th>
                </tr>
              </thead>
              <tbody>
                {cls.assignments.map((asg: any, aidx: number) => (
                  <tr key={aidx}>
                    <td style={{ padding: '8px' }}>{asg.dateDue}</td>
                    <td style={{ padding: '8px' }}>{asg.name}</td>
                    <td style={{ padding: '8px' }}>{asg.category}</td>
                    <td style={{ padding: '8px' }}>{asg.score} / {asg.totalPoints}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        <hr style={{ marginTop: '40px' }} />
        <p style={{ fontSize: '10px', opacity: 0.5 }}>Written by Shravan Mani</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>HAC Scraper</h1>
      <form onSubmit={handleSubmit}>
        <div><label>HAC URL: </label><input name="url" type="url" required placeholder="https://..." /></div><br />
        <div><label>Username: </label><input name="username" type="text" required /></div><br />
        <div><label>Password: </label><input name="password" type="password" required /></div><br />
        <button type="submit" disabled={loading}>{loading ? 'Scraping...' : 'Submit'}</button>
      </form>
      {error && <p style={{ color: 'red', marginTop: '20px' }}>Error: {error}</p>}
      <hr style={{ marginTop: '40px' }} />
      <p style={{ fontSize: '10px', opacity: 0.5 }}>Written by Shravan Mani</p>
    </div>
  );
}
