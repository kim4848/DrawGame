# QA Review Report: Hearsay (Rygtet Går)
**Reviewer:** QA Tester (Paperclip Agent)  
**Date:** 2026-04-06  
**Project:** Multiplayer Drawing Game  
**Review Scope:** Authentication implementation, security fixes, accessibility compliance, and code quality

---

## Executive Summary

The Hearsay application has made significant progress with the addition of user authentication, security hardening, and WCAG AA accessibility compliance. However, **critical blockers** exist that prevent the application from running in production.

**Overall Status:** ⚠️ **BLOCKED - Critical Issues Must Be Resolved**

---

## Critical Issues (🔴 BLOCKERS)

### 1. Missing JWT_SECRET Environment Variable
**Severity:** 🔴 **CRITICAL - APPLICATION WILL NOT START**

**Location:** `.env`, `.env.example`

**Issue:**
- `JWT_SECRET` is required but not set in `.env`
- `.env.example` does not document this required variable
- `AuthService` constructor throws `InvalidOperationException` when `JWT_SECRET` is null

**Evidence:**
```bash
$ docker compose config
WARNING: The "JWT_SECRET" variable is not set. Defaulting to a blank string.
```

**Impact:** Backend service will crash immediately on startup.

**Fix Required:**
1. Add `JWT_SECRET=your-secret-key-here` to `.env.example`
2. Set a strong random value in `.env` (minimum 32 characters)
3. Document in README/CLAUDE.md

---

### 2. Non-Existent API Endpoint
**Severity:** 🔴 **CRITICAL - BREAKS SESSION VALIDATION**

**Location:** `frontend/src/api.ts:190`

**Issue:**
- Frontend calls `GET /api/auth/session` which does not exist
- Backend only provides `GET /api/auth/me`

**Code:**
```typescript
// frontend/src/api.ts:190
const res = await fetch(`${BASE}/api/auth/session`, {
  headers: { 'Authorization': `Bearer ${token}` },
});
```

**Backend endpoints available:**
- ✅ `POST /api/auth/register`
- ✅ `POST /api/auth/login`
- ✅ `GET /api/auth/me` (requires auth)
- ❌ `GET /api/auth/session` (DOES NOT EXIST)

**Impact:** Session validation will always fail with 404, breaking persistent login.

**Fix Required:**
Change `api.ts:190` to call `/api/auth/me` instead of `/api/auth/session`.

---

### 3. Password Validation Inconsistency
**Severity:** 🟡 **HIGH - SECURITY & UX ISSUE**

**Location:** `frontend/src/pages/Register.tsx:17-32` vs `backend/Hearsay.Api/Endpoints/AuthEndpoints.cs:23-26`

**Issue:**
- **Frontend validation:** 8+ chars, uppercase, lowercase, number
- **Backend validation:** Only 8+ chars minimum

**Impact:**
- Users can bypass frontend validation with direct API calls
- Weak passwords (e.g., "12345678") are accepted
- Security vulnerability

**Fix Required:**
Implement matching server-side password complexity validation in `AuthEndpoints.cs`.

---

## High Priority Issues (🟡)

### 4. JWT Tokens Stored in localStorage
**Severity:** 🟡 **HIGH - XSS VULNERABILITY**

**Location:** `frontend/src/pages/Login.tsx:21`, `Register.tsx:66`

**Issue:**
- JWT tokens stored in localStorage are vulnerable to XSS attacks
- Any injected script can steal tokens and impersonate users

**Current implementation:**
```typescript
localStorage.setItem('authToken', response.token);
```

**Best Practice:** Use httpOnly cookies for JWT storage.

**Recommendation:**
- Move to httpOnly cookies with SameSite=Strict
- OR implement token refresh with short-lived access tokens
- Document the security tradeoff if localStorage is intentional

---

### 5. No Rate Limiting on Auth Endpoints
**Severity:** 🟡 **HIGH - SECURITY VULNERABILITY**

**Location:** `backend/Hearsay.Api/Endpoints/AuthEndpoints.cs`

**Issue:**
- No rate limiting on `/api/auth/login` or `/api/auth/register`
- Vulnerable to brute force attacks and registration spam

**Recommendation:**
- Implement rate limiting middleware (e.g., AspNetCoreRateLimit)
- Add account lockout after N failed attempts
- Consider CAPTCHA for registration

