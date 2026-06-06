# InsightsHub — Node API Service

> The backend REST API powering **InsightsHub** — an AI-driven knowledge management platform where users can upload documents, organize them into spaces, ask questions using RAG (Retrieval-Augmented Generation), and manage subscriptions.

[![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-5.x-000000?logo=express&logoColor=white)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white)](https://mongoosejs.com)
[![Hosted on Render](https://img.shields.io/badge/Hosted%20on-Render-46E3B7?logo=render&logoColor=white)](https://render.com)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

---

## 📖 Table of Contents

- [About the Project](#about-the-project)
- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [API Modules](#api-modules)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Running Locally](#running-locally)
- [Deployment (Render)](#deployment-render)
- [Security Features](#security-features)

---

## About the Project

InsightsHub is a SaaS platform that lets users:

- 📁 **Upload documents** (PDFs, files) into isolated **Spaces**
- 🤖 **Ask AI questions** about their documents using a RAG pipeline
- 🔍 **Search** across their knowledge base
- 💳 **Subscribe** to plans (FREE / PRO / BUSINESS) via Razorpay
- 🔐 **Authenticate** securely with Google OAuth

This repo is the **Node.js API service** — the backend that handles all business logic, database access, file storage, and communication with the external RAG service.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Runtime** | Node.js (ESM) |
| **Framework** | Express 5 |
| **Database** | MongoDB via Mongoose |
| **Authentication** | Google OAuth + JWT (httpOnly cookies) |
| **File Storage** | AWS S3-compatible object storage (Elasticlake) |
| **AI / RAG** | External RAG microservice (via REST) |
| **Payments** | Razorpay |
| **Email** | Resend |
| **Security** | Helmet, CORS, express-rate-limit |
| **Hosting** | Render (production) |

---

## Architecture Overview

```
Client (React)
      │
      ▼
┌─────────────────────────────┐
│   InsightsHub API Service   │  ◄── This repo
│   (Express + Node.js)       │
└────────────┬────────────────┘
             │
     ┌───────┼───────────────┐
     ▼       ▼               ▼
  MongoDB  Razorpay    Elasticlake S3
             │               
             ▼               
      External RAG Service   
      (Document ingestion     
       & AI Q&A pipeline)    
```

- The API is **stateless** — auth state is carried in a signed JWT stored in an `httpOnly` cookie.
- **Spaces** are isolated knowledge containers. Each space owns its documents.
- When a document is uploaded, it's stored in S3 and the metadata is sent to the **RAG service** for vector indexing.
- When a user asks a question, the request is forwarded to the RAG service which returns a grounded AI answer.
- Razorpay **webhooks** hit this service to upgrade user plans after payment.

---

## Project Structure

```
src/
├── app.js                  # Express app setup, middleware, route mounting
├── server.js               # DB connection + server start
│
├── config/
│   ├── config.js           # All environment variable access (single source of truth)
│   ├── db.js               # MongoDB connection
│   ├── email.js            # Resend email client & templates
│   ├── objectStorage.js    # S3 upload / signed URL / delete helpers
│   ├── ragApi.js           # Axios wrappers for the RAG microservice
│   └── razorpay.js         # Razorpay client init
│
└── modules/                # Feature-based module structure
    ├── auth/               # Google OAuth login, JWT issue, logout
    ├── user/               # User model, rate limiters
    ├── document/           # Upload, list, delete documents
    ├── space/              # Create, manage knowledge spaces
    ├── ask/                # RAG-powered Q&A endpoint
    ├── search/             # Full-text search
    ├── plan/               # Pricing plan definitions
    ├── subscription/       # Razorpay orders, webhook handler
    └── usage/              # Usage tracking per user/plan
```

Each module follows a consistent layered pattern:

```
module/
  ├── module.routes.js      # Express router
  ├── module.controller.js  # Request/response handling
  ├── module.service.js     # Business logic
  └── module.model.js       # Mongoose schema (if applicable)
```

---

## API Modules

| Prefix | Module | Description |
|---|---|---|
| `POST /api/v1/users/login` | **Auth** | Google OAuth login, sets JWT cookie |
| `POST /api/v1/users/logout` | **Auth** | Clears JWT cookie |
| `GET /api/v1/users/me` | **Auth** | Get current authenticated user |
| `GET /api/v1/spaces` | **Spaces** | List user's spaces |
| `POST /api/v1/spaces` | **Spaces** | Create a new space |
| `DELETE /api/v1/spaces/:id` | **Spaces** | Delete a space and its documents |
| `POST /api/v1/documents` | **Documents** | Upload a file to a space |
| `GET /api/v1/documents` | **Documents** | List documents in a space |
| `DELETE /api/v1/documents/:id` | **Documents** | Delete a document |
| `POST /api/v1/ask` | **Ask** | Ask an AI question (RAG) |
| `GET /api/v1/search` | **Search** | Search across documents |
| `GET /api/v1/plans` | **Plans** | Get available subscription plans |
| `POST /api/v1/subscription/order` | **Subscription** | Create Razorpay order |
| `POST /api/v1/subscription/webhook` | **Subscription** | Razorpay payment webhook |
| `GET /` | **Health** | Service alive check |
| `GET /health` | **Health** | Health check endpoint |
| `GET /db-status` | **Health** | MongoDB connection status |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- [MongoDB](https://www.mongodb.com/) (local or Atlas)
- A [Razorpay](https://razorpay.com/) account
- A [Resend](https://resend.com/) account
- An S3-compatible object storage bucket
- The [InsightsHub RAG Service](https://github.com/SHOVAN-SAHU) running separately

### Installation

```bash
# Clone the repository
git clone https://github.com/SHOVAN-SAHU/insighsthub-api-service.git
cd insighsthub-api-service

# Install dependencies
npm install
```

### Environment Variables

Create a `.env` file in the project root. **Never commit this file.**

```env
# Server
PORT=8000
NODE_ENV=development

# MongoDB
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/insightshub

# Frontend
FRONTEND_URL=http://localhost:5173

# JWT
JWT_SECRET=your_super_secret_key
JWT_EXPIRES_IN=7d

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id

# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret

# Resend (Email)
RESEND_API_KEY=re_xxxx

# RAG Microservice
RAG_SERVICE_URL=http://localhost:8001
RAG_API_KEY=your_rag_service_api_key

# Elasticlake / S3-compatible Storage
ELASTIC_ENDPOINT=https://your-s3-endpoint.com
ELASTIC_ACCESS_KEY=your_access_key
ELASTIC_SECRET_KEY=your_secret_key
ELASTIC_BUCKET=your_bucket_name
ELASTIC_REGION=ap-south-1
```

### Running Locally

```bash
# Development (with hot reload via nodemon)
npm run dev

# Production
npm start
```

The API will be available at `http://localhost:8000`.

---

## Deployment (Render)

This service is hosted on [Render](https://render.com) at `https://api.insightshub.in`.

| Setting | Value |
|---|---|
| **Environment** | Node |
| **Build Command** | `npm install` |
| **Start Command** | `node src/server.js` |
| **Auto-Deploy** | Yes — on every push to `main` |

All environment variables listed above must be added in the Render dashboard under **Environment → Environment Variables**.

> **Note:** The `/api/v1/subscription/webhook` route consumes raw request bodies intentionally — required for Razorpay signature verification.

---

## Security Features

- **Helmet** — Sets secure HTTP headers
- **CORS** — Restricted to the production frontend URL and `localhost:5173` in dev
- **Rate Limiting** — Three tiers: auth routes, search, and general API
- **httpOnly Cookies** — JWTs are never exposed to JavaScript on the client
- **Webhook integrity** — Razorpay webhook signatures are verified server-side
- **Environment isolation** — All secrets are loaded from env vars, never hardcoded

---

*Built by [Shovan Sahu](https://github.com/SHOVAN-SAHU) · Part of the InsightsHub project*
