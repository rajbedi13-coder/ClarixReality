import { Router, type IRouter } from "express";
import healthRouter from "./health";
import articlesRouter from "./articles";
import commentsRouter from "./comments";
import categoriesRouter from "./categories";
import statsRouter from "./stats";
import newsletterRouter from "./newsletter";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(articlesRouter);
router.use(commentsRouter);
router.use(categoriesRouter);
router.use(statsRouter);
router.use(newsletterRouter);
router.use(authRouter);

export default router;
