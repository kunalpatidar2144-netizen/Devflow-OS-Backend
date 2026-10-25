import express from "express";import { body } from "express-validator";

import { signupUser, loginUser, getProfile, updateProfile,changePassword,uploadProfileImage} from "../controllers/user.controller.js";

import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

import upload from "../middleware/upload.js";
router.put(
    "/profile-image",
    authMiddleware,
    upload.single("profileImage"),
    uploadProfileImage
);

router.post(
    "/signup",
    [
        body("fullName")
            .notEmpty()
            .withMessage("Full name is required"),

        body("email")
            .isEmail()
            .withMessage("Please enter a valid email"),

        body("password")
            .isLength({ min: 6 })
            .withMessage("Password must be at least 6 characters"),
    ],
    signupUser
);

router.post("/login", loginUser);

router.get("/profile", authMiddleware, getProfile);

router.put("/profile", authMiddleware, updateProfile);

router.put("/change-password", authMiddleware, changePassword);





export default router;