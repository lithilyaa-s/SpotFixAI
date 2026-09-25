const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config();

const Complaint = require("../models/Complaint");
const User = require("../models/User");
const Department = require("../models/Department");
const PriorityScore = require("../models/PriorityScore");
const StatusTimeline = require("../models/StatusTimeline");
const generateComplaintId = require("../utils/generateComplaintId");

const sampleComplaints = [
  // RED ZONE (High/Critical Priority): T. Nagar, Chennai
  {
    title: "Dangerous Open Manhole on Busy Intersection",
    description: "Deep open drainage manhole in the middle of Usman Road intersection. Two two-wheelers nearly fell into it. Severe risk of fatal injury.",
    category: "safety",
    urgency: "Critical",
    aiScore: 95,
    aiReason: "Critical public safety hazard: deep open manhole on active traffic intersection with severe accident risk.",
    department: "Public Safety",
    location: {
      address: "Usman Road, T. Nagar",
      city: "Chennai",
      state: "Tamil Nadu",
      lat: 13.0418,
      lng: 80.2341,
    },
    status: "Submitted",
  },
  {
    title: "Massive Road Cave-in after Water Pipe Burst",
    description: "The main road has collapsed creating a 4-foot deep crater. Water is actively gushing out and flooding nearby shops.",
    category: "road",
    urgency: "High",
    aiScore: 90,
    aiReason: "High priority road structural failure and flooding affecting commercial zone and vehicle transit.",
    department: "Road Maintenance",
    location: {
      address: "Pondy Bazaar, T. Nagar",
      city: "Chennai",
      state: "Tamil Nadu",
      lat: 13.0402,
      lng: 80.2337,
    },
    status: "AI Analyzed",
  },
  {
    title: "Severe Sewage Backflow Overflowing onto Footpaths",
    description: "Black foul-smelling sewage overflowing across 200 meters of pedestrian footpath. Unbearable stench and health hazard.",
    category: "drainage",
    urgency: "High",
    aiScore: 86,
    aiReason: "Biohazard and public health risk due to raw sewage discharge in dense commercial area.",
    department: "Drainage",
    location: {
      address: "Ranganathan Street, T. Nagar",
      city: "Chennai",
      state: "Tamil Nadu",
      lat: 13.0385,
      lng: 80.2312,
    },
    status: "Assigned to Department",
  },

  // YELLOW ZONE (Medium Priority): Guindy, Chennai
  {
    title: "Overflowing Garbage Dumpster Blocking Sidewalk",
    description: "Community waste container has not been cleared for 4 days. Waste spilled all over pavement attracting stray animals.",
    category: "sanitation",
    urgency: "Medium",
    aiScore: 68,
    aiReason: "Solid waste accumulation causing hygiene nuisance and pedestrian obstruction.",
    department: "Sanitation",
    location: {
      address: "Race Course Road, Guindy",
      city: "Chennai",
      state: "Tamil Nadu",
      lat: 13.0067,
      lng: 80.2115,
    },
    status: "Assigned to Department",
  },
  {
    title: "Multiple Streetlights Not Working for a Week",
    description: "Four consecutive streetlights on Industrial Estate Road are dark. Pedestrians feeling unsafe during night.",
    category: "electricity",
    urgency: "Medium",
    aiScore: 62,
    aiReason: "Illumination outage affecting pedestrian security during night hours.",
    department: "Streetlight & Electricity",
    location: {
      address: "SIDCO Industrial Estate, Guindy",
      city: "Chennai",
      state: "Tamil Nadu",
      lat: 13.0112,
      lng: 80.2089,
    },
    status: "In Progress",
  },

  // GREEN ZONE (Low Priority): Besant Nagar, Chennai
  {
    title: "Fallen Tree Branch on Beach Promenade Garden",
    description: "A small tree branch fell inside the park corner after yesterday's winds. No damage to property, just needs clearing.",
    category: "environment",
    urgency: "Low",
    aiScore: 35,
    aiReason: "Minor cosmetic landscape debris inside park garden; non-critical urgency.",
    department: "Parks & Environment",
    location: {
      address: "Elliot's Beach Promenade, Besant Nagar",
      city: "Chennai",
      state: "Tamil Nadu",
      lat: 12.9996,
      lng: 80.2694,
    },
    status: "Resolved",
  },
  {
    title: "Park Bench Wooden Slat Needs Repainting / Minor Fix",
    description: "One public bench in the municipal children's park has loose wood paint and a slightly loose slat.",
    category: "environment",
    urgency: "Low",
    aiScore: 28,
    aiReason: "Cosmetic wear on park furniture; non-hazardous.",
    department: "Parks & Environment",
    location: {
      address: "6th Avenue, Besant Nagar",
      city: "Chennai",
      state: "Tamil Nadu",
      lat: 12.9972,
      lng: 80.2648,
    },
    status: "Submitted",
  },

  // RED ZONE (High Priority): Park Street, Kolkata
  {
    title: "Exposed High-Voltage Electrical Cable Near School",
    description: "Sparking open electrical wiring hanging from municipal lamppost near school gate. Extreme shock danger to children.",
    category: "electricity",
    urgency: "Critical",
    aiScore: 98,
    aiReason: "Immediate life safety hazard: exposed live electric wires near educational institution.",
    department: "Streetlight & Electricity",
    location: {
      address: "Park Street Crossing",
      city: "Kolkata",
      state: "West Bengal",
      lat: 22.5519,
      lng: 88.3524,
    },
    status: "Assigned to Department",
  },
  {
    title: "Deep Pothole Causing Traffic Accidents",
    description: "Crater on main Park Circus connector road has damaged multiple cars and caused a motorcycle skid.",
    category: "road",
    urgency: "High",
    aiScore: 88,
    aiReason: "Severe arterial road hazard causing vehicular damage and active accident history.",
    department: "Road Maintenance",
    location: {
      address: "Park Circus Connector",
      city: "Kolkata",
      state: "West Bengal",
      lat: 22.5448,
      lng: 88.3688,
    },
    status: "Submitted",
  },
];

const seedComplaints = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/civicfix-ai";
    await mongoose.connect(mongoUri);

    console.log("Seeding sample complaints...");
    const citizen = await User.findOne({ role: "citizen" });
    if (!citizen) {
      console.error("Please run admin seeder first to create citizen account.");
      process.exit(1);
    }

    for (const cData of sampleComplaints) {
      const existing = await Complaint.findOne({ title: cData.title });
      if (existing) continue;

      const dept = await Department.findOne({ name: cData.department });

      const complaint = await Complaint.create({
        complaintId: generateComplaintId(),
        ...cData,
        reportedBy: citizen._id,
        assignedDepartmentId: dept ? dept._id : null,
      });

      await PriorityScore.create({
        complaint: complaint._id,
        complaintId: complaint.complaintId,
        category: complaint.category,
        score: complaint.aiScore,
        urgencyLevel: complaint.urgency,
        department: complaint.department,
        aiReason: complaint.aiReason,
        analysisSource: "rule_based_ai",
      });

      await StatusTimeline.create({
        complaint: complaint._id,
        status: "Submitted",
        title: "Complaint Reported",
        message: "Reported by citizen and categorized by AI engine.",
        updatedBy: citizen._id,
        updatedByRole: "citizen",
      });

      console.log(`Created complaint: [${complaint.complaintId}] ${complaint.title} (${complaint.urgency})`);
    }

    console.log("✅ Sample complaints seeded successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding complaints failed:", error.message);
    process.exit(1);
  }
};

seedComplaints();