---

### 6. Long JWT Expiration Time
**Severity:** 🟡 **MEDIUM - SECURITY CONSIDERATION**

**Location:** `docker-compose.yml:15`

**Issue:**
- JWT tokens expire after 7 days (168 hours)
- Stolen tokens remain valid for extended period

**Current:**
```yaml
JWT_EXPIRATION_HOURS: 168
```

**Recommendation:**
- Reduce to 1-2 hours for access tokens
- Implement refresh tokens for longer sessions
- OR document business justification for 7-day tokens

---

## Security Assessment ✅

### Strengths Identified

1. **✅ BCrypt Password Hashing**
   - Uses BCrypt.Net-Next v4.1.0
   - Proper salting and work factor
   - Location: `backend/Hearsay.Api/Services/AuthService.cs:24-30`

2. **✅ CORS Security Fix** (Commit: 0354fa6)
   - Replaced wildcard with explicit origins
   - Configurable via `ALLOWED_ORIGINS`
   - Location: `backend/Hearsay.Api/Program.cs:41-52`

3. **✅ File Upload Validation** (Commit: 0354fa6)
   - 5 MB file size limit
   - PNG magic byte validation
   - Location: `backend/Hearsay.Api/Endpoints/DrawingsEndpoints.cs:23-30`

4. **✅ Path Traversal Prevention** (Commit: 0354fa6)
   - Validated in `BlobStorageService.GetLocalFilePath()`

5. **✅ SQL Injection Prevention**
   - Parameterized queries throughout `DuckDbService.cs`
   - Proper use of `DuckDBParameter`

6. **✅ Email Case-Insensitive Lookup**
   - Emails normalized to lowercase
   - Location: `DuckDbService.cs:498, 514`

7. **✅ JWT Validation**
   - ValidateIssuer, ValidateAudience, ValidateLifetime all enabled
   - Location: `Program.cs:26-36`

---

## Accessibility Assessment ✅

### WCAG AA Compliance (Commit: 3ca31bc)

1. **✅ Language Declaration**
   - `<html lang="da">` set in `index.html`

2. **✅ Color Contrast**
   - Fixed text-warm-light → text-warm-mid for 4.5:1 ratio
   - Meets WCAG AA standard

3. **✅ Keyboard Navigation**
   - Focus trap implemented for modals (`useFocusTrap` hook)
   - Escape key closes modals
   - Skip links added (`SkipLink.tsx`)

4. **✅ ARIA Labels**
   - Error messages use `role="alert"`
   - Proper form labels with `htmlFor`

5. **✅ Touch Target Sizes**
   - Minimum 44px height on interactive elements
   - Example: `min-h-[44px]` in Home.tsx

6. **✅ Reduced Motion Support**
   - `@media (prefers-reduced-motion)` in CSS

7. **✅ Semantic HTML**
   - Proper heading hierarchy
   - Main landmark with `id="main-content"`

---

## Code Quality Observations

### Positive

1. **✅ TypeScript Usage**
   - Strong typing throughout frontend
   - Proper interfaces in `types.ts`

2. **✅ Error Handling**
   - Network retry with exponential backoff
   - Toast notifications for user feedback
   - Location: `utils/network.ts`, `store/toastStore.ts`

3. **✅ Clean Separation of Concerns**
   - Endpoints in dedicated files
   - Services for business logic
   - React hooks for UI logic

4. **✅ Database Concurrency Control**
   - `SemaphoreSlim(1,1)` for DuckDB single-writer
   - Proper async/await patterns

5. **✅ Danish UI Text** (per spec)
   - All error messages in Danish
   - Consistent throughout UI

### Areas for Improvement

1. **⚠️ No Email Verification**
   - Users can register with any email
   - No confirmation flow

2. **⚠️ No "Forgot Password" Flow**
   - Users cannot reset passwords
   - Would require email infrastructure

3. **⚠️ No User Management**
   - No delete account
   - No change password
   - No view/manage sessions

4. **⚠️ Database Migrations**
   - Using `ADD COLUMN IF NOT EXISTS` in InitializeAsync
   - Should consider proper migration tooling for production

5. **⚠️ No Logging/Monitoring**
   - No structured logging for auth events
   - No failed login tracking
   - No audit trail

---

## Test Coverage

### Manual Testing Performed

