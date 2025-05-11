// src/services/guidedAnalysisApi.ts
import { NoticiaParaAnalisis, ChatGuiaResponse } from '../types/types'; // Verifica que estos tipos estén exportados en types.ts

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface ExplicacionInicialPayload {
  noticia_id_json: string;
  explicacion_usuario: string;
  evaluacion_inicial_opcional?: 'TRUE' | 'FALSE' | 'UNSURE';
}

interface ContinuarChatPayload {
  mensaje_usuario: string;
}

const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

export const getNextGuidedNews = async (): Promise<NoticiaParaAnalisis> => {
  const token = getAuthToken();
  if (!token) throw new Error('No authentication token found');

  const response = await fetch(`${API_BASE_URL}/activity/guided-analysis/next-news`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Network response was not ok' }));
    throw new Error(errorData.detail || 'Failed to fetch next guided news');
  }
  return response.json();
};

export const startGuidedAnalysis = async (payload: ExplicacionInicialPayload): Promise<ChatGuiaResponse> => {
  const token = getAuthToken();
  if (!token) throw new Error('No authentication token found');

  const response = await fetch(`${API_BASE_URL}/activity/guided-analysis/explain`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Network response was not ok' }));
    throw new Error(errorData.detail || 'Failed to start guided analysis');
  }
  return response.json();
};

export const continueGuidedChat = async (chatSesionNoticiaId: number, payload: ContinuarChatPayload): Promise<ChatGuiaResponse> => {
  const token = getAuthToken();
  if (!token) throw new Error('No authentication token found');

  const response = await fetch(`${API_BASE_URL}/activity/guided-analysis/chat/${chatSesionNoticiaId}/continue`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Network response was not ok' }));
    throw new Error(errorData.detail || 'Failed to continue guided chat');
  }
  return response.json();
};

export const finishGuidedNews = async (chatSesionNoticiaId: number): Promise<{ message: string }> => {
  const token = getAuthToken();
  if (!token) throw new Error('No authentication token found');

  const response = await fetch(`${API_BASE_URL}/activity/guided-analysis/finish-news/${chatSesionNoticiaId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Network response was not ok' }));
    throw new Error(errorData.detail || 'Failed to finish guided news analysis');
  }
  return response.json();
};