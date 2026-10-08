# Prescripto API Documentation

Base URL: `http://localhost:5000/api`

**Authentication:** send the JWT from login/register as a header:

```
Authorization: Bearer <token>
```

The token only contains the user id. The user's **role is always read from the database** on each request, so a role sent by the frontend is never trusted.

**Roles:** `patient` (created by sign-up), `doctor` (created by an admin), `admin` (created by the seed script).

**Errors** always look like this. No stack traces or secrets are ever returned.

```json
{ "success": false, "message": "Human-readable reason" }
```

| Status | Meaning |
|---|---|
| 400 | Invalid input (bad id, date, status, …) |
| 401 | Not logged in / invalid or expired token |
| 403 | Logged in, but this role is not allowed (or the account is deactivated) |
| 404 | Not found, or you are not allowed to see it |
| 409 | Conflict (email already used, slot already booked, …) |
| 429 | Too many requests (rate limit) |

---

## 1. Authentication

### POST `/auth/register`
Public. Max 10 *failed* attempts per IP per 15 minutes. Always creates a **patient**; a `role` field in the body is ignored.

```json
// request
{ "name": "Aarav Shah", "email": "aarav@example.com", "password": "at-least-8-chars" }
// 201 response
{ "success": true, "token": "eyJhbGciOi...", "user": { "_id": "...", "name": "Aarav Shah", "email": "aarav@example.com", "role": "patient", "image": "" } }
```

### POST `/auth/login`
Public, with the same rate limit. One endpoint for patients, doctors and admins.

```json
// request
{ "email": "aarav@example.com", "password": "..." }
// 200 response
{ "success": true, "token": "eyJhbGciOi...", "user": { "_id": "...", "name": "Aarav Shah", "email": "aarav@example.com", "role": "patient", "image": "" } }
```

Wrong email or password returns `401`. A deactivated account returns `403`.

### GET `/auth/me`
Any logged-in user. Returns the current user; doctors also get `doctorProfile`.

```json
{ "success": true, "user": { "_id": "...", "name": "Dr. Richard James", "role": "doctor", "email": "...", "image": "" },
  "doctorProfile": { "_id": "...", "name": "Dr. Richard James", "specialty": "General Physician" } }
```

---

## 2. User profile

### GET `/users/profile`
Any logged-in user.

```json
{ "success": true, "user": { "_id": "...", "name": "...", "email": "...", "role": "patient", "phone": "9000000001",
  "gender": "Male", "dob": "2000-01-31", "address": { "line1": "", "line2": "" }, "image": "", "isActive": true } }
```

### PUT `/users/profile`
Any logged-in user. Accepts JSON or `multipart/form-data` (with an optional `image` file: JPG/PNG/WEBP, max 2 MB). Only `name`, `phone`, `gender`, `dob` and `address` can be changed. Email and role cannot.

```json
// request (JSON)
{ "name": "Aarav Shah", "phone": "9876543210", "gender": "Male", "dob": "2000-01-31", "address": { "line1": "12 Main St", "line2": "Pune" } }
// 200 response
{ "success": true, "message": "Profile updated", "user": { ... } }
```

---

## 3. Doctors

Public responses only include safe fields. They never include the doctor's email or linked account.

### GET `/doctors`
Public. Lists **active** doctors only. All query parameters are optional:

| Query | Example | Meaning |
|---|---|---|
| `specialty` | `Dermatologist` | One of the 8 supported specialties |
| `search` | `sarah` | Name or specialty contains (case-insensitive) |
| `available` | `true` | Only doctors accepting bookings |
| `date` | `2026-10-05` | Only doctors who work on that weekday |
| `gender` | `Female` | |

```json
{ "success": true, "count": 2, "doctors": [
  { "_id": "...", "name": "Dr. Sarah Patel", "specialty": "Dermatologist", "photo": "/uploads/doctors/doc3.png",
    "degree": "MBBS", "experience": 1, "fees": 30, "about": "...", "gender": "Female", "languages": ["English", "Hindi"],
    "address": { "line1": "37th Cross, Richmond", "line2": "Circle, Ring Road, London" },
    "available": true, "workingDays": [1,2,3,4,5,6], "startTime": "10:00", "endTime": "18:00" } ] }
```

### GET `/doctors/specialties`
Public. Returns the controlled specialty list with active-doctor counts.

```json
{ "success": true, "specialties": [ { "name": "General Physician", "doctorCount": 3 }, { "name": "Dermatologist", "doctorCount": 2 } ] }
```

### GET `/doctors/:id`
Public. Returns one active doctor (same fields as above) as `{ "success": true, "doctor": { ... } }`. Returns `404` if the doctor is inactive or unknown.

### GET `/doctors/:id/slots?date=YYYY-MM-DD`
Public. Every 30-minute slot of that day, with whether it is taken. Slots that have already passed today are hidden.

