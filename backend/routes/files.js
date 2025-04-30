import express from "express";
import { uploadFileToAzure, getUserFiles, getAllFiles } from "../controllers/userFileController.js";
import { upload } from "../middleware/upload.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

router.post("/upload", verifyToken, upload.single("file"), uploadFileToAzure);
router.get("/myfiles", verifyToken, getUserFiles);
router.get("/allfiles", verifyToken, getAllFiles); // Now accessible to all users

export default router;
