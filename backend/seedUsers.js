
require("dotenv").config();

const mongoose = require("mongoose");
const { User } = require("./models");
const { ROLES } = require("./config/constants");

const PASSWORD = "Edupass@123";

const users = [
    { loginId: "ADMIN001", name: "Admin", role: ROLES.ADMIN },
    { loginId: "HODCSE", name: "CSE HOD", role: ROLES.HOD },
    { loginId: "HODECE", name: "ECE HOD", role: ROLES.HOD },
    { loginId: "FAC101", name: "Faculty 101", role: ROLES.FACULTY },
    { loginId: "FAC102", name: "Faculty 102", role: ROLES.FACULTY },
    { loginId: "FAC103", name: "Faculty 103", role: ROLES.FACULTY },
    ...Array.from({ length: 8 }, (_, i) => ({
        loginId: `21CSE${String(i + 1).padStart(3, "0")}`,
        name: `Student ${i + 1}`,
        role: ROLES.STUDENT
    }))
];

async function seedUsers() {
    if (!process.env.MONGODB_URI) {
        throw new Error("MONGODB_URI is missing from backend/.env");
    }

    await mongoose.connect(process.env.MONGODB_URI);

    try {
        for (const userData of users) {
            const email =
                `${userData.loginId.toLowerCase()}@edupass.local`;

            let user = await User.findOne({
                loginId: userData.loginId
            });

            if (!user) {
                user = new User({
                    ...userData,
                    email,
                    password: PASSWORD,
                    mustChangePassword: true
                });
            } else {
                user.name = userData.name;
                user.email = email;
                user.role = userData.role;
                user.password = PASSWORD;
                user.mustChangePassword = true;
            }

            // User.js hashes the password in its save middleware.
            await user.save();

            console.log(`Seeded: ${userData.loginId}`);
        }

        console.log("Successfully seeded all 14 users.");
    } finally {
        await mongoose.disconnect();
    }
}

seedUsers().catch(error => {
    console.error("Seeding failed:", error.message);
    process.exitCode = 1;
});
