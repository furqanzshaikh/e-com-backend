
const express = require("express");
const {
 sendMail
} = require("../controllers/customBuildEmail");

const router = express.Router();
// User Route
router.post("/mail", sendMail); // POST /api/coupons/apply

module.exports = router;
