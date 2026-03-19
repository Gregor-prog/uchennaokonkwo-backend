# API Reference

Complete documentation for the backend REST API. Covers authentication, posts, media management, data shapes, error handling, and frontend integration patterns.

---

## Table of Contents

1. [Base URL & Versioning](#1-base-url--versioning)
2. [Authentication Overview](#2-authentication-overview)
3. [Role-Based Access Control](#3-role-based-access-control)
4. [Global Behaviours](#4-global-behaviours)
5. [Error Reference](#5-error-reference)
6. [Rate Limits](#6-rate-limits)
7. [Auth Endpoints](#7-auth-endpoints)
   - [POST /auth/register](#71-post-authregister)
   - [POST /auth/login](#72-post-authlogin)
   - [POST /auth/refresh](#73-post-authrefresh)
   - [POST /auth/logout](#74-post-authlogout)
   - [GET /auth/me](#75-get-authme)
8. [Posts Endpoints](#8-posts-endpoints)
   - [GET /posts](#81-get-posts)
   - [GET /posts/:id](#82-get-postsid)
   - [POST /posts](#83-post-posts)
   - [PATCH /posts/:id](#84-patch-postsid)
   - [DELETE /posts/:id](#85-delete-postsid)
   - [POST /posts/:id/media](#86-post-postsidmedia)
   - [DELETE /posts/:id/media/:mediaId](#87-delete-postsidmediamediaid)
9. [Data Models](#9-data-models)
10. [Frontend Integration Guide](#10-frontend-integration-guide)
    - [Token management](#101-token-management)
    - [Axios / Fetch setup](#102-axiosfetch-setup)
    - [Auth flow](#103-auth-flow)
    - [Uploading images](#104-uploading-images)
    - [Role-gating UI components](#105-role-gating-ui-components)
11. [Environment Variables](#11-environment-variables)

---

## 1. Base URL & Versioning

```
http://localhost:3000/api/v1        ← development
https://yourdomain.com/api/v1       ← production
```

All endpoints described in this document are relative to that base. For example, `POST /auth/register` means `POST https://yourdomain.com/api/v1/auth/register`.

---

## 2. Authentication Overview

The API uses a **dual-token JWT strategy**:

| Token | Where to store | Lifetime | Purpose |
|---|---|---|---|
| `accessToken` | Memory (variable) — **never** localStorage | 15 minutes | Authenticate every request via `Authorization` header |
| `refreshToken` | `httpOnly` cookie **or** secure storage | 7 days | Obtain a new access token without logging in again |

### How to send the access token

Every protected endpoint requires this header:

```
Authorization: Bearer <accessToken>
```

### Token rotation

Every time you call `POST /auth/refresh`, both tokens are replaced. The old refresh token is immediately invalidated. If the old token is used again after rotation, the server detects possible theft and **revokes all sessions** for that user.

### Security design

- Passwords are hashed with **bcrypt** (cost factor 12) — never stored in plain text.
- Refresh tokens are stored as **bcrypt hashes** in the database — the raw value only ever lives in the client.
- HTTP headers are hardened with **Helmet** (CSP, HSTS, X-Frame-Options, etc.).
- Requests with unknown fields are rejected (whitelist validation).

---

## 3. Role-Based Access Control

Three roles exist. A user can hold multiple roles.

| Role | Description |
|---|---|
| `ADMIN` | Super-user. Full access to everything. |
| `MEDIA` | Content creator. Read/edit all posts; delete only their own. |
| `VOLUNTEER` | Community member. No access to posts endpoints. |

> ADMIN always passes role checks, regardless of what roles are required on a route.

### Access matrix — Posts

| Action | ADMIN | MEDIA | VOLUNTEER |
|---|---|---|---|
| List posts | ✅ | ✅ | ❌ 403 |
| Get single post | ✅ | ✅ | ❌ 403 |
| Create post | ✅ | ✅ | ❌ 403 |
| Update any post | ✅ | ✅ | ❌ 403 |
| Delete any post | ✅ | ❌ 403 | ❌ 403 |
| Delete own post | ✅ | ✅ | ❌ 403 |
| Add media to any post | ✅ | ❌ 403 | ❌ 403 |
| Add media to own post | ✅ | ✅ | ❌ 403 |
| Remove media from any post | ✅ | ❌ 403 | ❌ 403 |
| Remove media from own post | ✅ | ✅ | ❌ 403 |

---

## 4. Global Behaviours

### Validation

Every request body is validated. Requests that:
- Contain a field **not defined in the schema** → `400 Bad Request`
- Fail any validation rule (min length, enum value, regex, etc.) → `400 Bad Request`

Validation error responses include a `message` array listing every failing constraint.

### Content-Type

- JSON bodies: `Content-Type: application/json`
- File uploads (posts with images): `Content-Type: multipart/form-data`

### CORS

Allowed origins are configured via the `ALLOWED_ORIGINS` environment variable (comma-separated list). The `Authorization` and `Content-Type` headers are whitelisted. Credentials are allowed.

---

## 5. Error Reference

All error responses share this shape:

```jsonc
{
  "statusCode": 400,        // HTTP status code
  "message": "...",         // string or string[] for validation errors
  "error": "Bad Request"    // HTTP reason phrase
}
```

| Status | Meaning | Common causes |
|---|---|---|
| `400` | Bad Request | Validation failure, unknown fields, unsupported file type |
| `401` | Unauthorized | Missing or expired access token |
| `403` | Forbidden | Valid token but role insufficient; refresh token mismatch (token theft) |
| `404` | Not Found | Post or media item does not exist |
| `409` | Conflict | Email already registered |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Unexpected server failure |

### Validation error example

```json
{
  "statusCode": 400,
  "message": [
    "Password must include uppercase, lowercase, a number, and a special character (@$!%*?&).",
    "email must be an email"
  ],
  "error": "Bad Request"
}
```

---

## 6. Rate Limits

| Endpoint | Limit | Window |
|---|---|---|
| All other endpoints | 100 requests | 60 seconds per IP |
| `POST /auth/register` | 5 requests | 60 seconds per IP |
| `POST /auth/login` | 10 requests | 60 seconds per IP |

When exceeded the server responds with `429 Too Many Requests`.

---

## 7. Auth Endpoints

### 7.1 `POST /auth/register`

Creates a new user account and immediately returns a token pair.

**Auth required:** No
**Rate limit:** 5 requests / 60 s

#### Request body — `application/json`

| Field | Type | Required | Constraints |
|---|---|---|---|
| `email` | `string` | ✅ | Valid email format |
| `firstName` | `string` | ✅ | 2–50 characters |
| `lastName` | `string` | ✅ | 2–50 characters |
| `password` | `string` | ✅ | 8–128 chars, must contain uppercase, lowercase, digit, and one of `@$!%*?&` |
| `role` | `"ADMIN" \| "MEDIA" \| "VOLUNTEER"` | ❌ | Defaults to `"VOLUNTEER"` if omitted |
| `constituentName` | `string` | ❌ | Max 100 characters |

#### Example request

```json
{
  "email": "ada@example.com",
  "firstName": "Ada",
  "lastName": "Okonkwo",
  "password": "Secure@123",
  "role": "MEDIA",
  "constituentName": "Enugu North"
}
```

#### Success response — `201 Created`

```json
{
  "user": {
    "id": "a1b2c3d4-...",
    "email": "ada@example.com",
    "firstName": "Ada",
    "lastName": "Okonkwo",
    "isActive": true,
    "lastLoginAt": "2026-03-18T12:00:00.000Z",
    "createdAt": "2026-03-18T12:00:00.000Z",
    "updatedAt": "2026-03-18T12:00:00.000Z",
    "constituentName": "Enugu North",
    "profilePictureUrl": null,
    "userRoles": [
      {
        "id": "r1r2r3...",
        "userId": "a1b2c3d4-...",
        "role": "MEDIA",
        "description": "Media access"
      }
    ]
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

> `passwordHash` and `refreshTokenHash` are **never** returned.

#### Error responses

| Status | When |
|---|---|
| `400` | Validation failure |
| `409` | Email already in use |

---

### 7.2 `POST /auth/login`

Authenticates with email and password. Returns a token pair.

**Auth required:** No
**Rate limit:** 10 requests / 60 s

#### Request body — `application/json`

| Field | Type | Required |
|---|---|---|
| `email` | `string` | ✅ |
| `password` | `string` | ✅ |

#### Example request

```json
{
  "email": "ada@example.com",
  "password": "Secure@123"
}
```

#### Success response — `200 OK`

```json
{
  "user": {
    "id": "a1b2c3d4-...",
    "email": "ada@example.com",
    "firstName": "Ada",
    "lastName": "Okonkwo",
    "isActive": true,
    "lastLoginAt": "2026-03-18T12:05:00.000Z",
    "createdAt": "2026-03-18T12:00:00.000Z",
    "updatedAt": "2026-03-18T12:05:00.000Z",
    "constituentName": "Enugu North",
    "profilePictureUrl": null,
    "userRoles": [
      { "id": "r1...", "userId": "a1b2c3d4-...", "role": "MEDIA", "description": "Media access" }
    ]
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Error responses

| Status | When |
|---|---|
| `400` | Validation failure |
| `401` | Wrong credentials or account deactivated |

---

### 7.3 `POST /auth/refresh`

Issues a new access token and refresh token. The old refresh token is immediately invalidated (token rotation).

**Auth required:** No (uses refresh token in body)

#### Request body — `application/json`

| Field | Type | Required |
|---|---|---|
| `refreshToken` | `string` | ✅ |

#### Example request

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Success response — `200 OK`

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

> **Always replace both tokens** in your storage after this call.

#### Error responses

| Status | When |
|---|---|
| `401` | Refresh token missing or malformed |
| `403` | Refresh token expired, already used, or hash mismatch (possible theft — all sessions revoked) |

---

### 7.4 `POST /auth/logout`

Clears the server-side refresh token hash. All future refresh attempts for this session fail.

**Auth required:** Yes — `Authorization: Bearer <accessToken>`

#### Request body

None.

#### Success response — `200 OK`

```json
{}
```

> Call this on every explicit logout, tab close, or session timeout in the frontend.

---

### 7.5 `GET /auth/me`

Returns the currently authenticated user's profile as decoded from the access token.

**Auth required:** Yes — `Authorization: Bearer <accessToken>`

#### Success response — `200 OK`

```json
{
  "id": "a1b2c3d4-...",
  "email": "ada@example.com",
  "firstName": "Ada",
  "lastName": "Okonkwo",
  "roles": ["MEDIA"]
}
```

> This is a lightweight response derived from the JWT payload — no database query is made beyond token validation.

---

## 8. Posts Endpoints

All posts endpoints require authentication and at least the `MEDIA` role. `VOLUNTEER` users receive `403` on every route.

### 8.1 `GET /posts`

Returns all posts ordered by creation date, newest first.

**Auth required:** Yes
**Roles:** `ADMIN`, `MEDIA`

#### Success response — `200 OK`

```json
[
  {
    "id": "p1p2p3...",
    "title": "Governor Visits Enugu",
    "subcontent": "A brief summary of the visit.",
    "content": "Full article text...",
    "multilingualContent": [
      { "language": "ENGLISH", "title": "Governor Visits Enugu", "content": "..." },
      { "language": "YORUBA",  "title": "...",                   "content": "..." }
    ],
    "authorId": "a1b2c3d4-...",
    "status": "PUBLISHED",
    "createdAt": "2026-03-18T09:00:00.000Z",
    "updatedAt": "2026-03-18T09:00:00.000Z",
    "author": {
      "id": "a1b2c3d4-...",
      "firstName": "Ada",
      "lastName": "Okonkwo",
      "email": "ada@example.com"
    },
    "Media": [
      {
        "id": "m1m2m3...",
        "url": "https://res.cloudinary.com/your-cloud/image/upload/posts/uuid.jpg",
        "cloudinaryPublicId": "posts/uuid",
        "type": "image/jpeg",
        "postId": "p1p2p3...",
        "projectId": null,
        "createdAt": "2026-03-18T09:00:00.000Z",
        "updatedAt": "2026-03-18T09:00:00.000Z"
      }
    ]
  }
]
```

---

### 8.2 `GET /posts/:id`

Returns a single post by its UUID.

**Auth required:** Yes
**Roles:** `ADMIN`, `MEDIA`

#### Path parameters

| Parameter | Type | Description |
|---|---|---|
| `id` | `string` (UUID) | The post's unique identifier |

#### Success response — `200 OK`

Same shape as a single item in the `GET /posts` array response.

#### Error responses

| Status | When |
|---|---|
| `404` | Post does not exist |

---

### 8.3 `POST /posts`

Creates a new post. Images are optional — send them as `multipart/form-data` using the field name `images`. Text fields are sent as form fields in the same multipart request.

**Auth required:** Yes
**Roles:** `ADMIN`, `MEDIA`
**Content-Type:** `multipart/form-data`

#### Form fields

| Field | Type | Required | Constraints |
|---|---|---|---|
| `title` | `string` | ✅ | 3–255 characters |
| `content` | `string` | ✅ | Minimum 10 characters |
| `subcontent` | `string` | ❌ | Max 500 characters |
| `status` | `"DRAFT" \| "PUBLISHED" \| "ARCHIVED"` | ❌ | Defaults to `"DRAFT"` |
| `multilingualContent` | `string` (JSON) | ❌ | JSON-encoded array — see structure below |
| `images` | `File[]` | ❌ | Up to 10 files, max 5 MB each. Allowed types: `jpg`, `jpeg`, `png`, `gif`, `webp` |

#### `multilingualContent` JSON structure

When sending over multipart/form-data, stringify this array and send it as the `multilingualContent` field:

```json
[
  {
    "language": "ENGLISH",
    "title": "Governor Visits Enugu",
    "content": "Full text in English..."
  },
  {
    "language": "YORUBA",
    "title": "...",
    "content": "..."
  }
]
```

Each item requires `language` (string), `title` (string), and `content` (string). Use any language identifier string that suits your frontend (e.g. `"IGBO"`, `"HAUSA"`).

#### Example request (JavaScript `FormData`)

```javascript
const formData = new FormData();
formData.append('title', 'Governor Visits Enugu');
formData.append('content', 'Full article text here...');
formData.append('subcontent', 'A brief summary.');
formData.append('status', 'PUBLISHED');
formData.append(
  'multilingualContent',
  JSON.stringify([
    { language: 'ENGLISH', title: 'Governor Visits Enugu', content: '...' },
    { language: 'YORUBA',  title: '...',                   content: '...' },
  ])
);
formData.append('images', file1);  // File object from <input type="file">
formData.append('images', file2);

const response = await fetch('/api/v1/posts', {
  method: 'POST',
  headers: { Authorization: `Bearer ${accessToken}` },
  // Do NOT set Content-Type manually — the browser sets it with the boundary
  body: formData,
});
```

#### Success response — `201 Created`

```json
{
  "id": "p1p2p3...",
  "title": "Governor Visits Enugu",
  "subcontent": "A brief summary.",
  "content": "Full article text here...",
  "multilingualContent": [...],
  "authorId": "a1b2c3d4-...",
  "status": "PUBLISHED",
  "createdAt": "2026-03-18T09:00:00.000Z",
  "updatedAt": "2026-03-18T09:00:00.000Z",
  "author": {
    "id": "a1b2c3d4-...",
    "firstName": "Ada",
    "lastName": "Okonkwo",
    "email": "ada@example.com"
  },
  "Media": [
    {
      "id": "m1m2m3...",
      "url": "https://res.cloudinary.com/your-cloud/image/upload/posts/uuid.jpg",
      "cloudinaryPublicId": "posts/uuid",
      "type": "image/jpeg",
      "postId": "p1p2p3...",
      "projectId": null,
      "createdAt": "2026-03-18T09:00:00.000Z",
      "updatedAt": "2026-03-18T09:00:00.000Z"
    }
  ]
}
```

#### Error responses

| Status | When |
|---|---|
| `400` | Validation failure or unsupported file type |
| `413` | File exceeds 5 MB limit |

---

### 8.4 `PATCH /posts/:id`

Updates an existing post. All fields are optional — send only the ones you want to change. Newly uploaded images are **appended** to the post's media list; to remove individual images use `DELETE /posts/:id/media/:mediaId`.

**Auth required:** Yes
**Roles:** `ADMIN`, `MEDIA`
**Content-Type:** `multipart/form-data`

#### Path parameters

| Parameter | Type | Description |
|---|---|---|
| `id` | `string` (UUID) | The post's unique identifier |

#### Form fields

Same as `POST /posts` — all fields are optional.

#### Example request

```javascript
const formData = new FormData();
formData.append('title', 'Updated Title');
formData.append('status', 'ARCHIVED');
// No files this time — just updating text fields

const response = await fetch(`/api/v1/posts/${postId}`, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${accessToken}` },
  body: formData,
});
```

#### Success response — `200 OK`

Full post object — same shape as `POST /posts` response.

#### Error responses

| Status | When |
|---|---|
| `400` | Validation failure |
| `404` | Post not found |

---

### 8.5 `DELETE /posts/:id`

Permanently deletes a post and all its associated media (both the database rows and the Cloudinary assets).

**Auth required:** Yes
**Roles:** `ADMIN` (any post), `MEDIA` (own posts only)

#### Path parameters

| Parameter | Type | Description |
|---|---|---|
| `id` | `string` (UUID) | The post's unique identifier |

#### Success response — `204 No Content`

Empty body.

#### Error responses

| Status | When |
|---|---|
| `403` | MEDIA user attempting to delete another user's post |
| `404` | Post not found |

---

### 8.6 `POST /posts/:id/media`

Uploads one or more additional images to an existing post. Images are appended to the post's media list.

**Auth required:** Yes
**Roles:** `ADMIN` (any post), `MEDIA` (own posts only)
**Content-Type:** `multipart/form-data`

#### Path parameters

| Parameter | Type | Description |
|---|---|---|
| `id` | `string` (UUID) | The post's unique identifier |

#### Form fields

| Field | Type | Required | Constraints |
|---|---|---|---|
| `images` | `File[]` | ✅ | 1–10 files, max 5 MB each. Types: `jpg`, `jpeg`, `png`, `gif`, `webp` |

#### Example request

```javascript
const formData = new FormData();
formData.append('images', newFile1);
formData.append('images', newFile2);

const response = await fetch(`/api/v1/posts/${postId}/media`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${accessToken}` },
  body: formData,
});
```

#### Success response — `201 Created`

```json
{
  "id": "p1p2p3...",
  "Media": [
    {
      "id": "m1...",
      "url": "https://res.cloudinary.com/...",
      "cloudinaryPublicId": "posts/uuid1",
      "type": "image/png",
      "postId": "p1p2p3..."
    },
    {
      "id": "m2...",
      "url": "https://res.cloudinary.com/...",
      "cloudinaryPublicId": "posts/uuid2",
      "type": "image/jpeg",
      "postId": "p1p2p3..."
    }
  ]
}
```

#### Error responses

| Status | When |
|---|---|
| `400` | Unsupported file type or file too large |
| `403` | MEDIA user attempting to add media to another user's post |
| `404` | Post not found |

---

### 8.7 `DELETE /posts/:id/media/:mediaId`

Removes a single media item from a post and permanently deletes the asset from Cloudinary.

**Auth required:** Yes
**Roles:** `ADMIN` (any post), `MEDIA` (own posts only)

#### Path parameters

| Parameter | Type | Description |
|---|---|---|
| `id` | `string` (UUID) | The post's unique identifier |
| `mediaId` | `string` (UUID) | The media item's unique identifier |

#### Success response — `204 No Content`

Empty body.

#### Error responses

| Status | When |
|---|---|
| `403` | MEDIA user attempting to remove media from another user's post |
| `404` | Post not found, or media item not found on this post |

---

## 9. Data Models

TypeScript interfaces for use in your frontend codebase.

```typescript
// ─── Enums ────────────────────────────────────────────────────────────────────

export type Role = 'ADMIN' | 'MEDIA' | 'VOLUNTEER';

export type PostStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

// ─── Auth ─────────────────────────────────────────────────────────────────────

/** Returned by /auth/me */
export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: Role[];
}

/** Returned by /auth/register and /auth/login */
export interface AuthResponse {
  user: UserProfile;
  accessToken: string;
  refreshToken: string;
}

/** Returned by /auth/refresh */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/** Full user profile returned by register/login */
export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  lastLoginAt: string | null;   // ISO 8601 datetime string
  createdAt: string;
  updatedAt: string;
  constituentName: string | null;
  profilePictureUrl: string | null;
  userRoles: UserRole[];
}

export interface UserRole {
  id: string;
  userId: string;
  role: Role;
  description: string | null;
}

// ─── Posts ────────────────────────────────────────────────────────────────────

export interface Post {
  id: string;
  title: string;
  subcontent: string | null;
  content: string;
  multilingualContent: MultilingualContentItem[] | null;
  authorId: string;
  status: PostStatus;
  createdAt: string;            // ISO 8601
  updatedAt: string;            // ISO 8601
  author: PostAuthor;
  Media: MediaItem[];
}

export interface PostAuthor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface MultilingualContentItem {
  language: string;             // e.g. "ENGLISH", "YORUBA", "IGBO", "HAUSA"
  title: string;
  content: string;
}

// ─── Media ────────────────────────────────────────────────────────────────────

export interface MediaItem {
  id: string;
  url: string;                  // Cloudinary secure_url — use directly in <img src>
  cloudinaryPublicId: string | null;
  type: string;                 // MIME type, e.g. "image/jpeg"
  postId: string | null;
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── DTOs (request payloads) ──────────────────────────────────────────────────

export interface RegisterPayload {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role?: Role;
  constituentName?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RefreshPayload {
  refreshToken: string;
}

export interface CreatePostPayload {
  title: string;
  content: string;
  subcontent?: string;
  status?: PostStatus;
  multilingualContent?: MultilingualContentItem[];
  images?: File[];              // browser File objects
}

export interface UpdatePostPayload {
  title?: string;
  content?: string;
  subcontent?: string;
  status?: PostStatus;
  multilingualContent?: MultilingualContentItem[];
  images?: File[];
}

// ─── API error shape ──────────────────────────────────────────────────────────

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error: string;
}
```

---

## 10. Frontend Integration Guide

### 10.1 Token management

Store tokens in memory (a module-level variable or React context/Zustand store). **Do not use `localStorage`** for the access token — it is accessible by any script on the page (XSS).

```typescript
// tokenStore.ts
let _accessToken: string | null = null;
let _refreshToken: string | null = null;

export const tokenStore = {
  set(access: string, refresh: string) {
    _accessToken  = access;
    _refreshToken = refresh;
  },
  getAccess()  { return _accessToken; },
  getRefresh() { return _refreshToken; },
  clear() {
    _accessToken  = null;
    _refreshToken = null;
  },
};
```

To survive page refreshes without `localStorage`, either:
- Store the **refresh token only** in a `sessionStorage` (cleared on tab close), or
- Accept that users must log in again after a hard refresh (common for sensitive dashboards).

---

### 10.2 Axios / Fetch setup

#### Axios with auto-refresh interceptor

```typescript
// api.ts
import axios, { AxiosError } from 'axios';
import { tokenStore } from './tokenStore';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1',
});

// ── Attach access token to every request ──────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = tokenStore.getAccess();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Auto-refresh on 401 ───────────────────────────────────────────────────────
let isRefreshing = false;
let waitQueue: Array<(token: string) => void> = [];

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config!;

    if (error.response?.status !== 401 || (original as any)._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Queue the failed request until the refresh completes
      return new Promise((resolve) => {
        waitQueue.push((newToken) => {
          original.headers.Authorization = `Bearer ${newToken}`;
          resolve(api(original));
        });
      });
    }

    isRefreshing = true;
    (original as any)._retry = true;

    try {
      const refreshToken = tokenStore.getRefresh();
      if (!refreshToken) throw new Error('No refresh token');

      const { data } = await api.post<{ accessToken: string; refreshToken: string }>(
        '/auth/refresh',
        { refreshToken },
      );

      tokenStore.set(data.accessToken, data.refreshToken);

      // Flush the queue
      waitQueue.forEach((cb) => cb(data.accessToken));
      waitQueue = [];

      // Retry the original request
      original.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(original);
    } catch {
      tokenStore.clear();
      window.location.href = '/login'; // redirect to login
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  },
);
```

---

### 10.3 Auth flow

#### Register

```typescript
import { api } from './api';
import { tokenStore } from './tokenStore';
import type { AuthResponse, RegisterPayload } from './types';

async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/register', payload);
  tokenStore.set(data.accessToken, data.refreshToken);
  return data;
}
```

#### Login

```typescript
async function login(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
  tokenStore.set(data.accessToken, data.refreshToken);
  return data;
}
```

#### Logout

```typescript
async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } finally {
    tokenStore.clear();
  }
}
```

#### Get current user

```typescript
import type { AuthUser } from './types';

async function getMe(): Promise<AuthUser> {
  const { data } = await api.get<AuthUser>('/auth/me');
  return data;
}
```

---

### 10.4 Uploading images

When creating or updating posts, build a `FormData` object. Do **not** set `Content-Type` manually — the browser automatically adds the `multipart/form-data` boundary.

#### Create a post with images

```typescript
import type { CreatePostPayload, Post } from './types';

async function createPost(payload: CreatePostPayload): Promise<Post> {
  const form = new FormData();

  form.append('title', payload.title);
  form.append('content', payload.content);

  if (payload.subcontent)  form.append('subcontent', payload.subcontent);
  if (payload.status)      form.append('status', payload.status);

  if (payload.multilingualContent) {
    form.append('multilingualContent', JSON.stringify(payload.multilingualContent));
  }

  payload.images?.forEach((file) => form.append('images', file));

  const { data } = await api.post<Post>('/posts', form);
  return data;
}
```

#### Update a post

```typescript
async function updatePost(id: string, payload: UpdatePostPayload): Promise<Post> {
  const form = new FormData();

  if (payload.title !== undefined)      form.append('title', payload.title);
  if (payload.content !== undefined)    form.append('content', payload.content);
  if (payload.subcontent !== undefined) form.append('subcontent', payload.subcontent);
  if (payload.status !== undefined)     form.append('status', payload.status);

  if (payload.multilingualContent !== undefined) {
    form.append('multilingualContent', JSON.stringify(payload.multilingualContent));
  }

  payload.images?.forEach((file) => form.append('images', file));

  const { data } = await api.patch<Post>(`/posts/${id}`, form);
  return data;
}
```

#### Delete a specific image from a post

```typescript
async function removeMediaFromPost(postId: string, mediaId: string): Promise<void> {
  await api.delete(`/posts/${postId}/media/${mediaId}`);
}
```

#### Display an image

The `Media[].url` field is a fully-formed Cloudinary HTTPS URL. Use it directly:

```tsx
// React example
{post.Media.map((media) => (
  <img key={media.id} src={media.url} alt={post.title} />
))}
```

---

### 10.5 Role-gating UI components

Use the user's `roles` array (from `GET /auth/me` or the login response) to conditionally render UI elements.

```typescript
// hooks/useAuth.ts  (React example — adapt to your state manager)
import { useState, useEffect } from 'react';
import type { AuthUser, Role } from '../types';
import { api } from '../api';

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    api.get<AuthUser>('/auth/me')
      .then((r) => setUser(r.data))
      .catch(() => setUser(null));
  }, []);

  const hasRole   = (role: Role)    => user?.roles.includes(role) ?? false;
  const isAdmin   = ()              => hasRole('ADMIN');
  const isMedia   = ()              => hasRole('MEDIA') || isAdmin();
  const canDelete = (authorId: string) =>
    isAdmin() || (isMedia() && user?.id === authorId);

  return { user, hasRole, isAdmin, isMedia, canDelete };
}
```

```tsx
// Usage in a component
function PostActions({ post }) {
  const { isMedia, canDelete } = useAuth();

  return (
    <>
      {isMedia() && <button onClick={() => openEditor(post)}>Edit</button>}
      {canDelete(post.authorId) && (
        <button onClick={() => deletePost(post.id)}>Delete</button>
      )}
    </>
  );
}
```

> **Important:** UI gating is for UX only. The server enforces all permissions independently. Never rely solely on frontend role checks for security.

---

## 11. Environment Variables

Copy `.env.example` to `.env` and fill in all values before starting the server.

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | ✅ | Long random secret for access tokens. Generate: `openssl rand -base64 64` |
| `JWT_REFRESH_SECRET` | ✅ | Separate long random secret for refresh tokens. Must differ from access secret. |
| `JWT_ACCESS_EXPIRES_IN` | ❌ | Access token lifetime. Default: `15m` |
| `JWT_REFRESH_EXPIRES_IN` | ❌ | Refresh token lifetime. Default: `7d` |
| `CLOUDINARY_CLOUD_NAME` | ✅ | Your Cloudinary cloud name (from Cloudinary Dashboard) |
| `CLOUDINARY_API_KEY` | ✅ | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | ✅ | Cloudinary API secret |
| `ALLOWED_ORIGINS` | ❌ | Comma-separated list of allowed CORS origins. Default: `http://localhost:3000` |
| `PORT` | ❌ | Server port. Default: `3000` |

### Quick setup

```bash
# 1. Copy env file
cp .env.example .env

# 2. Generate two separate JWT secrets
openssl rand -base64 64   # → paste into JWT_ACCESS_SECRET
openssl rand -base64 64   # → paste into JWT_REFRESH_SECRET

# 3. Run database migration
npx prisma migrate dev --name init

# 4. Start the dev server
npm run start:dev
```

---

*Generated against API version `v1`. Base path: `/api/v1`.*
