import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { PNG } from 'pngjs';
import { db } from '../src/repositories/db.ts';
import { seedDatabaseIfEmpty } from '../src/jobs/seed.ts';
import { createApiApp } from '../src/app.ts';
import { env } from '../src/config/env.ts';

process.env.NODE_ENV = 'test';
process.env.AI_PROVIDER = 'mock';

const app = createApiApp({ disableRateLimit: true });

let studentToken = '';
let student2Token = '';
let volunteerToken = '';
let adminToken = '';
let superAdminToken = '';

beforeAll(async () => {
  await db.connect({ memoryOnly: true });
  db.resetMemory();
  await seedDatabaseIfEmpty();

  // Seed a secondary tenant campus + student + report for strict isolation tests
  await db.insert('campuses', {
    id: 'campus_second',
    institutionId: 'inst_second',
    name: 'Secondary Test Campus',
    code: 'SEC',
    centerLat: 23.75,
    centerLng: 90.41,
    defaultZoom: 17,
    graphVersion: 1,
    isDemoData: true,
    accessibilityScore: 70,
  });
  await db.insert('accessibilityReports', {
    id: 'rep_second_001',
    campusId: 'campus_second',
    reporterId: 'usr_student_second',
    reporterAlias: 'Student Sec',
    title: 'Second campus locked ramp',
    description: 'Gate blocking second campus west ramp.',
    language: 'en',
    category: 'blocked_walkway',
    priority: 'high',
    status: 'verified',
    locationLabel: 'Second West Gate',
    evidenceUrls: [],
    upvotes: 1,
    upvoterIds: [],
    timeline: [],
    comments: [],
    isDemoData: true,
  });
});

