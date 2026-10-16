// needsServer: read-only integration checks against the configured MySQL/backend.
// Does not create/update/delete user data. Run with no concurrent writers.
const assert = require("node:assert/strict");
const mysql = require("mysql2/promise");
const { BASE_URL, loginAs, readDbConfig } = require("./test_helpers");
const base = "/reports/completion-rate";
let passed = 0;
function check(name, fn) { fn(); passed++; console.log(`[PASS] ${name}`); }
async function request(url, token) {
  const res = await fetch(BASE_URL + url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  const bytes = Buffer.from(await res.arrayBuffer());
  let body; try { body = JSON.parse(bytes.toString("utf8")); } catch { body = null; }
  return { status: res.status, headers: res.headers, body, bytes };
}
function key(value) {
  return String(value || "").trim().replace(/\s+/g, " ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase();
}
function mentorKey(row) {
  if (row.mentorId != null) return `id:${row.mentorId}`;
  return ["", "chua cap nhat"].includes(key(row.mentorName)) ? "unknown" : `legacy:${key(row.mentorName)}`;
}
function expectedSummary(rows) {
  const unique = [...new Map(rows.map(r => [String(r.id), r])).values()];
  const completed = unique.filter(r => String(r.status || "").trim() === "Hoàn thành").length;
  const active = unique.filter(r => String(r.status || "").trim() === "Đang thực tập").length;
  return { total: unique.length, completed, active, notCompleted: unique.length - completed - active,
    unknownStatus: unique.filter(r => !["Hoàn thành", "Đang thực tập", "Tạm dừng"].includes(String(r.status || "").trim())).length,
    rate: unique.length ? Math.round(completed * 1000 / unique.length) / 10 : 0 };
}
async function main() {
  const conn = await mysql.createConnection(readDbConfig());
  try {
    const before = (await conn.query("SELECT id, status FROM intern_profiles ORDER BY id"))[0];
    const hr = await loginAs("HR");
    const paths = [base, `${base}/interns?groupBy=program&groupKey=unassigned`, `${base}/export.csv`];
    for (const path of paths) {
      const anonymous = await request(path);
      check(`401 anonymous ${path}`, () => { assert.equal(anonymous.status, 401); assert.equal(anonymous.headers.get("cache-control"), "private, no-store"); });
    }
    for (const role of ["Admin", "Mentor", "Intern"]) {
      const token = await loginAs(role);
      for (const path of paths) {
        const denied = await request(path, token);
        check(`403 ${role} ${path}`, () => { assert.equal(denied.status, 403); assert.equal(denied.headers.get("cache-control"), "private, no-store"); });
      }
    }
    const raw = (await conn.query(`SELECT i.id, i.status, pi.program_id AS programId, i.mentor_id AS mentorId,
      COALESCE(m.full_name COLLATE utf8mb4_unicode_ci,i.mentor_name COLLATE utf8mb4_unicode_ci) AS mentorName FROM intern_profiles i
      LEFT JOIN mentors m ON m.id=i.mentor_id LEFT JOIN program_interns pi ON pi.intern_id=i.id`))[0];
    const report = await request(base, hr);
    check("HR 200, no-store and counts match database/seed", () => {
      assert.equal(report.status, 200); assert.equal(report.headers.get("cache-control"), "private, no-store");
      assert.deepEqual(report.body.data.summary, expectedSummary(raw));
      if (process.env.US6_EXPECT_TOTAL != null) {
        assert.equal(report.body.data.summary.total, Number(process.env.US6_EXPECT_TOTAL));
      }
    });
    if (process.env.US6_EXPECT_FIXTURE === "1") {
      check("known isolated fixture: 8 total, 3 completed, 37.5%", () => {
        assert.deepEqual(report.body.data.summary, { total: 8, completed: 3, active: 3, notCompleted: 2, unknownStatus: 1, rate: 37.5 });
        const groups = new Map(report.body.data.byProgram.map(group => [group.key, group]));
        assert.equal(groups.get("96001").total, 3); assert.equal(groups.get("96001").completed, 1);
        assert.equal(groups.get("96002").total, 3); assert.equal(groups.get("96002").completed, 2);
        assert.equal(groups.get("96003").rate, 100);
      });
    }
    const data = report.body.data;
    check("group ordering is descending by rate then name", () => {
      for (const groups of [data.byProgram, data.byMentor]) {
        for (let i = 1; i < groups.length; i++) {
          assert.ok(groups[i - 1].rate > groups[i].rate || (groups[i - 1].rate === groups[i].rate && groups[i - 1].name.localeCompare(groups[i].name, "vi") <= 0));
        }
      }
    });
    for (const [dimension, groups] of [["program", data.byProgram], ["mentor", data.byMentor]]) {
      for (const group of groups) {
        const expected = raw.filter(row => dimension === "program" ? (row.programId == null ? "unassigned" : String(row.programId)) === group.key : mentorKey(row) === group.key);
        const expectedIds = [...new Set(expected.map(r => Number(r.id)))].sort((a,b) => a-b);
        const ids = [];
        let page = 1, lastPage = 1;
        do {
          const params = new URLSearchParams({ groupBy: dimension, groupKey: group.key, page: String(page), pageSize: "2" });
          const detail = await request(`${base}/interns?${params}`, hr);
          assert.equal(detail.status, 200);
          const result = detail.body.data;
          assert.deepEqual(result.summary, expectedSummary(expected));
          assert.equal(result.pagination.total, group.total);
          assert.equal(result.summary.completed, group.completed);
          assert.equal(result.summary.rate, group.rate);
          assert.ok(result.items.every(r => !("email" in r) && !("phone" in r)));
          ids.push(...result.items.map(r => Number(r.id)));
          lastPage = result.pagination.totalPages; page++;
        } while (page <= lastPage);
        check(`chart/detail members and all pages: ${dimension} ${group.key}`, () => assert.deepEqual(ids.sort((a,b) => a-b), expectedIds));
      }
    }
    const missingGroup = await request(`${base}/interns?groupBy=program&groupKey=9007199254740991`, hr);
    check("nonexistent group is empty", () => { assert.equal(missingGroup.status, 200); assert.equal(missingGroup.body.data.pagination.total, 0); });
    for (const status of ["Hoàn thành", "Đang thực tập", "Tạm dừng"]) {
      const response = await request(`${base}?${new URLSearchParams({status})}`, hr);
      check(`status filter ${status}`, () => { assert.equal(response.status, 200); assert.deepEqual(response.body.data.summary, expectedSummary(raw.filter(r => String(r.status || "").trim() === status))); });
    }
    for (const program of data.programs) {
      const response = await request(`${base}?programId=${program.id}`, hr);
      check(`program filter ${program.id}`, () => { assert.equal(response.status, 200); assert.deepEqual(response.body.data.summary, expectedSummary(raw.filter(r => String(r.programId) === String(program.id)))); });
    }
    // Same applied filters must be used by report and drill-down.
    if (data.programs.length) {
      const filters = new URLSearchParams({ programId: String(data.programs[0].id), status: "Hoàn thành", from: "1000-01-01", to: "9999-12-31" });
      const filtered = await request(`${base}?${filters}`, hr);
      assert.equal(filtered.status, 200);
      for (const [dimension, groups] of [["program", filtered.body.data.byProgram], ["mentor", filtered.body.data.byMentor]]) {
        for (const group of groups) {
          const params = new URLSearchParams(filters);
          params.set("groupBy", dimension); params.set("groupKey", group.key);
          const detail = await request(`${base}/interns?${params}`, hr);
          check(`filtered chart/detail parity ${dimension} ${group.key}`, () => {
            assert.equal(detail.status, 200); assert.equal(detail.body.data.pagination.total, group.total);
            assert.equal(detail.body.data.summary.completed, group.completed); assert.equal(detail.body.data.summary.rate, group.rate);
          });
        }
      }
    }
    const dates = (await conn.query("SELECT DISTINCT DATE_FORMAT(created_at,'%Y-%m-%d') AS day FROM intern_profiles ORDER BY day LIMIT 1"))[0];
    if (dates.length) {
      const day = dates[0].day;
      const expected = (await conn.query("SELECT id,status FROM intern_profiles WHERE DATE(created_at)=?", [day]))[0];
      const response = await request(`${base}?from=${day}&to=${day}`, hr);
      check("inclusive equal date boundaries", () => assert.deepEqual(response.body.data.summary, expectedSummary(expected)));
    }
    const escaped = "50%_\\O'Brien";
    const literal = `%${escaped.replace(/([%_\\])/g, "\\$1")}%`;
    const expectedSearch = (await conn.query(`SELECT DISTINCT i.id,i.status FROM intern_profiles i
      LEFT JOIN mentors m ON m.id=i.mentor_id LEFT JOIN program_interns pi ON pi.intern_id=i.id LEFT JOIN internship_programs p ON p.id=pi.program_id
      WHERE i.full_name LIKE ? ESCAPE '\\\\' OR i.student_code LIKE ? ESCAPE '\\\\' OR i.university LIKE ? ESCAPE '\\\\' OR COALESCE(m.full_name COLLATE utf8mb4_unicode_ci,i.mentor_name COLLATE utf8mb4_unicode_ci) LIKE ? ESCAPE '\\\\' OR p.name LIKE ? ESCAPE '\\\\'`, Array(5).fill(literal)))[0];
    const search = await request(`${base}?${new URLSearchParams({q:escaped})}`, hr);
    check("q uses literal percent, underscore, backslash and apostrophe", () => { assert.equal(search.status, 200); assert.deepEqual(search.body.data.summary, expectedSummary(expectedSearch)); });
    const empty = await request(`${base}?q=US6_NO_MATCH_${Date.now()}_unlikely`, hr);
    check("empty filter returns zero rate and clear empty groups", () => {
      assert.equal(empty.status, 200); assert.equal(empty.body.data.summary.total, 0);
      assert.equal(empty.body.data.summary.rate, 0); assert.deepEqual(empty.body.data.byProgram, []);
    });
    const invalid = ["foo=1", "status=Foo", "status=Ho%C3%A0n%20th%C3%A0nh&status=Foo", "q=a&q=b", "programId=0", "programId=1&programId=2", "programId=9007199254740992", "from=2026-02-29", "from=2026-10-10&to=2026-01-01", `q=${"a".repeat(101)}`];
    for (const query of invalid) {
      for (const endpoint of [base, `${base}/export.csv`]) {
        const response = await request(`${endpoint}?${query}`, hr);
        check(`400 ${endpoint} ${query.slice(0,60)}`, () => { assert.equal(response.status, 400); assert.equal(response.headers.get("cache-control"), "private, no-store"); });
      }
    }
    for (const query of ["", "groupBy=foo&groupKey=1", "groupBy=program&groupKey=1&pageSize=101", "groupBy=program&groupKey=1&page=0", "groupBy=program&groupKey=1&status=Foo", "groupBy=program&groupKey=1&page=1&page=2"]) {
      const response = await request(`${base}/interns?${query}`, hr);
      check(`400 invalid detail ${query}`, () => assert.equal(response.status, 400));
    }
    const csv = await request(`${base}/export.csv`, hr);
    check("CSV 200, UTF-8 BOM, download headers and no-store", () => {
      assert.equal(csv.status, 200); assert.deepEqual([...csv.bytes.subarray(0,3)], [239,187,191]);
      assert.match(csv.headers.get("content-type"), /text\/csv/);
      assert.match(csv.headers.get("content-disposition"), /attachment/);
      assert.equal(csv.headers.get("cache-control"), "private, no-store");
      const stats = data.summary;
      const expected = [stats.total, stats.completed, stats.active, stats.notCompleted, stats.unknownStatus, stats.rate].map(v => `"${v}"`).join(",");
      assert.ok(csv.bytes.toString("utf8").includes(expected));
      for (const group of data.byProgram.filter(g => /^[=+\-@]/.test(g.name))) {
        assert.ok(csv.bytes.toString("utf8").includes(`"'${group.name.replace(/"/g, '""')}"`));
      }
    });
    const after = (await conn.query("SELECT id, status FROM intern_profiles ORDER BY id"))[0];
    check("integration suite did not change intern data", () => assert.deepEqual(after, before));
    console.log(`US6 API: ${passed} checks passed; no data written.`);
  } finally { await conn.end(); }
}
main().catch(err => { console.error(err); process.exitCode = 1; });
