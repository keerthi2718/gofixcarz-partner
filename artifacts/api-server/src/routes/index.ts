import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import notificationsRouter from "./notifications.js";
import jobsRouter from "./jobs.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(notificationsRouter);
router.use(jobsRouter);

export default router;
