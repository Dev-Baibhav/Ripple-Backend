# Ripple — Backend API Documentation

**Base URL:** `http://localhost:3000`  
**API Prefix:** `/api/auth`  
**Content-Type:** `application/json` (all requests and responses)

---

## Table of Contents

1. [Data Models](#data-models)
2. [Authentication Flow Overview](#authentication-flow-overview)
3. [Endpoints](#endpoints)
   - [Health Check](#1-health-check)
   - [Sign Up](#2-sign-up)
   - [Sign In](#3-sign-in)
   - [Verify OTP](#4-verify-otp)
   - [Resend OTP](#5-resend-otp)
   - [Forget Password — Request OTP](#6-forget-password--request-otp)
   - [Forget Password — Reset](#7-forget-password--reset)
4. [Error Reference](#error-reference)
5. [Notes](#notes)

---

## Data Models

### User

Stored in MongoDB via Mongoose.

| Field       | Type    | Required | Default | Description                          |
|-------------|---------|----------|---------|--------------------------------------|
| `username`  | String  | Yes      | —       | Display name. Whitespace is trimmed. |
| `email`     | String  | Yes      | —       | Must be unique across all users.     |
| `password`  | String  | Yes      | —       | Stored as plain text (no hashing applied yet). |
| `isVerified`| Boolean | No       | `false` | Set to `true` after OTP verification.|
| `isDeleted` | Boolean | No       | `false` | Soft-delete flag.                    |
| `createdAt` | Date    | Auto     | —       | Timestamp added by Mongoose.         |
| `updatedAt` | Date    | Auto     | —       | Timestamp added by Mongoose.         |

### OTP (Redis)

OTPs are stored in Redis keyed by the user's email address.

| Key     | Value              | TTL   |
|---------|--------------------|-------|
| `email` | 6-digit OTP string | 300 seconds (5 minutes) |

OTPs expire automatically after 5 minutes.

### JWT Token

Issued during Sign Up and Sign In (unverified users only).

| Claim       | Value                  |
|-------------|------------------------|
| `username`  | User's username        |
| `email`     | User's email           |
| `createdAt` | User's account creation timestamp |
| `expiresIn` | `360h` (15 days)       |

---

## Authentication Flow Overview

```
Sign Up ──► OTP sent to email ──► POST /otp (verify) ──► isVerified = true
Sign In (unverified) ──► OTP sent ──► POST /otp (verify)
Sign In (verified) ──► 202 Login Successful

Forgot Password ──► POST /forget-password-otp ──► POST /forget-password
```

---

## Endpoints

### 1. Health Check

Verify the auth router is reachable.

```
GET /api/auth/health
```

**Request Body:** None

**Response `200`**
```json
{
  "message": "Auth Route Is Healthy"
}
```

---

### 2. Sign Up

Create a new user account. Sends a 6-digit OTP to the provided email. Returns the created user object and a short-lived JWT token needed for OTP verification.

```
POST /api/auth/signup
```

**Request Body**

| Field      | Type   | Required | Description          |
|------------|--------|----------|----------------------|
| `username` | String | Yes      | User's display name  |
| `email`    | String | Yes      | User's email address |
| `password` | String | Yes      | User's password      |

```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "secret123"
}
```

**Response `201`** — Array: `[userObject, jwtToken]`

```json
[
  {
    "_id": "664f1a2b3c4d5e6f7a8b9c0d",
    "username": "john_doe",
    "email": "john@example.com",
    "password": "secret123",
    "isVerified": false,
    "isDeleted": false,
    "createdAt": "2026-05-18T14:00:00.000Z",
    "updatedAt": "2026-05-18T14:00:00.000Z",
    "__v": 0
  },
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
]
```

> **Next step:** Use the returned JWT token and the OTP received in email to call [POST /api/auth/otp](#4-verify-otp).

**Response `500`** — Server or database error
```json
{
  "message": "E11000 duplicate key error..."
}
```

---

### 3. Sign In

Authenticate an existing user.

- If the user **is verified** → returns user data with `202`.
- If the user **is not verified** → sends a new OTP to their email and returns a JWT token with `401`.

```
POST /api/auth/signin
```

**Request Body**

| Field      | Type   | Required | Description          |
|------------|--------|----------|----------------------|
| `email`    | String | Yes      | Registered email     |
| `password` | String | Yes      | Account password     |

```json
{
  "email": "john@example.com",
  "password": "secret123"
}
```

**Response `202`** — Login successful (verified user)
```json
{
  "message": "Login Sucessful",
  "user": {
    "_id": "664f1a2b3c4d5e6f7a8b9c0d",
    "username": "john_doe",
    "email": "john@example.com",
    "password": "secret123",
    "isVerified": true,
    "isDeleted": false,
    "createdAt": "2026-05-18T14:00:00.000Z",
    "updatedAt": "2026-05-18T14:00:00.000Z",
    "__v": 0
  }
}
```

**Response `401`** — Email not verified; OTP sent
```json
{
  "message": "Kindly Verify Your Email!!!",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

> **Next step:** Use the returned JWT token and the OTP received in email to call [POST /api/auth/otp](#4-verify-otp).

**Response `404`** — Missing fields
```json
{
  "message": "Incomplete Details"
}
```

**Response `500`** — Database error
```json
"error message string"
```

---

### 4. Verify OTP

Verify the OTP sent to the user's email. On success, sets `isVerified = true` on the user account.

```
POST /api/auth/otp
```

**Request Body**

| Field   | Type   | Required | Description                                      |
|---------|--------|----------|--------------------------------------------------|
| `token` | String | Yes      | JWT token received from `/signup` or `/signin`   |
| `email` | String | Yes      | The email address the OTP was sent to            |
| `otp`   | String | Yes      | 6-digit OTP received in email                    |

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "email": "john@example.com",
  "otp": "482910"
}
```

**Response `200`** — OTP verified successfully
```json
{
  "message": "Otp Verified Sucessfully"
}
```

**Response `401`** — Invalid OTP
```json
{
  "message": "Invalid OTP"
}
```

**Response `401`** — Email in token does not match request email
```json
{
  "message": "Invalid Email"
}
```

**Response `401`** — JWT token has expired (60s window passed)
```json
{
  "message": "JWT expired"
}
```

> **If the token expired:** Call [POST /api/auth/resend-otp](#5-resend-otp) to get a new OTP and a new token is **not** re-issued — you must sign in again to get a fresh token.

**Response `401`** — Malformed or invalid JWT
```json
{
  "message": "Invalid token"
}
```

**Response `501`** — Internal server error
```json
{
  "message": "Internal Server Error"
}
```

---

### 5. Resend OTP

Resend a new OTP to the user's email. The previous OTP is overwritten in Redis.

```
POST /api/auth/resend-otp
```

**Request Body**

| Field   | Type   | Required | Description                    |
|---------|--------|----------|--------------------------------|
| `email` | String | Yes      | Email to resend the OTP to     |

```json
{
  "email": "john@example.com"
}
```

**Response `200`**
```json
{
  "message": "OTP Resent Sucessfull"
}
```

> **Note:** This endpoint does not issue a new JWT token. If the original token has expired, the user must sign in again to get a fresh token before calling `/otp`.

---

### 6. Forget Password — Request OTP

Send an OTP to the user's email to begin the password reset flow.

```
POST /api/auth/forget-password-otp
```

**Request Body**

| Field   | Type   | Required | Description                        |
|---------|--------|----------|------------------------------------|
| `email` | String | Yes      | Email address of the account       |

```json
{
  "email": "john@example.com"
}
```

**Response `200`**
```json
{
  "message": "OTP Sent Sucessfully"
}
```

---

### 7. Forget Password — Reset

Reset the user's password using the OTP received from step 6. No JWT token is required for this flow.

```
POST /api/auth/forget-password
```

**Request Body**

| Field         | Type   | Required | Description                          |
|---------------|--------|----------|--------------------------------------|
| `email`       | String | Yes      | Email address of the account         |
| `otp`         | String | Yes      | 6-digit OTP received in email        |
| `newPassword` | String | Yes      | The new password to set              |

```json
{
  "email": "john@example.com",
  "otp": "391047",
  "newPassword": "newSecret456"
}
```

**Response `202`** — Password updated
```json
{
  "message": "Password Updated Sucessfully",
  "updatedUser": {
    "_id": "664f1a2b3c4d5e6f7a8b9c0d",
    "username": "john_doe",
    "email": "john@example.com",
    "password": "newSecret456",
    "isVerified": true,
    "isDeleted": false,
    "createdAt": "2026-05-18T14:00:00.000Z",
    "updatedAt": "2026-05-18T14:05:00.000Z",
    "__v": 0
  }
}
```

**Response `401`** — OTP does not match
```json
{
  "message": "Invalid OTP"
}
```

**Response `404`** — Missing required fields
```json
{
  "message": "Incomplete Details"
}
```

---

## Error Reference

| HTTP Status | Meaning                                                  |
|-------------|----------------------------------------------------------|
| `200`       | Success                                                  |
| `201`       | Resource created (Sign Up)                               |
| `202`       | Accepted / action completed (Sign In, Password Reset)    |
| `401`       | Unauthorized — invalid OTP, expired token, unverified    |
| `404`       | Bad request — missing required fields                    |
| `500`       | Internal server error — database or unexpected failure   |
| `501`       | Internal server error — OTP verification failure         |

---

## Notes

- **OTP TTL:** Every OTP expires after **5 minutes (300 seconds)** in Redis. After expiry, the user must request a new OTP via `/resend-otp` or `/forget-password-otp`.
- **JWT TTL:** Tokens issued during Sign Up / Sign In expire after **15 days (360 hours)**. They are only used for the `/otp` verification step.
- **Password storage:** Passwords are currently stored in plain text. The `bcrypt` package is listed as a dependency but not yet applied.
- **Email sender:** OTPs are sent via [Resend](https://resend.com) from `onboarding@resend.dev` with the subject **"Ripple Verification"**.
- **No auth middleware:** All current endpoints are public. No `Authorization` header is required.
- **Port:** Defaults to `3000` unless overridden by the `PORT` environment variable.
