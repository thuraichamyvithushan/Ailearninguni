import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { mode } from "../config/firebase.js";
import { store } from "../services/store.js";
import { validate } from "../middleware/validate.js";
import * as schemas from "../validators/schemas.js";
import { assert, asyncRoute as run } from "../utils/errors.js";
import * as auth from "../controllers/auth.js";
import * as courses from "../controllers/courses.js";
const router = Router();
const sensitive = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many attempts. Try again later." },
});
router.get("/health", (_req, res) =>
  res.json({ status: "ok", authMode: mode }),
);
router.post(
  "/auth/login",
  sensitive,
  validate(schemas.credentials),
  run(auth.demoLogin),
);
router.post(
  "/auth/register",
  sensitive,
  validate(schemas.credentials),
  run(auth.demoRegister),
);
router.get("/courses", run(courses.courseList));
router.get("/courses/:id", run(courses.courseDetail));
router.get(
  "/categories",
  run(async (_req, res) => res.json(await store.list("categories"))),
);
router.get(
  "/packages",
  run(async (_req, res) =>
    res.json((await store.list("packages")).filter((p) => p.active)),
  ),
);
router.get(
  "/instructors",
  run(async (_req, res) =>
    res.json(
      (await store.list("instructors")).map(({ id, name, title }) => ({
        id,
        name,
        title,
      })),
    ),
  ),
);
router.get(
  "/learning-paths",
  run(async (_req, res) => {
    const paths = await store.list("learningPaths");
    const catalog = (await store.list("courses")).filter(
      (course) => course.published,
    );
    res.json(
      paths
        .map((path) => {
          const courses = path.courseIds
            .map((id) => catalog.find((course) => course.id === id))
            .filter(Boolean);
          return {
            ...path,
            courseIds: courses.map((course) => course.id),
            courses,
          };
        })
        .filter((path) => path.courses.length),
    );
  }),
);
router.get(
  "/certificates/:id",
  run(async (req, res) => {
    const c = await store.get("certificates", req.params.id);
    assert(c?.valid, 404, "Certificate not found or revoked.");
    const { userId, ...publicCertificate } = c;
    res.json(publicCertificate);
  }),
);
router.post(
  "/contact",
  sensitive,
  validate(
    z.object({
      name: z.string().min(1).max(200),
      email: z.string().email(),
      message: z.string().min(10).max(5000),
    }),
  ),
  run(async (req, res) => {
    await store.transaction((db) =>
      db.put("supportRequests", randomUUID(), { ...req.body, status: "New" }),
    );
    res.status(201).json({
      message:
        "Your request has been saved. Our team can review it in the admin portal.",
    });
  }),
);

export default router;
