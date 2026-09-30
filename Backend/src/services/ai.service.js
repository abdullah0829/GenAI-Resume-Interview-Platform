const { GoogleGenAI } = require("@google/genai")
const { z } = require("zod")
const puppeteer = require("puppeteer")

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY
})


// ============================================================
// ZOD VALIDATION SCHEMA
// ============================================================

const interviewReportSchema = z.object({

    matchScore: z.number().min(0).max(100),

    technicalQuestions: z.array(
        z.object({
            question: z.string(),
            intention: z.string(),
            answer: z.string()
        })
    ),

    behavioralQuestions: z.array(
        z.object({
            question: z.string(),
            intention: z.string(),
            answer: z.string()
        })
    ),

    skillGaps: z.array(
        z.object({
            skill: z.string(),
            severity: z.enum([
                "low",
                "medium",
                "high"
            ])
        })
    ),

    preparationPlan: z.array(
        z.object({
            day: z.number(),
            focus: z.string(),
            tasks: z.array(z.string())
        })
    ),

    title: z.string()
})


// ============================================================
// GEMINI JSON SCHEMA
// ============================================================

const interviewResponseSchema = {

    type: "object",

    properties: {

        matchScore: {
            type: "number"
        },

        technicalQuestions: {
            type: "array",

            items: {
                type: "object",

                properties: {

                    question: {
                        type: "string"
                    },

                    intention: {
                        type: "string"
                    },

                    answer: {
                        type: "string"
                    }

                },

                required: [
                    "question",
                    "intention",
                    "answer"
                ]
            }
        },

        behavioralQuestions: {
            type: "array",

            items: {
                type: "object",

                properties: {

                    question: {
                        type: "string"
                    },

                    intention: {
                        type: "string"
                    },

                    answer: {
                        type: "string"
                    }

                },

                required: [
                    "question",
                    "intention",
                    "answer"
                ]
            }
        },

        skillGaps: {

            type: "array",

            items: {

                type: "object",

                properties: {

                    skill: {
                        type: "string"
                    },

                    severity: {
                        type: "string",
                        enum: [
                            "low",
                            "medium",
                            "high"
                        ]
                    }

                },

                required: [
                    "skill",
                    "severity"
                ]
            }
        },

        preparationPlan: {

            type: "array",

            items: {

                type: "object",

                properties: {

                    day: {
                        type: "number"
                    },

                    focus: {
                        type: "string"
                    },

                    tasks: {

                        type: "array",

                        items: {
                            type: "string"
                        }

                    }

                },

                required: [
                    "day",
                    "focus",
                    "tasks"
                ]
            }
        },

        title: {
            type: "string"
        }

    },

    required: [
        "matchScore",
        "technicalQuestions",
        "behavioralQuestions",
        "skillGaps",
        "preparationPlan",
        "title"
    ]
}


// ============================================================
// GENERATE INTERVIEW REPORT
// ============================================================

