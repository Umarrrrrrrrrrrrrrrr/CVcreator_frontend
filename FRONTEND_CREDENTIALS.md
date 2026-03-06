# Frontend Integration Credentials

## API Base URL
```
http://localhost:8000
```

## Auth Header (Protected Endpoints)
```
Authorization: Bearer <access_token>
```

## Token Storage
- **Login/Register** → Store `tokens.access` and `tokens.refresh`
- **Store:** `localStorage.setItem('accessToken', tokens.access)`
- **Use:** `headers: { 'Authorization': \`Bearer ${token}\` }`

## Main Endpoints

| Endpoint | Method | Auth |
|----------|--------|------|
| `/api/register/` | POST | No |
| `/api/login/` | POST | No |
| `/api/auth/profile/` | GET / PUT | Yes |
| `/api/jobs/` | GET / POST | GET: No, POST: Yes |
| `/api/jobs/applications/` | POST | Yes |
| `/api/cv/grade/` | POST | No |
| `/api/payments/khalti/initiate/` | POST | No |
| `/api/payments/esewa/initiate/` | POST | No |

## CORS
Allowed origins: `localhost:3000`, `localhost:5173`, `localhost:8000` (and all origins when `DEBUG=True`).

## Quick Example

```javascript
import { getApiUrl, fetchWithAuth } from './config/api';

const token = localStorage.getItem('accessToken');

// Get profile (protected)
const res = await fetchWithAuth(`${getApiUrl('/api/auth/profile/')}`, {});
const data = await res.json();

// Or manually:
fetch(`${getApiUrl('/api/auth/profile/')}`, {
  headers: { 'Authorization': `Bearer ${token}` },
});
```

## Usage in Codebase
- **config/api.js** – `getApiUrl()`, `getAuthHeaders()`, `fetchWithAuth()`
- **AuthContext** – Stores `accessToken` on login/register, provides `getAccessToken()`
- **Profile** – GET/PUT `/api/auth/profile/` with Bearer token
- **Create_job** – POST `/api/jobs/` with `fetchWithAuth`
- **Search_job** – POST `/api/jobs/applications/` with `fetchWithAuth`
