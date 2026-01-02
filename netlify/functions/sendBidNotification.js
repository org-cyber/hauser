import { Resend } from "resend";
import admin from "firebase-admin";

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
    });
}

const db = admin.firestore();
const resend = new Resend(process.env.RESEND_API_KEY);

export const handler = async (event) => {
    try {
        console.log("📬 Received email notification request");

        if (event.httpMethod !== "POST") {
            console.log("❌ Invalid method:", event.httpMethod);
            return {
                statusCode: 405,
                body: JSON.stringify({ error: "Method Not Allowed" })
            };
        }

        const { propertyId, bidAmount, bidderName } = JSON.parse(event.body);

        console.log("📦 Received data:", { propertyId, bidAmount, bidderName });

        // Validate required fields
        if (!propertyId || !bidAmount) {
            console.log("❌ Missing required fields:", { propertyId, bidAmount });
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: "Missing required fields",
                    received: { propertyId, bidAmount, bidderName }
                })
            };
        }

        // Get property
        console.log("🔍 Fetching property:", propertyId);
        const propertySnap = await db.collection("properties").doc(propertyId).get();

        if (!propertySnap.exists) {
            console.log("❌ Property not found:", propertyId);
            return {
                statusCode: 404,
                body: JSON.stringify({ error: "Property not found", propertyId })
            };
        }

        const property = propertySnap.data();
        console.log("✅ Property found:", property.title);

        // Check for owner ID - listingOwnerUid is the primary field in your system
        const ownerId = property.listingOwnerUid ||
            property.ownerId ||
            property.uid ||
            property.userId;

        console.log("👤 Owner ID:", ownerId);
        console.log("📋 Property field used:", property.listingOwnerUid ? "listingOwnerUid" : "fallback");

        // Get owner
        if (!ownerId) {
            console.log("❌ Property has no owner field");
            console.log("Available fields:", Object.keys(property));
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: "Property missing owner field (listingOwnerUid)",
                    availableFields: Object.keys(property)
                })
            };
        }

        console.log("🔍 Fetching owner:", ownerId);
        const ownerSnap = await db.collection("users").doc(ownerId).get();

        if (!ownerSnap.exists) {
            console.log("❌ Owner not found:", property.ownerId);
            return {
                statusCode: 404,
                body: JSON.stringify({ error: "Owner not found", ownerId: property.ownerId })
            };
        }

        const owner = ownerSnap.data();
        console.log("✅ Owner found, email:", owner.email ? "present" : "missing");

        if (!owner?.email) {
            console.log("❌ Owner has no email");
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Owner email not found" })
            };
        }

        // Send email
        console.log("📧 Sending email to:", owner.email);
        await resend.emails.send({
            from: "onboarding@resend.dev",
            to: owner.email,
            subject: `New bid on your property: ${property.title}`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
                        .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                        .header { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #ffffff; padding: 30px 20px; text-align: center; }
                        .header h1 { margin: 0; font-size: 24px; }
                        .content { padding: 30px 20px; }
                        .content h2 { color: #1a1a1a; margin-top: 0; font-size: 20px; }
                        .content p { color: #4a4a4a; line-height: 1.6; margin: 10px 0; }
                        .bid-details { background-color: #f8f9fa; border-left: 4px solid #f97316; padding: 15px; margin: 20px 0; border-radius: 4px; }
                        .bid-details strong { color: #1a1a1a; display: inline-block; min-width: 120px; }
                        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
                        .button { display: inline-block; background-color: #f97316; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
                        .button:hover { background-color: #ea580c; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🏠 New Bid Received!</h1>
                        </div>
                        <div class="content">
                            <h2>Great news! Someone is interested in your property.</h2>
                            <p>You've received a new bid on your listing. Here are the details:</p>
                            
                            <div class="bid-details">
                                <p><strong>Property:</strong> ${property.title}</p>
                                <p><strong>Bid Amount:</strong> ₦${bidAmount.toLocaleString()}</p>
                                <p><strong>Bidder:</strong> ${bidderName || "Anonymous"}</p>
                            </div>
                            
                            <p>Log in to your Hauser account to view more details and respond to this bid.</p>
                            
                            <center>
                                <a href="https://yourdomain.com/dashboard" class="button">View Bid Details</a>
                            </center>
                        </div>
                        <div class="footer">
                            <p>&copy; ${new Date().getFullYear()} Hauser NG. All rights reserved.</p>
                            <p>You're receiving this email because you have a property listing on Hauser.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        });

        console.log("✅ Email sent successfully!");

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                message: "Notification sent successfully"
            })
        };

    } catch (err) {
        console.error("❌ Error in sendBidNotification:", err);
        console.error("Error details:", {
            message: err.message,
            stack: err.stack,
            name: err.name
        });

        return {
            statusCode: 500,
            body: JSON.stringify({
                error: "Internal Server Error",
                message: err.message,
                details: err.toString()
            })
        };
    }
};