```json
{ "success": true, "date": "2026-10-05", "slots": [ { "time": "10:00", "isBooked": false }, { "time": "10:30", "isBooked": true } ] }
```

### POST `/doctors`
**Admin.** JSON or `multipart/form-data` (optional `image`). If `accountPassword` is given, a doctor login account is created too (this requires `email`).

```json
// request
{ "name": "Dr. Jane Doe", "specialty": "Cardiologist", "fees": 80, "experience": 6, "email": "jane@example.com",
  "accountPassword": "doctorpass1", "degree": "MD", "gender": "Female", "languages": "English, Hindi",
  "address": { "line1": "...", "line2": "..." }, "workingDays": "1,2,3,4,5", "startTime": "09:00", "endTime": "17:00", "available": true, "about": "..." }
// 201 response
{ "success": true, "message": "Doctor added", "doctor": { ... } }
```

### PUT `/doctors/:id`
**Admin.** Same fields as POST, all optional: `{ "success": true, "message": "Doctor updated", "doctor": { ... } }`.

### PATCH `/doctors/:id/status`
**Admin.** Activate or deactivate. Deactivated doctors are hidden from patients and the AI finder.

```json
// request
{ "isActive": false }
// 200 response
{ "success": true, "message": "Doctor deactivated", "doctor": { ... } }
```

### DELETE `/doctors/:id`
**Admin.** Returns `{ "success": true, "message": "Doctor deleted" }`. A doctor **with appointment history cannot be deleted** (`409`), so the admin should deactivate them instead.

### GET `/doctors/me/profile`, PUT `/doctors/me/profile`
**Doctor.** View or edit your own profile. Editable fields: `about`, `fees`, `phone`, `languages`, `address`, `available`, `workingDays`, `startTime`, `endTime`. Name and specialty are managed by the admin.

---

## 4. Appointments

Statuses: `booked` → `confirmed` → `completed`. An appointment can be `cancelled` while it is booked or confirmed.

### POST `/appointments`
**Patient.** Validates that:
- the date is valid, not in the past, and at most 60 days ahead
- the doctor is active and accepting bookings
- the doctor works on that weekday
- the time is a real 30-minute slot that hasn't already passed

**Double booking** is blocked by the code *and* by a unique database index, so two simultaneous requests can't both succeed. A patient also can't be in two appointments at the same time.

```json
// request
{ "doctorId": "6abf...", "date": "2026-10-05", "time": "10:30", "reason": "Acne on face" }
// 201 response
{ "success": true, "message": "Appointment booked", "appointment": { "_id": "...", "user": "...", "doctor": "...",
  "name": "Aarav Shah", "email": "aarav@example.com", "phone": "...", "date": "2026-10-05", "time": "10:30",
  "reason": "Acne on face", "fees": 30, "status": "booked", "cancelledBy": null } }
// 409 response
{ "success": false, "message": "This time slot is already booked. Please choose another slot." }
```

### GET `/appointments`
**Patient.** Your own appointments, newest first, with doctor details populated.

```json
{ "success": true, "appointments": [ { "_id": "...", "date": "2026-10-05", "time": "10:30", "status": "booked",
  "doctor": { "name": "Dr. Sarah Patel", "specialty": "Dermatologist", "photo": "...", "fees": 30, "address": { ... } } } ] }
```

### GET `/appointments/doctor?status=&date=`
**Doctor.** Appointments with the logged-in doctor only. Returns `{ "success": true, "appointments": [ ... ] }`.

### GET `/appointments/:id`
The **patient** who booked it, the **doctor** it is with, or an **admin**. Anyone else gets `404`. Returns `{ "success": true, "appointment": { ... } }`.

### PATCH `/appointments/:id/cancel`
Patient (own, upcoming only), doctor (own) or admin. Records who cancelled.

```json
{ "success": true, "message": "Appointment cancelled", "appointment": { "status": "cancelled", "cancelledBy": "patient", ... } }
```

### PATCH `/appointments/:id/status`
**Doctor** (own appointments) or **admin**. Only allowed transitions succeed, and `completed` is only possible after the start time.

```json
// request
{ "status": "confirmed" }
// 200 response
{ "success": true, "message": "Appointment confirmed", "appointment": { ... } }
```

---

## 5. Admin

All routes require an **admin** token. Patients and doctors get `403`.

### GET `/admin/stats`
Dashboard numbers.

```json
{ "success": true,
  "stats": { "totalPatients": 5, "totalDoctors": 15, "activeDoctors": 15, "totalAppointments": 34, "activeAppointments": 10,
    "byStatus": { "booked": 7, "confirmed": 3, "completed": 22, "cancelled": 2 },
    "bySpecialty": [ { "specialty": "Cardiologist", "count": 9 } ],
    "bookingsLast14Days": [ { "date": "2026-09-19", "count": 2 } ] },
  "latestAppointments": [ { "_id": "...", "name": "Priya Mehta", "date": "2026-10-05", "time": "10:00", "status": "booked", "doctor": { "name": "...", "specialty": "...", "photo": "..." } } ] }
```

