'use client';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabaseClient';

export default function LikeTest() {
  const [testResult, setTestResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testLikeAPI = async () => {
    setLoading(true);
    setTestResult('Testing like API...');
    
    try {
      const sb = supabaseBrowser();
      const { data: { session } } = await sb.auth.getSession();
      
      if (!session) {
        setTestResult('❌ No session found - please log in first');
        return;
      }

      // Test with a dummy post ID (you can replace this with a real post ID)
      const testPostId = 'test-post-id';
      
      const res = await fetch(`/api/posts/${testPostId}/like`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          action: 'like'
        })
      });
      
      if (res.ok) {
        setTestResult('✅ Like API is working - received success response');
      } else {
        const error = await res.json();
        setTestResult(`❌ Like API error: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      setTestResult(`❌ Like API test failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-4">
      <h3 className="font-semibold mb-3">Like API Test</h3>
      <button 
        onClick={testLikeAPI}
        disabled={loading}
        className="btn mb-3"
      >
        {loading ? 'Testing...' : 'Test Like API'}
      </button>
      {testResult && (
        <div className="text-sm text-muted">
          {testResult}
        </div>
      )}
    </div>
  );
}
