const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");

dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config();

const User = require("../models/User");

const usersToSeed = [
  {
    name: "Super Administrator",
    email: "superadmin@civicfix.ai",
    phone: "9876543210",
    password: "AdminPassword@123",
    role: "super_admin",
    city: "Chennai",
    address: "Central Municipal Corporation",
    isApproved: true,
    approvalStatus: "Approved",
    trustScore: 100,
    trustBadge: "Super Admin",
  },
  {
    name: "City Admin",
    email: "admin@civicfix.ai",
    phone: "9876543211",
    password: "AdminPassword@123",
    role: "admin",
    city: "Chennai",
    address: "Zonal Municipal Office",
    isApproved: true,
    approvalStatus: "Approved",
    trustScore: 90,
    trustBadge: "Verified Admin",
  },
  {
    name: "Road Maintenance Officer",
    email: "road@civicfix.ai",
    phone: "9000000001",
    password: "OfficerPassword@123",
    role: "department_officer",
    city: "Chennai",
    address: "Roads & Highways Department",
    isApproved: true,
    approvalStatus: "Approved",
    trustScore: 85,
    trustBadge: "Department Officer",
  },
  {
    name: "Sanitation Officer",
    email: "sanitation@civicfix.ai",
    phone: "9000000002",
    password: "OfficerPassword@123",
    role: "department_officer",
    city: "Chennai",
    address: "Solid Waste Management Division",
    isApproved: true,
    approvalStatus: "Approved",
    trustScore: 85,
    trustBadge: "Department Officer",
  },
  {
    name: "Demo Citizen",
    email: "citizen@civicfix.ai",
    phone: "9876543212",
    password: "CitizenPassword@123",
    role: "citizen",
    city: "Chennai",
    address: "Anna Nagar, Chennai",
    isApproved: true,
    approvalStatus: "Approved",
    trustScore: 75,
    trustBadge: "Active Citizen",
  },
];

const seedUsers = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/civicfix-ai";
    await mongoose.connect(mongoUri);

    console.log("Seeding admin and officer accounts...");

    for (const userData of usersToSeed) {
      const existing = await User.findOne({ email: userData.email });
      if (existing) {
        existing.name = userData.name;
        existing.phone = userData.phone;
        existing.role = userData.role;
        existing.city = userData.city;
        existing.address = userData.address;
        existing.isApproved = true;
        existing.approvalStatus = "Approved";
        existing.trustScore = userData.trustScore;
        existing.password = userData.password; // pre('save') will hash it
        await existing.save();
        console.log(`Updated user: ${userData.email} (${userData.role})`);
      } else {
        await User.create(userData);
        console.log(`Created user: ${userData.email} (${userData.role})`);
      }
    }

    console.log("✅ All user accounts seeded successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error.message);
    process.exit(1);
  }
};

seedUsers();
