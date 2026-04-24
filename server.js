require("dotenv").config();

const express = require("express");
const nodemailer = require("nodemailer");
const multer = require("multer");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;
const MAIL_USER = process.env.MAIL_USER;
const MAIL_PASS = process.env.MAIL_PASS;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

app.use(
    cors({
        origin: ALLOWED_ORIGIN === "*" ? true : ALLOWED_ORIGIN,
    })
);
app.use(express.json());
app.use(express.static(__dirname));

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024,
    },
});

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getTransporter() {
    if (!MAIL_USER || !MAIL_PASS) {
        throw new Error(
            "Missing mail configuration. Set MAIL_USER and MAIL_PASS environment variables."
        );
    }

    return nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: MAIL_USER,
            pass: MAIL_PASS,
        },
    });
}

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/health", (req, res) => {
    res.json({
        ok: true,
        mailConfigured: Boolean(MAIL_USER && MAIL_PASS),
    });
});

app.post("/send-mails", upload.single("file"), async (req, res) => {
    try {
        const { subject, message, emails } = req.body;
        const parsedEmails = JSON.parse(emails || "[]");

        if (!subject || !message) {
            return res.status(400).json({
                ok: false,
                error: "Subject and message are required.",
            });
        }

        if (!Array.isArray(parsedEmails)) {
            return res.status(400).json({
                ok: false,
                error: "Emails must be a JSON array.",
            });
        }

        const emailList = parsedEmails
            .map((email) => String(email).trim())
            .filter(Boolean);

        if (emailList.length === 0) {
            return res.status(400).json({
                ok: false,
                error: "Please provide at least one recipient email.",
            });
        }

        const invalidEmails = emailList.filter((email) => !isValidEmail(email));
        if (invalidEmails.length > 0) {
            return res.status(400).json({
                ok: false,
                error: "One or more recipient emails are invalid.",
                invalidEmails,
            });
        }

        const transporter = getTransporter();
        const attachment = req.file
            ? [
                {
                    filename: req.file.originalname,
                    content: req.file.buffer,
                },
            ]
            : [];

        const settled = await Promise.allSettled(
            emailList.map((email) =>
                transporter.sendMail({
                    from: MAIL_USER,
                    to: email,
                    subject,
                    text: message,
                    attachments: attachment,
                })
            )
        );

        const failures = settled
            .map((result, index) => ({ result, email: emailList[index] }))
            .filter(({ result }) => result.status === "rejected")
            .map(({ result, email }) => ({
                email,
                reason:
                    result.reason && result.reason.message
                        ? result.reason.message
                        : "Unknown send failure",
            }));

        const sentCount = emailList.length - failures.length;
        const allSucceeded = failures.length === 0;

        return res.status(allSucceeded ? 200 : 207).json({
            ok: allSucceeded,
            totalRecipients: emailList.length,
            sentCount,
            failedCount: failures.length,
            failures,
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            ok: false,
            error: err.message || "Error sending emails",
        });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));