describe('AccessPath API Security, Auth, CSRF, Tenant Isolation & Production Safety', () => {
  it('1. rejects unauthenticated requests to protected endpoints (401)', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('2. rejects invalid JWT bearer tokens (401)', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer invalid.jwt.token');
    expect(res.status).toBe(401);
  });

  it('authenticates seeded student, volunteer, campus_admin, and super_admin accounts', async () => {
    const sRes = await request(app).post('/api/v1/auth/login').send({
      email: 'student.demo@accesspath.example.edu',
      password: 'AccessPathDemo!2026',
    });
    expect(sRes.status).toBe(200);
    studentToken = sRes.body.data.token;

    const vRes = await request(app).post('/api/v1/auth/login').send({
      email: 'volunteer.demo@accesspath.example.edu',
      password: 'AccessPathDemo!2026',
    });
    expect(vRes.status).toBe(200);
    volunteerToken = vRes.body.data.token;

    const aRes = await request(app).post('/api/v1/auth/login').send({
      email: 'admin.demo@accesspath.example.edu',
      password: 'AccessPathDemo!2026',
    });
    expect(aRes.status).toBe(200);
    adminToken = aRes.body.data.token;

    const saRes = await request(app).post('/api/v1/auth/login').send({
      email: 'superadmin.demo@accesspath.example.edu',
      password: 'AccessPathDemo!2026',
    });
    expect(saRes.status).toBe(200);
    superAdminToken = saRes.body.data.token;

    const regRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Temp Transfer Student',
      email: 'transfer.student@accesspath.example.edu',
      password: 'StrongPassword!2026',
      role: 'student',
      campusId: 'campus_demo_north',
    });
    expect(regRes.status).toBe(201);
    student2Token = regRes.body.data.token;
  });

  it('authorizes the digital-twin simulator by role and campus, and leaves the stored graph untouched', async () => {
    const seedEdge = (await db.find<any>('pathEdges', { campusId: 'campus_demo_north' }))[0];
    expect(seedEdge).toBeTruthy();
    const body = {
      campusId: 'campus_demo_north',
      edgeId: seedEdge.id,
      action: 'closed',
      routePairs: [{ fromNodeId: seedEdge.fromNodeId, toNodeId: seedEdge.toNodeId }],
    };

    const studentDenied = await request(app)
      .post('/api/v1/admin/accessibility-twin/simulate')
      .set('Authorization', `Bearer ${studentToken}`)
      .send(body);
    expect(studentDenied.status).toBe(403);

    const crossCampusDenied = await request(app)
      .post('/api/v1/admin/accessibility-twin/simulate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...body, campusId: 'campus_second' });
    expect(crossCampusDenied.status).toBe(403);

    const simulation = await request(app)
      .post('/api/v1/admin/accessibility-twin/simulate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(body);
    expect(simulation.status).toBe(200);
    expect(simulation.body.data.simulationOnly).toBe(true);
    expect(simulation.body.data.verificationPreserved).toBe(true);
    const persistedAfter = await db.findOne<any>('pathEdges', { id: seedEdge.id, campusId: 'campus_demo_north' });
    expect(persistedAfter.status).toBe(seedEdge.status);
    expect(persistedAfter.temporaryClosure).toBe(seedEdge.temporaryClosure);
  });

  it('3. enforces strict double-submit CSRF & Origin checks on cookie-authenticated mutations', async () => {
    const agent = request.agent(app);
    const loginRes = await agent.post('/api/v1/auth/login').send({
      email: 'student.demo@accesspath.example.edu',
      password: 'AccessPathDemo!2026',
    });
    expect(loginRes.status).toBe(200);
    const cookies = loginRes.headers['set-cookie'] as unknown as string[];
    const csrfCookieLine = cookies.find((c) => c.startsWith('accesspath_csrf='));
    expect(csrfCookieLine).toBeTruthy();
    const csrfToken = decodeURIComponent(csrfCookieLine!.split(';')[0].split('=')[1]);

    // Cookie sent WITHOUT matching X-CSRF-Token header -> 403
    const noCsrf = await agent
      .patch('/api/v1/auth/profile')
      .send({ name: 'Should Be Blocked Without CSRF' });
    expect(noCsrf.status).toBe(403);

    // Mismatched Origin header -> 403
    const badOrigin = await agent
      .patch('/api/v1/auth/profile')
      .set('X-CSRF-Token', csrfToken)
      .set('Origin', 'https://evil-attacker.example')
      .send({ name: 'Should Be Blocked Bad Origin' });
    expect(badOrigin.status).toBe(403);

    // Valid double-submit CSRF + allowed Origin -> 200
    const okRes = await agent
      .patch('/api/v1/auth/profile')
      .set('X-CSRF-Token', csrfToken)
      .set('Origin', 'http://localhost:3000')
      .send({ name: 'Demo Student Updated' });
    expect(okRes.status).toBe(200);
  });

  it('4. enforces server-side session revocation upon logout (401 on revoked JWT)', async () => {
    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'student.demo@accesspath.example.edu',
      password: 'AccessPathDemo!2026',
    });
    const sessionJwt = loginRes.body.data.token;

    const beforeLogout = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${sessionJwt}`);
    expect(beforeLogout.status).toBe(200);

    const logoutRes = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${sessionJwt}`);
    expect(logoutRes.status).toBe(200);

    const afterLogout = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${sessionJwt}`);
    expect(afterLogout.status).toBe(401);
  });

  it('5. password reset tokens are hashed, single-use, expire cleanly, and revoke old sessions; forgot-password is honest when email is unconfigured', async () => {
    // Unconfigured email provider refuses to pretend email was sent
    const forgotHonest = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'transfer.student@accesspath.example.edu' });
    expect(forgotHonest.status).toBe(503);

    // Issue deterministic reset token hash & verify single-use + session revocation
    const { generateSecureToken, hashSecurityToken } = await import('../src/middleware/auth.ts');
    const rawResetToken = generateSecureToken(24);
    await db.updateOne(
      'users',
      { email: 'transfer.student@accesspath.example.edu' },
      {
        resetTokenHash: hashSecurityToken(rawResetToken),
        resetTokenExpiresAt: new Date(Date.now() + 600_000).toISOString(),
      }
    );

    const userRec = await db.findOne<any>('users', {
      email: 'transfer.student@accesspath.example.edu',
    });
    expect(userRec.resetTokenHash).not.toBe(rawResetToken);

    const resetOk = await request(app).post('/api/v1/auth/reset-password').send({
      token: rawResetToken,
      newPassword: 'EvenStrongerPassword!2026',
    });
    expect(resetOk.status).toBe(200);

    // Reuse same reset token -> rejected (400)
    const reuseRes = await request(app).post('/api/v1/auth/reset-password').send({
      token: rawResetToken,
      newPassword: 'AnotherPassword!2026',
    });
    expect(reuseRes.status).toBe(400);

    // Pre-reset student2Token must now be revoked (401)
    const oldSessionCheck = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${student2Token}`);
    expect(oldSessionCheck.status).toBe(401);

    // Expired reset token -> rejected (400)
    const expiredToken = generateSecureToken(24);
    await db.updateOne(
      'users',
      { email: 'transfer.student@accesspath.example.edu' },
      {
        resetTokenHash: hashSecurityToken(expiredToken),
        resetTokenExpiresAt: new Date(Date.now() - 60_000).toISOString(),
      }
    );
    const expiredRes = await request(app).post('/api/v1/auth/reset-password').send({
      token: expiredToken,
      newPassword: 'ExpiredAttempt!2026',
    });
    expect(expiredRes.status).toBe(400);
  });

  it('6. blocks self-service campusId mutation (400) and supports admin-approved campus transfer workflow', async () => {
    const loginNew = await request(app).post('/api/v1/auth/login').send({
      email: 'transfer.student@accesspath.example.edu',
      password: 'EvenStrongerPassword!2026',
    });
    expect(loginNew.status).toBe(200);
    const activeToken = loginNew.body.data.token;

    // Attempting to mutate campusId directly via PATCH /auth/profile fails strict validation
    const patchRes = await request(app)
      .patch('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${activeToken}`)
      .send({ name: 'Updated', campusId: 'campus_second' });
    expect(patchRes.status).toBe(400);

    // Submit proper transfer request + have Super Admin approve it
    const reqRes = await request(app)
      .post('/api/v1/auth/transfer-request')
      .set('Authorization', `Bearer ${activeToken}`)
      .send({ toCampusId: 'campus_second', reason: 'Enrolling at Secondary Campus' });
    expect(reqRes.status).toBe(201);

    const approveRes = await request(app)
      .patch(`/api/v1/admin/transfer-requests/${reqRes.body.data.id}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ decision: 'approved' });
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.status).toBe('approved');
  });

  it('7. enforces strict cross-campus isolation (403) across reports, comments, AI, analytics & admin routes', async () => {
    const rCampusPatch = await request(app)
      .patch('/api/v1/campuses/campus_second')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Unauthorized Rename' });
    expect(rCampusPatch.status).toBe(403);

    const rCrossComment = await request(app)
      .post('/api/v1/reports/rep_second_001/comments')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ content: 'Cross campus comment should fail' });
    expect(rCrossComment.status).toBe(403);

    const rCrossAiDup = await request(app)
      .post('/api/v1/ai/detect-duplicates')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ campusId: 'campus_second', title: 'Locked ramp', description: 'Second campus' });
    expect(rCrossAiDup.status).toBe(403);

    const rCrossAiSum = await request(app)
      .post('/api/v1/ai/summarize')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ campusId: 'campus_second' });
    expect(rCrossAiSum.status).toBe(403);

    const rCrossAnalytics = await request(app)
      .get('/api/v1/analytics/overview?campusId=campus_second')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(rCrossAnalytics.status).toBe(403);

    const rCrossDash = await request(app)
      .get('/api/v1/admin/dashboard?campusId=campus_second')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(rCrossDash.status).toBe(403);
  });

  it('8. enforces RBAC: blocks students from admin endpoints & campus_admin from super_admin endpoints (403)', async () => {
    const r1 = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(r1.status).toBe(403);

    const r2 = await request(app)
      .get('/api/v1/admin/institutions')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(r2.status).toBe(403);
  });

  it('9. rejects spoofed MIME images (400), sanitizes & re-encodes valid PNG uploads (201), and restricts evidence downloads to authorized campus members', async () => {
    const createRes = await request(app)
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        campusId: 'campus_demo_north',
        locationNodeId: 'loc_library_entrance',
        title: 'লাইব্রেরির লিফট বন্ধ',
        description: 'সেন্ট্রাল লাইব্রেরির প্রধান লিফট কাজ করছে না, ২য় তলায় ওঠা যাচ্ছে না।',
        language: 'bn',
        category: 'broken_elevator',
        priority: 'critical',
        locationLabel: 'Central Library Entrance',
        runAiClassification: true,
      });
    expect(createRes.status).toBe(201);
    const reportId = createRes.body.data.id;
    expect(createRes.body.data.aiClassification.requiresHumanVerification).toBe(true);
    expect(createRes.body.data.aiClassification.detectedLanguage).toBe('bn');

    // Disallowed text upload
    const badMime = await request(app)
      .post(`/api/v1/reports/${reportId}/evidence`)
      .set('Authorization', `Bearer ${studentToken}`)
      .attach('image', Buffer.from('not-an-image'), {
        filename: 'malicious.txt',
        contentType: 'text/plain',
      });
    expect(badMime.status).toBe(400);

    // Spoofed image/png header with non-PNG binary bytes -> caught by magic byte validator (400)
    const spoofedPng = await request(app)
      .post(`/api/v1/reports/${reportId}/evidence`)
      .set('Authorization', `Bearer ${studentToken}`)
      .attach('image', Buffer.from('<html><script>alert(1)</script></html>'), {
        filename: 'spoof.png',
        contentType: 'image/png',
      });
    expect(spoofedPng.status).toBe(400);

    // Valid PNG -> re-encoded via pngjs and saved under authenticated route
    const png = new PNG({ width: 2, height: 2 });
    png.data.fill(200);
    const validPngBuffer = PNG.sync.write(png);

    const goodUpload = await request(app)
      .post(`/api/v1/reports/${reportId}/evidence`)
      .set('Authorization', `Bearer ${studentToken}`)
      .attach('image', validPngBuffer, {
        filename: 'ramp-evidence.png',
        contentType: 'image/png',
      });
    expect(goodUpload.status).toBe(201);
    const evidenceUrl: string = goodUpload.body.data.fileUrl;
    expect(evidenceUrl).toContain(`/api/v1/reports/${reportId}/evidence/`);

    // Unauthenticated download blocked (401)
    const unauthDownload = await request(app).get(evidenceUrl);
    expect(unauthDownload.status).toBe(401);

    // Authorized student on same campus can retrieve (200)
    const authDownload = await request(app)
      .get(evidenceUrl)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(authDownload.status).toBe(200);

    // Volunteer submits field check (appliedToGraph stays false)
    const verRes = await request(app)
      .post('/api/v1/verifications')
      .set('Authorization', `Bearer ${volunteerToken}`)
      .send({
        campusId: 'campus_demo_north',
        reportId,
        decision: 'confirmed',
        notes: 'Confirmed elevator cabin out of service on ground floor.',
      });
    expect(verRes.status).toBe(201);
    expect(verRes.body.data.appliedToGraph).toBe(false);
  });

  it('10. rejects unexpected PATCH body keys via strict Zod allowlist schemas (400)', async () => {
    const res = await request(app)
      .patch('/api/v1/campuses/campus_demo_north/edges/edge_01')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'open', unexpectedPrivilegeKey: true });
    expect(res.status).toBe(400);

    const malformed = await request(app)
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ title: 'a', description: 'short' });
    expect(malformed.status).toBe(400);
  });

  it('11. supports GIS GeoJSON export/validate, observability readiness, DB integrity check, and class schedule plan', async () => {
    const gisRes = await request(app).get('/api/v1/campuses/campus_demo_north/gis/validate');
    expect(gisRes.status).toBe(200);
    expect(gisRes.body.data.valid).toBe(true);

    const obsRes = await request(app)
      .get('/api/v1/admin/system/observability')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(obsRes.status).toBe(200);
    expect(obsRes.body.data.services.length).toBe(7);

    const intRes = await request(app)
      .get('/api/v1/admin/system/integrity')
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(intRes.status).toBe(200);
    expect(intRes.body.data.ok).toBe(true);

    const clsRes = await request(app)
      .post('/api/v1/operations/schedule')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        campusId: 'campus_demo_north',
        courseCode: 'CS-204',
        courseTitle: 'Human-Centered Design',
        dayOfWeek: 'Tue',
        startTime: '10:00',
        endTime: '11:15',
        buildingId: 'bldg_lib',
        locationNodeId: 'loc_library_entrance',
        roomLabel: 'Room 104',
        bufferMinutes: 10,
      });
    expect(clsRes.status).toBe(201);

    const planRes = await request(app)
      .get('/api/v1/operations/schedule/day-plan?day=Tue')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(planRes.status).toBe(200);
    expect(planRes.body.data.transitions.length).toBe(1);
    expect(planRes.body.data.transitions[0].routeFound).toBe(true);
  });

  it('12. masks reporter real ID in public reports listing', async () => {
    const res = await request(app).get('/api/v1/reports?campusId=campus_demo_north');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].reporterId).toBe('anonymous');
  });

  it('13. blocks demo seeding automatically when NODE_ENV=production', async () => {
    const prevEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      expect(env.IS_PROD).toBe(true);
      const res = await seedDatabaseIfEmpty();
      expect(res.seeded).toBe(false);
      expect(res.reason.toLowerCase()).toContain('production');
    } finally {
      process.env.NODE_ENV = prevEnv;
    }
  });

  it('14. refuses silent JSON fallback when MongoDB connection fails or is missing in NODE_ENV=production', async () => {
    const prevEnv = process.env.NODE_ENV;
    const prevUri = process.env.MONGODB_URI;
    try {
      process.env.NODE_ENV = 'production';
      process.env.MONGODB_URI = '';
      await expect(db.connect({})).rejects.toThrow(
        /Production startup blocked: MONGODB_URI must be configured/i
      );
    } finally {
      process.env.NODE_ENV = prevEnv;
      process.env.MONGODB_URI = prevUri;
    }
  });

  it('15. AI report classification extracts missingInformation fields and enforces human verification', async () => {
    const res = await request(app)
      .post('/api/v1/ai/classify-report')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        campusId: 'campus_demo_north',
        text: 'Pathway looks problematic near the east side.',
      });
    expect(res.status).toBe(200);
    expect(res.body.data.requiresHumanVerification).toBe(true);
    expect(Array.isArray(res.body.data.missingInformation)).toBe(true);
    expect(res.body.data.missingInformation.length).toBeGreaterThan(0);
  });

  it('16. AccessPath AI assistant grounds Bengali no-stairs queries via real Dijkstra routing', async () => {
    const res = await request(app)
      .post('/api/v1/ai/assistant')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        campusId: 'campus_demo_north',
        message: 'আমি লাইব্রেরিতে যেতে চাই, কিন্তু সিঁড়ি ব্যবহার করতে পারি না।',
      });
    expect(res.status).toBe(200);
    expect(res.body.data.routeFound).toBe(true);
    expect(res.body.data.calculatedRoute).toBeTruthy();
    expect(Array.isArray(res.body.data.appliedConstraints)).toBe(true);
    expect(
      res.body.data.appliedConstraints.some((c: string) => c.toLowerCase().includes('stairs'))
    ).toBe(true);
    expect(Array.isArray(res.body.data.sources)).toBe(true);
    expect(res.body.data.sources.length).toBeGreaterThan(0);
  });

  it('17. AI Analytics Q&A blocks students & cross-campus admins (403) and returns grounded metrics for authorized admin (200)', async () => {
    const studentDenied = await request(app)
      .post('/api/v1/ai/analytics-qa')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        campusId: 'campus_demo_north',
        question: 'Which pathways are blocked?',
      });
    expect(studentDenied.status).toBe(403);

    const crossCampusDenied = await request(app)
      .post('/api/v1/ai/analytics-qa')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        campusId: 'campus_second',
        question: 'Which pathways are blocked?',
      });
    expect(crossCampusDenied.status).toBe(403);

    const adminOk = await request(app)
      .post('/api/v1/ai/analytics-qa')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        campusId: 'campus_demo_north',
        question: 'Which pathways are blocked or stale?',
      });
    expect(adminOk.status).toBe(200);
    expect(typeof adminOk.body.data.answer).toBe('string');
    expect(adminOk.body.data.metricsSnapshot.totalReports).toBeGreaterThan(0);
    expect(adminOk.body.data.disclaimer.length).toBeGreaterThan(10);
  });
});