| Test Case | Status | Notes |
|-----------|--------|-------|
| Backend build | ⚠️ | Will fail without JWT_SECRET |
| Frontend build | ✅ | TypeScript compiles |
| Docker compose validation | ⚠️ | Missing JWT_SECRET warning |
| Code review: Auth endpoints | ✅ | Logic appears sound |
| Code review: Security fixes | ✅ | Verified in commit 0354fa6 |
| Code review: Accessibility | ✅ | Verified in commit 3ca31bc |
| API endpoint consistency | ❌ | `/api/auth/session` mismatch |

### Recommended Additional Testing

- [ ] Integration test: Full registration → login flow
- [ ] Security test: SQL injection attempts
- [ ] Security test: XSS attempts in user input
- [ ] Security test: CSRF token implementation (if using forms)
- [ ] Load test: Auth endpoint performance
- [ ] Accessibility audit: Automated tools (axe, WAVE)
- [ ] Manual accessibility test: Screen reader navigation
- [ ] Browser compatibility: Chrome, Firefox, Safari, Edge

---

## Recommendations by Priority

### Must Fix Before Deploy (🔴)

1. Set `JWT_SECRET` environment variable
2. Fix `/api/auth/session` endpoint mismatch
3. Add server-side password complexity validation

### Should Fix Soon (🟡)

4. Move JWT tokens to httpOnly cookies OR document XSS risk
5. Implement rate limiting on auth endpoints
6. Consider shorter JWT expiration times
7. Add email verification (if email is meaningful)
8. Implement password reset flow

### Nice to Have (🟢)

9. Add user management features (change password, delete account)
10. Implement proper database migration system
11. Add structured logging for security events
12. Add monitoring/alerting for auth failures
13. Consider 2FA/MFA for enhanced security
14. Add session management (view/revoke active sessions)

---

## Recent Commits Assessment

### ✅ Commit 0354fa6 - Security Fixes
**Grade: A**
- Fixed path traversal vulnerability
- Replaced CORS wildcard with explicit origins
- Added file upload validation (size + magic bytes)

### ✅ Commit 3ca31bc - Accessibility
**Grade: A**
- Full WCAG AA compliance implemented
- Keyboard navigation
- Focus management
- Color contrast fixes

### ✅ Commit 0eab20c - Network Resilience
**Grade: B+**
- Retry logic with exponential backoff
- Proper error handling
- Good UX with toast notifications

---

## Compliance Checklist

### Security
- [x] Password hashing (BCrypt)
- [x] SQL injection prevention (parameterized queries)
- [x] CORS configuration
- [x] File upload validation
- [x] Path traversal prevention
- [ ] Rate limiting (MISSING)
- [ ] Account lockout (MISSING)
- [ ] CSRF protection (NOT EVALUATED)
- [x] Input validation (partial)

### Accessibility (WCAG AA)
- [x] Language declaration
- [x] Color contrast 4.5:1
- [x] Keyboard navigation
- [x] Focus management
- [x] ARIA labels
- [x] Touch target sizes
- [x] Reduced motion support
- [x] Semantic HTML

### Code Quality
- [x] TypeScript types
- [x] Error handling
- [x] Code organization
- [x] Danish UI text (per spec)
- [ ] Unit tests (MISSING)
- [ ] Integration tests (MISSING)
- [ ] API documentation (MINIMAL)

---

## Conclusion

The Hearsay application demonstrates strong engineering practices with well-implemented accessibility, good security fundamentals, and clean code architecture. The authentication system is mostly well-designed but has **critical blockers** that must be resolved before production deployment.

**Action Required:**
1. Set JWT_SECRET environment variable
2. Fix API endpoint mismatch (/api/auth/session → /api/auth/me)
3. Align password validation between frontend and backend

Once these critical issues are resolved, the application will be ready for staging deployment with a plan to address the high-priority security concerns.

**Recommended Next Steps:**
1. Create issues for each critical/high item
2. Add integration test suite for auth flows
3. Set up security monitoring/alerting
4. Document security decisions (localStorage, token expiration)
5. Plan for email verification and password reset features

---

**QA Status:** ⚠️ **BLOCKED** - Critical issues must be fixed before deployment

**Reviewed by:** QA Tester Agent  
**Paperclip Issue:** [LET-20](/LET/issues/LET-20)
