const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const verifySuperAdmin = require("../middleware/verifySuperAdmin");

router.get("/all", verifySuperAdmin, userController.getAllUsers);
router.get("/byid/:id", verifySuperAdmin, userController.getUserById);
router.post("/create", verifySuperAdmin, userController.createUser);
router.put("/update/:id", verifySuperAdmin, userController.updateUser);
router.delete("/delete/:id", verifySuperAdmin, userController.deleteUser);

module.exports = router;
