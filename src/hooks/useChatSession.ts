import { useState, useEffect } from 'react';

interface ChatSession {
  active: boolean;
  expiresAt: string | null;
  userEmail?: string | null;
  sessionToken: string | null;
  transcript: any[] | null;
  assistantId: string | null;
  threadId: string | null;
  langGraphUrl: string | null;
}

const defaultSession: ChatSession = {
  active: false,
  expiresAt: null,
  userEmail: null,
  sessionToken: null,
  transcript: null,
  assistantId: null,
  threadId: null,
  langGraphUrl: null,
};

export const useChatSession = () => {
  const [chatSession, setChatSessionState] = useState<ChatSession>(defaultSession);

  // Load session from localStorage on mount
  useEffect(() => {
    const loadSession = () => {
      try {
        const itemString = localStorage.getItem('soof-chat-session');
        if (itemString) {
          const item = JSON.parse(itemString);
          const now = new Date();
          const expiresAt = new Date(item.expiresAt);

          if (expiresAt < now) {
            localStorage.removeItem('soof-chat-session');
            setChatSessionState(defaultSession);
          } else {
            setChatSessionState(item);
          }
        }
      } catch (error) {
        console.error('Error loading chat session:', error);
        setChatSessionState(defaultSession);
      }
    };

    loadSession();
  }, []);

  const setChatSession = (newSession: Partial<ChatSession>) => {
    const updatedSession = { ...chatSession, ...newSession };
    setChatSessionState(updatedSession);
    
    try {
      localStorage.setItem('soof-chat-session', JSON.stringify(updatedSession));
    } catch (error) {
      console.error('Error saving chat session:', error);
    }
  };

  const clearChatSession = () => {
    setChatSessionState(defaultSession);
    localStorage.removeItem('soof-chat-session');
  };

  return {
    chatSession,
    setChatSession,
    clearChatSession,
  };
}; 