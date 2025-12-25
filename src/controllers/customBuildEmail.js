const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");

const sendMail = async (req, res) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Authorization token missing" });
    }

    const token = authHeader.split(" ")[1]; // Extract the token

    // Decode token to get user info
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET); 
      console.log(decoded)
    } catch (err) {
      return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }

    const { name, email } = decoded;
    if (!name || !email) {
      return res.status(400).json({ success: false, message: "Invalid user info in token" });
    }

    const { orderDetails } = req.body;
    if (!orderDetails || Object.keys(orderDetails).length === 0) {
      return res.status(400).json({ success: false, message: "Order details are required" });
    }

    // Configure nodemailer
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Build order details as HTML
    let orderHtml = "<h3>Order Confirmation</h3><ul>";
    for (const [component, value] of Object.entries(orderDetails)) {
      orderHtml += `<li><strong>${component}:</strong> ${value}</li>`;
    }
    orderHtml += "</ul>";

    // Send email
    await transporter.sendMail({
      from: `"Maxtech India" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your Maxtech Order Confirmation",
      html: `<p>Hi ${name},</p>
             <p>Thank you for your order! Here are your order details:</p>
             ${orderHtml}
             <p>We will notify you once your order is shipped.</p>`,
    });

    return res.json({ success: true, message: "Confirmation email sent successfully" });
  } catch (err) {
    console.error("Error sending confirmation email:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = { sendMail };


module.exports = { sendMail };
