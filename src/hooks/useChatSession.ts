import { useState, useEffect, useCallback } from 'react';
import { getWithExpiry, setWithExpiry, remove } from '../utils/expiringStorage';

interface ChatSessionState {
  active: boolean;
  jwt: string | null;
  threadToken: string | null;
}

const defaultState: ChatSessionState = {
  active: false,
  jwt: null,
  threadToken: null,
};

const JWT_KEY = '__laintern-jwt';
const THREAD_KEY = '__laintern-thread';

export const useChatSession = () => {
  const [state, setState] = useState<ChatSessionState>(defaultState);

  useEffect(() => {
    const jwt = getWithExpiry<string>(JWT_KEY);
    const threadToken = getWithExpiry<string>(THREAD_KEY);
    if (jwt || threadToken) {
      setState({ active: !!jwt, jwt: jwt ?? null, threadToken: threadToken ?? null });
    }
  }, []);

  const setJwt = useCallback((jwt: string, ttlMs: number) => {
    setWithExpiry(JWT_KEY, jwt, ttlMs);
    setState((prev) => ({ ...prev, active: true, jwt }));
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
    remove(JWT_KEY);
    remove(THREAD_KEY);
    setState(defaultState);
  }, []);

  return {
    chatSession: state,
    setJwt,
    setThreadToken,
    clearAll,
  };
};