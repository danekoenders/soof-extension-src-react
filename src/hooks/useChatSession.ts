import { useState, useEffect, useCallback } from 'react';
import { getWithExpiry, setWithExpiry, remove } from '../utils/expiringStorage';

interface ChatSessionState {
  sessionToken: string | null;
  threadToken: string | null;
}

const defaultState: ChatSessionState = {
  sessionToken: null,
  threadToken: null,
};

const SESSION_KEY = '__laintern-jwt';
const THREAD_KEY = '__laintern-thread';

export const useChatSession = () => {
  const [state, setState] = useState<ChatSessionState>(defaultState);

  useEffect(() => {
    const sessionToken = getWithExpiry<string>(SESSION_KEY);
    const threadToken = getWithExpiry<string>(THREAD_KEY);
    if (sessionToken || threadToken) {
      setState({
        sessionToken: sessionToken ?? null,
        threadToken: threadToken ?? null,
      });
    }
  }, []);

  const setSessionToken = useCallback((token: string | null, ttlMs?: number) => {
    if (!token) {
      remove(SESSION_KEY);
      setState((prev) => ({ ...prev, sessionToken: null }));
      return;
    }
    // Default TTL to 59 minutes when none provided to keep session fresh.
    setWithExpiry(SESSION_KEY, token, ttlMs ?? 59 * 60 * 1000);
    setState((prev) => ({ ...prev, sessionToken: token }));
  }, []);

  const setThreadToken = useCallback((threadToken: string | null, ttlMs?: number) => {
    if (!threadToken) {
      remove(THREAD_KEY);
      setState((prev) => ({ ...prev, threadToken: null }));
      return;
    }
    setWithExpiry(THREAD_KEY, threadToken, ttlMs ?? 7 * 24 * 60 * 60 * 1000);
    setState((prev) => ({ ...prev, threadToken }));
  }, []);

  const clearAll = useCallback(() => {
    remove(SESSION_KEY);
    remove(THREAD_KEY);
    setState(defaultState);
  }, []);

  return {
    chatSession: state,
    setSessionToken,
    setThreadToken,
    clearAll,
  };
};
