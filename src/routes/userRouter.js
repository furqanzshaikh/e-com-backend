const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const verifySuperAdmin = require("../middleware/verifySuperAdmin");

router.get("/all", verifySuperAdmin, userController.getAllUsers);
router.get("/byid/:id", verifySuperAdmin, userController.getUserById);
router.post("/create", userController.createUser);
router.post("/verify-otp", userController.verifyOtp);
router.post("/resend-otp", userController.resendOtp);
router.put("/update/:id", userController.updateUser);
router.delete("/delete/:id", userController.deleteUser);

module.exports = router;
