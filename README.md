# AutoMailSender

A lightweight bulk email sender built with Express and Nodemailer.

## Features

- Send one message to multiple recipients
- Optional file attachment support (up to 10MB)
- Input validation for subject, message, and recipients
- Delivery summary with per-email failure details
- Single-server setup that also serves the frontend

## Requirements

- Node.js 18+
- A Gmail account with an App Password enabled

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create your environment file:

```bash
cp .env.example .env
```

3. Fill in `.env` values:

- `MAIL_USER`: sender Gmail address
- `MAIL_PASS`: Gmail app password
- `PORT`: server port (default `5000`)
- `ALLOWED_ORIGIN`: allowed CORS origin (`*` for local usage)

4. Start the app:

```bash
npm start
```

5. Open in browser:

- `http://localhost:5000`

## API

### `POST /send-mails`

FormData fields:

- `subject` (string, required)
- `message` (string, required)
- `emails` (JSON stringified array, required)
- `file` (optional attachment)

Success/partial response includes:

- `totalRecipients`
- `sentCount`
- `failedCount`
- `failures`

### `GET /health`

Returns app health and whether mail credentials are configured.
