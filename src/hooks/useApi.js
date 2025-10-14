import { useState, useCallback, useRef } from 'react';
import { useAuth } from "@/contextproviders/AuthContext";
import { toast } from "sonner";

const useApi = () => {
  const { getBearerToken } = useAuth();
  const isExecutingRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const execute = useCallback(async (path, method, data = null) => {
    if (isExecutingRef.current) {
      console.warn('Request already in progress, rejecting duplicate');
      return { success: false, error: 'Request already in progress' };
    }

    isExecutingRef.current = true;
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const token = await getBearerToken();
      const response = await fetch(
        `https://12q94bkh4h.execute-api.us-east-1.amazonaws.com/latest${path ? path : ''}`,
        {
          method: method ? method : 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token
          },
          body: JSON.stringify({
            ...(data && { data }),
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      setData(result);
      return result;
    } catch (err) {
      const errorMessage = err.message || 'An error occurred';
      toast.error(errorMessage);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
      isExecutingRef.current = false;
    }
  }, [getBearerToken]);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
  }, []);

  return {
    execute,
    loading,
    error,
    data,
    reset,
  };
};

export default useApi;