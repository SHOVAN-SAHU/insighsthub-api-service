import axios, { AxiosResponse } from "axios";
import { config } from "./config";

const RAG_URL = config.ragServiceUrl;
const API_KEY = config.ragApiKey;

interface RagIngestionPayload {
  document_id: unknown;
  file_url: string;
  space_id: unknown;
  user_id: unknown;
  space_type: string;
}

interface RagAskPayload {
  question: string;
  space_id: unknown;
  user_id: unknown;
  space_type: string;
}

interface RagDeleteMeta {
  documentId: string;
  ownerId: string;
  spaceId: string | null;
  spaceType: string;
}

export const callRagIngestion = async (
  payload: RagIngestionPayload,
): Promise<AxiosResponse> => {
  return axios.post(`${RAG_URL}/api/v1/documents/process`, payload, {
    headers: {
      "x-api-key": API_KEY,
    },
  });
};

export const callRagAsk = async (
  payload: RagAskPayload,
): Promise<AxiosResponse> => {
  return axios.post(`${RAG_URL}/api/v1/documents/ask`, payload, {
    headers: {
      "x-api-key": API_KEY,
    },
    timeout: 15000,
  });
};

export const callRagDelete = async (
  meta: RagDeleteMeta,
): Promise<AxiosResponse> => {
  return axios.delete(`${RAG_URL}/api/v1/documents/${meta.documentId}`, {
    headers: {
      "x-api-key": API_KEY,
      "Content-Type": "application/json",
    },
    data: {
      user_id: meta.ownerId,
      space_id: meta.spaceId,
      space_type: meta.spaceType,
    },
  });
};
