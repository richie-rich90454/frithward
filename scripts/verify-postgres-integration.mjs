import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PASSWORD = "frithward-integration-test";
const DATABASE = "frithward_integration";
const AUTH_SECRET = "integration-test-secret-do-not-use-in-production";
const DEFAULT_PG_BIN = "C:\\Program Files\\PostgreSQL\\18\\bin";

const log = (...parts) => console.log(...parts);
const fail = (message) => {
    throw new Error(message);
};
function check(label, condition, detail = "") {
    if (!condition) fail(`ASSERTION FAILED: ${label}${detail ? ` — ${detail}` : ""}`);
    log(`  PASS  ${label}`);
}

function resolvePgBin() {
    const configured = process.env.PG_BIN_DIR?.trim();
    if (configured) return configured;
    if (process.platform === "win32" && existsSync(DEFAULT_PG_BIN)) return DEFAULT_PG_BIN;
    return null; // POSIX: rely on PATH.
}
const pgBin = resolvePgBin();
const pg = (name) =>
    pgBin ? join(pgBin, process.platform === "win32" ? `${name}.exe` : name) : name;

function resolvePnpm() {
    const configured = process.env.PNPM_BIN?.trim();
    if (configured) return { command: configured, shell: false };
    if (process.platform === "win32") {
        const npmShim = process.env.APPDATA && join(process.env.APPDATA, "npm", "pnpm.cmd");
        if (npmShim && existsSync(npmShim)) return { command: npmShim, shell: true };
        return { command: "pnpm.cmd", shell: true };
    }
    return { command: "pnpm", shell: false };
}
const pnpm = resolvePnpm();

function run(command, args, options = {}) {
    const result = spawnSync(command, args, {
        cwd: ROOT,
        encoding: "utf8",
        stdio: options.stdio ?? "pipe",
        shell: options.shell ?? false,
        env: { ...process.env, ...(options.env ?? {}) },
        timeout: options.timeout ?? 120_000,
    });
    const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
    if (result.error || result.status !== 0) {
        fail(
            `Command failed: ${command} ${args.join(" ")}\n${result.error?.message ?? ""}\n${output}`,
        );
    }
    return output;
}

async function freePort(preferred) {
    for (let port = preferred; port < preferred + 30; port += 1) {
        const available = await new Promise((done) => {
            const server = createServer();
            server.once("error", () => done(false));
            server.listen(port, "127.0.0.1", () => server.close(() => done(true)));
        });
        if (available) return port;
    }
    fail(`No free port found near ${preferred}`);
}

async function waitFor(checkFn, label, timeoutMs = 60_000) {
    const deadline = Date.now() + timeoutMs;
    let last = "";
    while (Date.now() < deadline) {
        try {
            const value = await checkFn();
            if (value) return value;
        } catch (error) {
            last = error instanceof Error ? error.message : String(error);
        }
        await new Promise((done) => setTimeout(done, 400));
    }
    fail(`${label} timed out after ${timeoutMs / 1000}s${last ? ` (last error: ${last})` : ""}`);
}