### GET `/admin/doctors?search=&specialty=&status=active|inactive`
All doctors, **including inactive ones and their emails**: `{ "success": true, "count": 15, "doctors": [ ... ] }`.

### GET `/admin/doctors/:id`
One doctor's full record (used by the edit form), including the linked account email.

### GET `/admin/users?search=&role=&status=&page=1&limit=20`
```json
{ "success": true, "users": [ { "_id": "...", "name": "...", "email": "...", "role": "patient", "isActive": true, "createdAt": "..." } ],
  "total": 21, "page": 1, "pages": 2 }
```

### GET `/admin/users/:id`
```json
{ "success": true, "user": { ... },
  "appointmentCounts": { "booked": 1, "confirmed": 0, "completed": 3, "cancelled": 0 },
  "recentAppointments": [ { "date": "...", "time": "...", "status": "...", "doctor": { "name": "...", "specialty": "..." } } ] }
```

### PATCH `/admin/users/:id/status`
Admins cannot deactivate themselves or other admins. A deactivated user is locked out immediately, even if they still hold a valid token.

```json
// request
{ "isActive": false }
// 200 response
{ "success": true, "message": "User deactivated", "user": { ... } }
```

### GET `/admin/appointments?status=&doctor=&date=&from=&to=&search=&page=&limit=`
All appointments, filtered and paginated: `{ "success": true, "appointments": [ ... ], "total": 34, "page": 1, "pages": 2 }`.

To change an appointment's status or cancel it, the admin uses the normal `PATCH /appointments/:id/status` and `PATCH /appointments/:id/cancel` endpoints. There are no duplicate admin versions.

### POST `/admin/ai-insights`
Rate-limited. The server aggregates the numbers first, and **only anonymous counts** are sent to the AI (no names, emails or phone numbers).

```json
{ "success": true, "aiAvailable": true, "generatedAt": "2026-10-02T06:25:25.058Z",
  "insights": { "summary": "The system recorded a total of 34 appointments ...",
                "highlights": ["Cardiologist is the most popular specialty with 9 appointments.", "The overall cancellation rate is approximately 5.88%."] } }
```

If the AI is unavailable, it returns `{ "success": true, "aiAvailable": false, "message": "AI insights are temporarily unavailable. ..." }`.

---

## 6. AI Doctor / Department Finder

### POST `/ai/doctor-finder`
Public (no login needed). Rate limit: `AI_RATE_LIMIT_PER_MINUTE` requests per IP per minute (default 10).

```json
// request (3–500 characters)
{ "message": "I have acne and skin irritation" }
```

How the backend handles a request:
1. Validates and cleans the text.
2. Checks it for emergency keywords itself, independently of the AI.
3. Builds the allowed list from the specialties that have active doctors in MongoDB.
4. Asks Gemini for structured JSON whose `specialty` must be one of those values.
5. Re-checks the answer: an unknown specialty becomes General Physician, and a reason containing diagnosis or dosage wording is replaced with neutral text.
6. Loads the doctors **from MongoDB**.

```json
// 200 response - AI available
{ "success": true, "aiAvailable": true,
  "message": "Based on what you've described, a Dermatologist may be an appropriate starting point.",
  "specialty": "Dermatologist", "confidence": "high",
  "reason": "A dermatologist can help with skin concerns such as acne and irritation.",
  "needsUrgentCare": false, "urgentMessage": null,
  "disclaimer": "This is not a medical diagnosis. ...",
  "doctors": [ { "_id": "...", "name": "Dr. Sarah Patel", "specialty": "Dermatologist", "fees": 30, ... } ] }
```

```json
// 200 response - emergency-like text ("I have chest pain")
{ "...": "...", "specialty": "Cardiologist", "needsUrgentCare": true,
  "urgentMessage": "Some of what you described may need urgent attention. If symptoms are severe, sudden or getting worse, please call your local emergency number ..." }
```

```json
// 200 response - not a health question ("write me a poem")
{ "success": true, "aiAvailable": true, "specialty": null, "doctors": [],
  "message": "Please describe a health concern or symptom, and we'll suggest the right type of doctor." }
```

```json
// 200 response - AI down / timeout / no key (doctor search and booking keep working)
{ "success": true, "aiAvailable": false, "specialty": null, "doctors": [],
  "message": "AI assistance is temporarily unavailable. You can browse doctors by specialty.",
  "needsUrgentCare": false, "urgentMessage": null, "disclaimer": "..." }
```

---

## 7. Other

- `GET /health` returns `{ "success": true, "status": "ok" }`.
- `GET /uploads/doctors/<file>` and `GET /uploads/users/<file>` serve uploaded images.
