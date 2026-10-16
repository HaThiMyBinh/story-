const assert = require("node:assert/strict");
const { test } = require("node:test");
const { HttpError, sendRouteError } = require("../errors");
const { sendError } = require("../controllers/endpoint");
const support = require("../controllers/supportRequests.controller");
const service = require("../services/supportRequests.service");
function response() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    headersSent: false,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    set(key, value) {
      this.headers[key] = value;
      return this;
    },
  };
}
async function captureErrors(work) {
  const original = console.error,
    logs = [];
  console.error = (...args) => logs.push(args);
  try {
    await work(logs);
  } finally {
    console.error = original;
  }
}
test("unknown failures and HttpError(500) never expose internal messages/extra", async () => {
  await captureErrors((logs) => {
    for (const error of [
      new Error("INTERNAL_DATABASE_DETAILS"),
      new HttpError(500, "INTERNAL_DATABASE_DETAILS", { sql: "PRIVATE_SQL" }),
      new HttpError(503, "PRIVATE_UPSTREAM"),
      new HttpError(999, "PRIVATE_STATUS"),
    ]) {
      const res = response();
      sendError(res, error, "TEST");
      assert.equal(res.statusCode, 500);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error, "Lỗi server, vui lòng thử lại sau!");
      assert.ok(!JSON.stringify(res.body).includes("PRIVATE"));
      assert.ok(!JSON.stringify(res.body).includes("INTERNAL"));
    }
    assert.equal(logs.length, 4);
  });
});
test("public validation errors retain status/metadata; extras cannot replace envelope", () => {
  const res = response();
  sendError(
    res,
    new HttpError(409, "Cần xác nhận", {
      code: "NEEDS_CONFIRMATION",
      warnings: ["x"],
      success: true,
      message: "override",
      error: "override",
    }),
    "TEST",
  );
  assert.equal(res.statusCode, 409);
  assert.equal(res.body.success, false);
  assert.equal(res.body.message, "Cần xác nhận");
  assert.equal(res.body.error, "Cần xác nhận");
  assert.equal(res.body.code, "NEEDS_CONFIRMATION");
  assert.deepEqual(res.body.warnings, ["x"]);
});
test("legacy routes use the same 5xx policy and preserve their response shape", async () => {
  await captureErrors(() => {
    const res = response();
    sendRouteError(
      res,
      new HttpError(500, "INTERNAL_FAILURE"),
      "Thông báo an toàn",
    );
    assert.deepEqual(res.body, { error: "Thông báo an toàn" });
    assert.equal(res.statusCode, 500);
    const conflict = response();
    const err = new Error("Không thể xóa");
    err.status = 409;
    sendRouteError(conflict, err, "Lỗi máy chủ");
    assert.equal(conflict.statusCode, 409);
    assert.deepEqual(conflict.body, { error: "Không thể xóa" });
  });
});
test("support actions share success status, no-store and error handling", async () => {
  const original = service.create;
  try {
    service.create = async () => ({ id: 7 });
    const success = response();
    await support.create({ user: { id: 1 }, body: {} }, success);
    assert.equal(success.statusCode, 201);
    assert.equal(success.headers["Cache-Control"], "private, no-store");
    assert.deepEqual(success.body.data, { id: 7 });
    service.create = async () => {
      throw new HttpError(400, "Dữ liệu sai");
    };
    const bad = response();
    await support.create({ user: {}, body: {} }, bad);
    assert.equal(bad.statusCode, 400);
    assert.equal(bad.body.error, "Dữ liệu sai");
    await captureErrors(async () => {
      service.create = async () => {
        throw new HttpError(500, "PRIVATE_QUERY");
      };
      const failed = response();
      await support.create({ user: {}, body: {} }, failed);
      assert.equal(failed.statusCode, 500);
      assert.ok(!JSON.stringify(failed.body).includes("PRIVATE_QUERY"));
    });
  } finally {
    service.create = original;
  }
});
test("support downloads sanitize async transfer errors as well as service errors", async () => {
  const original = service.download;
  try {
    await captureErrors(async () => {
      service.download = async () => ({
        filePath: "/private/path",
        originalName: "file.pdf",
      });
      const failed = response();
      failed.download = (_path, _name, done) => {
        done(new Error("PRIVATE_FILE_PATH"));
        return failed;
      };
      await support.download(
        { user: {}, params: { id: "1", attachmentId: "2" } },
        failed,
      );
      assert.equal(failed.statusCode, 500);
      assert.ok(!JSON.stringify(failed.body).includes("PRIVATE"));
      const partial = response();
      partial.headersSent = true;
      let destroyed = false;
      partial.destroy = () => {
        destroyed = true;
      };
      partial.download = (_path, _name, done) => {
        done(new Error("transfer failure"));
        return partial;
      };
      await support.download(
        { user: {}, params: { id: "1", attachmentId: "2" } },
        partial,
      );
      assert.equal(destroyed, true);
      assert.equal(partial.body, undefined);
    });
    service.download = async () => {
      throw new HttpError(404, "Không tìm thấy tệp");
    };
    const missing = response();
    await support.download({ user: {}, params: {} }, missing);
    assert.equal(missing.statusCode, 404);
    assert.equal(missing.body.error, "Không tìm thấy tệp");
  } finally {
    service.download = original;
  }
});