async function request(method, url, { body, headers = {} } = {}) {
    const response = await fetch(url, {
        method,
        headers: body === undefined ? headers : { "content-type": "application/json", ...headers },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    let parsed;
    try {
        parsed = text ? JSON.parse(text) : null;
    } catch {
        parsed = text;
    }
    const result = {
        status: response.status,
        body: parsed,
        raw: text,
        headers: response.headers,
        cookies: response.headers.getSetCookie?.() ?? [],
    };
    log(`  HTTP ${method} ${new URL(url).pathname} -> ${result.status} ${text.slice(0, 240)}`);
    return result;
}

function startService(name, script, env) {
    const child = spawn(pnpm.command, ["run", script], {
        cwd: ROOT,
        env: { ...process.env, ...env },
        stdio: ["ignore", "pipe", "pipe"],
        shell: pnpm.shell,
        detached: process.platform !== "win32",
    });
    child.log = "";
    const collect = (chunk) => {
        const text = chunk.toString();
        child.log += text;
        for (const line of text.split(/\r?\n/).filter(Boolean)) log(`  [${name}] ${line}`);
    };
    child.stdout.on("data", collect);
    child.stderr.on("data", collect);
    return child;
}

function stopService(service) {
    const child = service?.child;
    if (!child || child.exitCode !== null || child.killed) return;
    if (process.platform === "win32") {
        spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    } else {
        try {
            process.kill(-child.pid, "SIGTERM");
        } catch {
            /* already gone */
        }
    }
}

async function stopAndWait(service) {
    if (!service) return;
    stopService(service);
    await new Promise((done) => setTimeout(done, 600));
}

let workDir = null;
let dataDir = null;
let pgCtlLog = null;
let pgStarted = false;
const services = { api: null, community: null, incident: null };

async function startApi(port, databaseUrl) {
    const child = startService("api", "start:api", {
        DATABASE_URL: databaseUrl,
        BETTER_AUTH_SECRET: AUTH_SECRET,
        PORT: String(port),
        CORS_ORIGIN: "",
        OTEL_EXPORTER_OTLP_ENDPOINT: "",
    });
    const base = `http://127.0.0.1:${port}`;
    await waitFor(async () => {
        if (child.exitCode !== null)
            fail(`API service exited early (code ${child.exitCode})\n${child.log}`);
        const response = await request("GET", `${base}/health`);
        return response.status === 200 ? base : false;
    }, "API /health");
    return { child, base };
}

async function startReportService(name, script, port, databaseUrl) {
    const child = startService(name, script, {
        DATABASE_URL: databaseUrl,
        PORT: String(port),
    });
    const base = `http://127.0.0.1:${port}`;
    await waitFor(async () => {
        if (child.exitCode !== null)
            fail(`${name} exited early (code ${child.exitCode})\n${child.log}`);
        const response = await request("GET", `${base}/health`);
        return response.status === 200 ? base : false;
    }, `${name} /health`);
    return { child, base };
}

async function main() {
    const findings = [];
    log("== Live PostgreSQL 18 integration verification ==");

    const [pgPort, apiPort, communityPort, incidentPort] = await Promise.all([
        freePort(Number(process.env.PG_PORT ?? 55432)),
        freePort(Number(process.env.API_PORT ?? 35500)),
        freePort(Number(process.env.COMMUNITY_PORT ?? 35501)),
        freePort(Number(process.env.INCIDENT_PORT ?? 35502)),
    ]);
    log(
        `Ports: postgres=${pgPort} api=${apiPort} community=${communityPort} incident=${incidentPort}`,
    );

    workDir = await mkdtemp(join(tmpdir(), "frithward-pg18-int-"));
    dataDir = join(workDir, "data");
    pgCtlLog = join(workDir, "postgres.log");
    const pwFile = join(workDir, "pwfile");
    await writeFile(pwFile, `${PASSWORD}\n`, "utf8");
    log(`Temp data dir: ${dataDir}`);

    log("== initdb ==");
    run(pg("initdb"), [
        "-D",
        dataDir,
        "-U",
        "postgres",
        "--auth=trust",
        "--encoding=UTF8",
        "--locale=C",
        "--pwfile",
        pwFile,
        "--no-instructions",
    ]);

    log("== pg_ctl start ==");
    pgStarted = true;
    // pg_ctl leaves its stdio pipes open in the Windows child, so ignore them and use -l instead.
    run(
        pg("pg_ctl"),
        ["-D", dataDir, "-l", pgCtlLog, "-o", `-h 127.0.0.1 -p ${pgPort}`, "-w", "start"],
        { stdio: "ignore" },
    );

    const psqlEnv = { PGPASSWORD: PASSWORD };
    const psqlArgs = [
        "-h",
        "127.0.0.1",
        "-p",
        String(pgPort),
        "-U",
        "postgres",
        "-v",
        "ON_ERROR_STOP=1",
    ];
    await waitFor(() => {
        const result = spawnSync(
            pg("pg_isready"),
            ["-h", "127.0.0.1", "-p", String(pgPort), "-U", "postgres"],
            { encoding: "utf8" },
        );
        return result.status === 0;
    }, "Postgres readiness");

    log(`== create database ${DATABASE} ==`);
    run(pg("psql"), [...psqlArgs, "-d", "postgres", "-c", `create database ${DATABASE}`], {
        env: psqlEnv,
    });

    const databaseUrl = `postgresql://postgres:${encodeURIComponent(PASSWORD)}@127.0.0.1:${pgPort}/${DATABASE}`;
    log(`DATABASE_URL=${databaseUrl}`);

    log("== pnpm run db:migrate (real 0001 + 0002) ==");
    const migrationOutput = run(pnpm.command, ["run", "db:migrate"], {
        env: { DATABASE_URL: databaseUrl },
        shell: pnpm.shell,
    });
    log(migrationOutput.trim());
    check(
        "db:migrate applied statements",
        /Applied \d+ migration statements\./.test(migrationOutput),
        migrationOutput.trim(),
    );

    const tables = run(
        pg("psql"),
        [
            ...psqlArgs,
            "-d",
            DATABASE,
            "-At",
            "-c",
            "select table_name from information_schema.tables where table_schema='public' order by table_name",
        ],
        { env: psqlEnv },
    );
    const tableList = tables
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
    log(`Tables in public schema: ${tableList.join(", ")}`);
    for (const table of [
        "user",
        "session",
        "scam_analyses",
        "job_status",
        "community_reports",
        "incident_reports",
        "cases",
    ]) {
        check(`migration created table ${table}`, tableList.includes(table));
    }

    // ---- API service ----
    log("== API service ==");
    services.api = await startApi(apiPort, databaseUrl);
    const api = services.api;

    const health = await request("GET", `${api.base}/health`);
    check("GET /health -> 200", health.status === 200, health.raw);
    check(
        "GET /health reports database connected",
        health.body?.database === "connected",
        health.raw,
    );
    check("GET /health reports status ok", health.body?.status === "ok", health.raw);

    const anonymousSession = await request("GET", `${api.base}/api/auth/session`);
    if (anonymousSession.status === 200) {
        check("GET /api/auth/session -> 200", true);
        check(
            "GET /api/auth/session is anonymous",
            anonymousSession.body?.authenticated === false,
            anonymousSession.raw,
        );
    } else {
        findings.push(
            `GET /api/auth/session -> ${anonymousSession.status} ${anonymousSession.raw.slice(0, 200)}`,
        );
        log(
            `  FINDING  GET /api/auth/session -> ${anonymousSession.status} ${anonymousSession.raw.slice(0, 300)}`,
        );
    }
    if (api.child.log.includes("Drizzle schema mismatch")) {
        const start = api.child.log.indexOf("Drizzle schema mismatch");
        findings.push(
            `Better Auth Drizzle schema mismatch: ${api.child.log
                .slice(start, start + 700)
                .replace(/\s+/g, " ")
                .trim()}`,
        );
    }

    let sessionCookie = null;
    const signUp = await request("POST", `${api.base}/api/auth/sign-up/email`, {
        body: {
            email: "integration@example.test",
            password: "Test-Password-123!",
            name: "Integration Tester",
        },
        // Better Auth checks Origin for form-CSRF; a real browser always sends it.
        headers: { origin: api.base },
    });
    if (signUp.status === 200 && signUp.cookies.length > 0) {
        sessionCookie = signUp.cookies.map((cookie) => cookie.split(";")[0]).join("; ");
        check("POST /api/auth/sign-up/email -> 200 (session established)", true);
    } else {
        log(`  NOTE  POST /api/auth/sign-up/email -> ${signUp.status} ${signUp.raw.slice(0, 500)}`);
        log(
            "  NOTE  Auth cannot establish a session with the shipped schema; case CRUD is gated behind requireSession.",
        );
    }

    const caseHeaders = sessionCookie ? { cookie: sessionCookie } : {};
    const validCase = {
        kind: "message",
        title: "Live integration case",
        inputs: { text: "pay now" },
    };

    const unauthCases = await request("GET", `${api.base}/api/cases`, { headers: caseHeaders });
    if (sessionCookie) {
        check("GET /api/cases (authenticated) -> 200", unauthCases.status === 200, unauthCases.raw);
    } else {
        log(
            `  FINDING  case routes are gated by requireSession; GET /api/cases without a session -> ${unauthCases.status} ${unauthCases.raw.slice(0, 200)}`,
        );
        findings.push(
            `Case CRUD could not be exercised: Better Auth cannot establish a session with the shipped schema (GET /api/cases without session -> ${unauthCases.status}).`,
        );
        await request("POST", `${api.base}/api/cases`, { body: validCase });
        await request("GET", `${api.base}/api/cases/not-a-real-id`);
        await request("PATCH", `${api.base}/api/cases/not-a-real-id`, { body: { title: "x" } });
        await request("DELETE", `${api.base}/api/cases/not-a-real-id`);
    }

    let createdCaseId = null;
    if (sessionCookie) {
        const created = await request("POST", `${api.base}/api/cases`, {
            body: validCase,
            headers: caseHeaders,
        });
        check("POST /api/cases -> 201", created.status === 201, created.raw);
        createdCaseId = created.body?.id;
        check(
            "POST /api/cases returned a uuid",
            typeof createdCaseId === "string" && createdCaseId.length > 0,
            created.raw,
        );
        check("created case has status draft", created.body?.status === "draft", created.raw);

        const listed = await request("GET", `${api.base}/api/cases`, { headers: caseHeaders });
        check(
            "GET /api/cases lists the created case",
            listed.status === 200 && listed.body?.cases?.some((item) => item.id === createdCaseId),
            listed.raw,
        );

        const fetched = await request("GET", `${api.base}/api/cases/${createdCaseId}`, {
            headers: caseHeaders,
        });
        check(
            "GET /api/cases/:id -> 200 with matching id",
            fetched.status === 200 && fetched.body?.id === createdCaseId,
            fetched.raw,
        );

        const patched = await request("PATCH", `${api.base}/api/cases/${createdCaseId}`, {
            body: { title: "Updated live integration case", status: "active" },
            headers: caseHeaders,
        });
        check("PATCH /api/cases/:id -> 200", patched.status === 200, patched.raw);
        check(
            "PATCH persisted title",
            patched.body?.title === "Updated live integration case",
            patched.raw,
        );
        check("PATCH persisted status", patched.body?.status === "active", patched.raw);
    }

    // ---- Community service ----
    log("== Community service ==");
    services.community = await startReportService(
        "community",
        "start:community",
        communityPort,
        databaseUrl,
    );
    const community = services.community;
    const submitted = await request("POST", `${community.base}/api/community/reports`, {
        body: {
            title: "Live community report",
            body: "Suspicious account message asking for payment",
            findings: [
                {
                    id: "f1",
                    kind: "pii-email",
                    detail: "sender@example.test",
                    remediation: "redact",
                },
            ],
        },
    });
    check("POST /api/community/reports -> 201", submitted.status === 201, submitted.raw);
    const communityId = submitted.body?.report?.id;
    check(
        "community report has an id",
        typeof communityId === "string" && communityId.length > 0,
        submitted.raw,
    );
    const communityList = await request("GET", `${community.base}/api/community/reports`);
    check(
        "GET /api/community/reports lists the report",
        communityList.status === 200 &&
            communityList.body?.reports?.some((item) => item.id === communityId),
        communityList.raw,
    );

    // ---- Incident service ----
    log("== Incident service ==");
    services.incident = await startReportService(
        "incident",
        "start:incident",
        incidentPort,
        databaseUrl,
    );
    const incident = services.incident;
    const incidentCreated = await request("POST", `${incident.base}/api/incident/reports`, {
        body: { title: "Live incident", severity: "high", details: "Credential phishing campaign" },
    });
    check("POST /api/incident/reports -> 201", incidentCreated.status === 201, incidentCreated.raw);
    const incidentId = incidentCreated.body?.id;
    check(
        "incident report has an id",
        typeof incidentId === "string" && incidentId.length > 0,
        incidentCreated.raw,
    );
    const incidentFetched = await request(
        "GET",
        `${incident.base}/api/incident/reports/${incidentId}`,
    );
    check(
        "GET /api/incident/reports/:id -> 200",
        incidentFetched.status === 200 && incidentFetched.body?.id === incidentId,
        incidentFetched.raw,
    );
    const incidentPatched = await request(
        "PATCH",
        `${incident.base}/api/incident/reports/${incidentId}/status`,
        {
            body: { status: "investigating" },
        },
    );
    check(
        "PATCH /api/incident/reports/:id/status -> 200",
        incidentPatched.status === 200,
        incidentPatched.raw,
    );
    check(
        "incident status persisted",
        incidentPatched.body?.status === "investigating",
        incidentPatched.raw,
    );

    // ---- Restart all services; verify DB persistence ----
    log("== Restart all services and verify persistence ==");
    for (const key of ["api", "community", "incident"]) await stopAndWait(services[key]);
    services.api = await startApi(apiPort, databaseUrl);
    services.community = await startReportService(
        "community",
        "start:community",
        communityPort,
        databaseUrl,
    );
    services.incident = await startReportService(
        "incident",
        "start:incident",
        incidentPort,
        databaseUrl,
    );

    const healthAfter = await request("GET", `${services.api.base}/health`);
    check(
        "API /health -> 200 after restart",
        healthAfter.status === 200 && healthAfter.body?.database === "connected",
        healthAfter.raw,
    );

    if (sessionCookie && createdCaseId) {
        const caseAfter = await request("GET", `${services.api.base}/api/cases/${createdCaseId}`, {
            headers: { cookie: sessionCookie },
        });
        check(
            "created case survives API restart",
            caseAfter.status === 200 && caseAfter.body?.title === "Updated live integration case",
            caseAfter.raw,
        );
        const deleted = await request("DELETE", `${services.api.base}/api/cases/${createdCaseId}`, {
            headers: { cookie: sessionCookie },
        });
        check("DELETE /api/cases/:id -> 204", deleted.status === 204, deleted.raw);
        const gone = await request("GET", `${services.api.base}/api/cases/${createdCaseId}`, {
            headers: { cookie: sessionCookie },
        });
        check("GET deleted case -> 404", gone.status === 404, gone.raw);
    }

    const communityAfter = await request("GET", `${services.community.base}/api/community/reports`);
    check(
        "community report survives restart",
        communityAfter.status === 200 &&
            communityAfter.body?.reports?.some((item) => item.id === communityId),
        communityAfter.raw,
    );

    const incidentAfter = await request(
        "GET",
        `${services.incident.base}/api/incident/reports/${incidentId}`,
    );
    check(
        "incident status survives restart",
        incidentAfter.status === 200 && incidentAfter.body?.status === "investigating",
        incidentAfter.raw,
    );

    // Row counts straight from Postgres as extra evidence.
    const counts = run(
        pg("psql"),
        [
            ...psqlArgs,
            "-d",
            DATABASE,
            "-At",
            "-c",
            "select 'cases=' || (select count(*) from cases) || ' community=' || (select count(*) from community_reports) || ' incident=' || (select count(*) from incident_reports)",
        ],
        { env: psqlEnv },
    );
    log(`Postgres row counts: ${counts.trim()}`);

    if (findings.length === 0) {
        log("== RESULT: ALL CHECKS PASSED ==");
        return;
    }
    log(`== RESULT: ${findings.length} GENUINE BLOCKER(S) FOUND; reachable checks passed ==`);
    for (const finding of findings) log(`  - ${finding}`);
    fail(
        `Integration verification incomplete: ${findings.length} genuine blocker(s) prevented full endpoint coverage (see RESULT lines above).`,
    );
}

try {
    await main();
} catch (error) {
    console.error("\nINTEGRATION VERIFICATION FAILED:");
    console.error(error instanceof Error ? (error.stack ?? error.message) : error);
    for (const [name, service] of Object.entries(services)) {
        if (service?.child?.log)
            console.error(`\n--- ${name} service log ---\n${service.child.log}`);
    }
    if (pgCtlLog && existsSync(pgCtlLog)) {
        try {
            console.error(
                `\n--- postgres log ---\n${await (await import("node:fs/promises")).readFile(pgCtlLog, "utf8")}`,
            );
        } catch {
            /* ignore */
        }
    }
    process.exitCode = 1;
} finally {
    log("\n== Cleanup ==");
    for (const key of ["api", "community", "incident"]) stopService(services[key]);
    if (pgStarted && dataDir) {
        try {
            run(pg("pg_ctl"), ["-D", dataDir, "-m", "fast", "-w", "stop"], { stdio: "ignore" });
            await new Promise((done) => setTimeout(done, 1000));
        } catch (error) {
            console.error(`pg_ctl stop failed: ${error instanceof Error ? error.message : error}`);
        }
    }
    if (workDir) {
        await rm(workDir, { recursive: true, force: true, maxRetries: 8, retryDelay: 500 });
        log(`Removed temp dir ${workDir}`);
    }
}