async function generateInterviewReport({
    resume,
    selfDescription,
    jobDescription
}) {

    const prompt = `

You are an expert technical interviewer.

Analyze the candidate and generate an interview preparation report.

IMPORTANT:

You MUST return valid JSON.

You MUST follow the exact JSON structure provided by the response schema.

NEVER return arrays of strings.

Every item inside technicalQuestions MUST be an OBJECT.

Every item inside behavioralQuestions MUST be an OBJECT.

Every item inside skillGaps MUST be an OBJECT.

Every item inside preparationPlan MUST be an OBJECT.

============================================================
TECHNICAL QUESTIONS
============================================================

Generate 5 technical questions.

Each question MUST look exactly like this:

{
    "question": "What is React?",
    "intention": "Tests the candidate's React knowledge.",
    "answer": "React is a JavaScript library used to build user interfaces."
}

technicalQuestions MUST look like:

[
    {
        "question": "Question 1",
        "intention": "Why this question is asked",
        "answer": "Expected answer"
    },
    {
        "question": "Question 2",
        "intention": "Why this question is asked",
        "answer": "Expected answer"
    }
]

NEVER do this:

[
    "question",
    "intention",
    "answer"
]

============================================================
BEHAVIORAL QUESTIONS
============================================================

Generate 5 behavioral questions.

Each item MUST be an OBJECT:

{
    "question": "Tell me about yourself.",
    "intention": "Tests communication skills.",
    "answer": "A suitable candidate answer."
}

============================================================
SKILL GAPS
============================================================

Generate at least 3 skill gaps.

Each item MUST be an OBJECT:

{
    "skill": "Docker",
    "severity": "medium"
}

severity MUST be one of:

low
medium
high

============================================================
PREPARATION PLAN
============================================================

Generate 5 preparation days.

Each item MUST be an OBJECT:

{
    "day": 1,
    "focus": "JavaScript fundamentals",
    "tasks": [
        "Revise promises",
        "Revise async/await",
        "Practice closures"
    ]
}

============================================================
MATCH SCORE
============================================================

Calculate a realistic match score between 0 and 100.

Example:

"matchScore": 78

The value MUST be a number.

NOT:

"matchScore": "78"

============================================================
TITLE
============================================================

"title" should contain the job position.

For example:

"title": "Web Developer Interview Preparation"

============================================================
DO NOT GENERATE THESE FIELDS
============================================================

candidate_name
position_applied
education_background
technical_skills
project_portfolio
professional_experience
strengths
areas_for_improvement
match_rating
interview_summary
hiring_recommendation

============================================================
CANDIDATE RESUME
============================================================

${resume || "No resume provided."}

============================================================
SELF DESCRIPTION
============================================================

${selfDescription || "No self description provided."}

============================================================
JOB DESCRIPTION
============================================================

${jobDescription || "No job description provided."}

============================================================

Return ONLY the JSON object.

`


    try {

        const response = await ai.models.generateContent({

            model: "gemini-3-flash-preview",

            contents: prompt,

            config: {

                responseMimeType: "application/json",

                responseSchema: interviewResponseSchema

            }

        })


        // ====================================================
        // SHOW RAW GEMINI RESPONSE
        // ====================================================

        console.log("")
        console.log("==========================================")
        console.log("           RAW AI RESPONSE")
        console.log("==========================================")
        console.log(response.text)
        console.log("==========================================")
        console.log("")


        // ====================================================
        // PARSE JSON
        // ====================================================

        let parsedResponse

        try {

            parsedResponse = JSON.parse(response.text)

        } catch (jsonError) {

            console.error("Gemini returned invalid JSON.")

            throw jsonError
        }


        // ====================================================
        // DEBUG TYPES
        // ====================================================

        console.log("==========================================")
        console.log("          RESPONSE STRUCTURE")
        console.log("==========================================")

        console.log(
            "matchScore:",
            parsedResponse.matchScore,
            typeof parsedResponse.matchScore
        )

        console.log(
            "technicalQuestions:",
            Array.isArray(parsedResponse.technicalQuestions)
                ? parsedResponse.technicalQuestions.length
                : "NOT ARRAY"
        )

        console.log(
            "technical first item:",
            parsedResponse.technicalQuestions?.[0]
        )

        console.log(
            "behavioralQuestions:",
            Array.isArray(parsedResponse.behavioralQuestions)
                ? parsedResponse.behavioralQuestions.length
                : "NOT ARRAY"
        )

        console.log(
            "behavioral first item:",
            parsedResponse.behavioralQuestions?.[0]
        )

        console.log(
            "skillGaps:",
            Array.isArray(parsedResponse.skillGaps)
                ? parsedResponse.skillGaps.length
                : "NOT ARRAY"
        )

        console.log(
            "skill first item:",
            parsedResponse.skillGaps?.[0]
        )

        console.log(
            "preparationPlan:",
            Array.isArray(parsedResponse.preparationPlan)
                ? parsedResponse.preparationPlan.length
                : "NOT ARRAY"
        )

        console.log(
            "preparation first item:",
            parsedResponse.preparationPlan?.[0]
        )

        console.log(
            "title:",
            parsedResponse.title
        )

        console.log("==========================================")
        console.log("")


        // ====================================================
        // ZOD VALIDATION
        // ====================================================

        const validatedResponse =
            interviewReportSchema.parse(parsedResponse)


        console.log("AI RESPONSE PASSED ZOD VALIDATION")


        return validatedResponse

    } catch (error) {

        console.error("")
        console.error("==========================================")
        console.error("      AI REPORT GENERATION ERROR")
        console.error("==========================================")

        console.error(error)

        console.error("==========================================")
        console.error("")

        throw error
    }
}


// ============================================================
// HTML -> PDF
// ============================================================

async function generatePdfFromHtml(htmlContent) {

    const browser = await puppeteer.launch()

    try {

        const page = await browser.newPage()

        await page.setContent(
            htmlContent,
            {
                waitUntil: "networkidle0"
            }
        )

        const pdfBuffer = await page.pdf({

            format: "A4",

            margin: {

                top: "20mm",
                bottom: "20mm",
                left: "15mm",
                right: "15mm"

            }

        })

        return pdfBuffer

    } finally {

        await browser.close()

    }
}


// ============================================================
// GENERATE RESUME PDF
// ============================================================

async function generateResumePdf({
    resume,
    selfDescription,
    jobDescription
}) {

    const resumePdfSchema = {

        type: "object",

        properties: {

            html: {
                type: "string"
            }

        },

        required: [
            "html"
        ]

    }


    const prompt = `

Create a professional ATS-friendly resume in HTML.

Use the following information.

RESUME:

${resume || "No resume provided."}

SELF DESCRIPTION:

${selfDescription || "No self description provided."}

JOB DESCRIPTION:

${jobDescription || "No job description provided."}

Tailor the resume to the target job.

Return ONLY JSON:

{
    "html": "complete HTML here"
}

Do not use markdown.

Do not use code fences.

`


    try {

        const response = await ai.models.generateContent({

            model: "gemini-3-flash-preview",

            contents: prompt,

            config: {

                responseMimeType: "application/json",

                responseSchema: resumePdfSchema

            }

        })


        const jsonContent =
            JSON.parse(response.text)


        const pdfBuffer =
            await generatePdfFromHtml(
                jsonContent.html
            )


        return pdfBuffer

    } catch (error) {

        console.error(
            "Error generating resume PDF:",
            error
        )

        throw error
    }
}


// ============================================================
// EXPORT
// ============================================================

module.exports = {

    generateInterviewReport,
    generateResumePdf

}