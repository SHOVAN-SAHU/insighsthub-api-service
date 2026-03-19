import axios from "axios";
import { config } from "./config.js";

const RAG_URL = config.ragServiceUrl;
const API_KEY = config.ragApiKey;

export const callRagIngestion = async (payload) => {
  return axios.post(
    `${RAG_URL}/api/v1/documents/process`,
    payload,
    {
      headers: {
        "x-api-key": API_KEY,
      },
      timeout: 30000, // don't hang forever
    }
  );
};

export const callRagDelete = async (documentId) => {
  return axios.delete(
    `${RAG_URL}/api/v1/documents/${documentId}`,
    {
      headers: {
        "x-api-key": API_KEY,
      },
    }
  );
};