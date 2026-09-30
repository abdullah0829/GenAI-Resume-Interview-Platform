const pdfParse = require("pdf-parse")

const {
    generateInterviewReport,
    generateResumePdf
} = require("../services/ai.service")

const interviewReportModel = require("../models/interviewReport.model")


// ─────────────────────────────────────────────────────────────────────────────
// Generate Interview Report
// ─────────────────────────────────────────────────────────────────────────────

async function generateInterViewReportController(req, res) {

    try {

        let resumeContent = ""

        // If user uploaded a resume, extract its text
        if (req.file) {

            const parsedResume = await (
                new pdfParse.PDFParse(
                    Uint8Array.from(req.file.buffer)
                )
            ).getText()

            resumeContent = parsedResume.text
        }

        const { selfDescription, jobDescription } = req.body


        // Job description is required
        if (!jobDescription || !jobDescription.trim()) {

            return res.status(400).json({
                message: "Job description is required."
            })

        }


        // At least resume OR self description is required
        if (
            !resumeContent.trim() &&
            (!selfDescription || !selfDescription.trim())
        ) {

            return res.status(400).json({
                message: "Either resume or self description is required."
            })

        }


        // Generate report using Gemini
        const interViewReportByAi = await generateInterviewReport({

            resume: resumeContent,

            selfDescription: selfDescription || "",

            jobDescription

        })


        console.log("AI RESPONSE:")
        console.log(interViewReportByAi)


        // Make sure AI returned a title
        if (
            !interViewReportByAi.title ||
            !interViewReportByAi.title.trim()
        ) {

            interViewReportByAi.title = "Interview Preparation Plan"

        }


        // Save report in MongoDB
        const interviewReport = await interviewReportModel.create({

            user: req.user.id,

            resume: resumeContent,

            selfDescription: selfDescription || "",

            jobDescription,

            ...interViewReportByAi

        })


        return res.status(201).json({

            message: "Interview report generated successfully.",

            interviewReport

        })

    } catch (error) {

        console.error(
            "Generate Interview Report Error:",
            error
        )

        return res.status(500).json({

            message: "Failed to generate interview report.",

            error: error.message

        })

    }

}


// ─────────────────────────────────────────────────────────────────────────────
// Get Interview Report By ID
// ─────────────────────────────────────────────────────────────────────────────

async function getInterviewReportByIdController(req, res) {

    try {

        const { interviewId } = req.params


        const interviewReport = await interviewReportModel.findOne({

            _id: interviewId,

            user: req.user.id

        })


        if (!interviewReport) {

            return res.status(404).json({

                message: "Interview report not found."

            })

        }


        return res.status(200).json({

            message: "Interview report fetched successfully.",

            interviewReport

        })

    } catch (error) {

        console.error(
            "Get Interview Report Error:",
            error
        )

        return res.status(500).json({

            message: "Failed to fetch interview report.",

            error: error.message

        })

    }

}


// ─────────────────────────────────────────────────────────────────────────────
// Get All Interview Reports
// ─────────────────────────────────────────────────────────────────────────────

async function getAllInterviewReportsController(req, res) {

    try {

        const interviewReports = await interviewReportModel
            .find({
                user: req.user.id
            })
            .sort({
                createdAt: -1
            })
            .select(
                "-resume -selfDescription -jobDescription -__v -technicalQuestions -behavioralQuestions -skillGaps -preparationPlan"
            )


        return res.status(200).json({

            message: "Interview reports fetched successfully.",

            interviewReports

        })

    } catch (error) {

        console.error(
            "Get All Interview Reports Error:",
            error
        )

        return res.status(500).json({

            message: "Failed to fetch interview reports.",

            error: error.message

        })

    }

}


// ─────────────────────────────────────────────────────────────────────────────
// Generate Resume PDF
// ─────────────────────────────────────────────────────────────────────────────

async function generateResumePdfController(req, res) {

    try {

        const { interviewReportId } = req.params


        // Important:
        // Only allow the logged-in user to access their own report
        const interviewReport = await interviewReportModel.findOne({

            _id: interviewReportId,

            user: req.user.id

        })


        if (!interviewReport) {

            return res.status(404).json({

                message: "Interview report not found."

            })

        }


        const {
            resume,
            jobDescription,
            selfDescription
        } = interviewReport


        const pdfBuffer = await generateResumePdf({

            resume,

            jobDescription,

            selfDescription

        })


        res.set({

            "Content-Type": "application/pdf",

            "Content-Disposition":
                `attachment; filename=resume_${interviewReportId}.pdf`

        })


        return res.send(pdfBuffer)

    } catch (error) {

        console.error(
            "Generate Resume PDF Error:",
            error
        )

        return res.status(500).json({

            message: "Failed to generate resume PDF.",

            error: error.message

        })

    }

}


module.exports = {

    generateInterViewReportController,

    getInterviewReportByIdController,

    getAllInterviewReportsController,

    generateResumePdfController

}