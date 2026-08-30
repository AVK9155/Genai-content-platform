import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DISTRICTS = ["Kamrup", "Nagaon", "Jorhat", "Dibrugarh", "Tinsukia", "Golaghat", "Sonitpur", "Lakhimpur", "Cachar", "Karimganj"];

const VILLAGES: Record<string, string[]> = {
  Kamrup: ["Azara", "Bhetapara", "Chandrapur", "Jalukbari", "Azarigaon"],
  Nagaon: ["Raha", "Kaliabor", "Jamunamukh", "Doboka", "Hojai"],
  Jorhat: ["Majuli", "Teok", "Golaghat Town", "Borhola", "Mangaldoi"],
  Dibrugarh: ["Chowkham", "Moran", "Tipling", "Naharkatia", "Duliajan"],
  Tinsukia: ["Makum", "Digboi", "Margherita", "Tinsukia Town", "Sadiya"],
  Golaghat: ["Bokakhat", "Kaziranga", "Gurjan", "Bathuary", "Dergaon"],
  Sonitpur: ["Tezpur", "Dhekiajuli", "Biswanath", "Chariali", "Naduar"],
  Lakhimpur: ["North Lakhimpur", "Dhakuakhana", "Bihpuria", "Narayanpur", "Gogamukh"],
  Cachar: ["Silchar", "Sonai", "Lakhipur", "Udarbond", "Kathalkhola"],
  Karimganj: ["Karimganj Town", "Badarpur", "Ratabari", "Patharkandi", "Nilambazar"],
};

async function main() {
  console.log("Seeding database...");

  // Clear all data
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.taskAssignment.deleteMany();
  await prisma.caseVerification.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.riskScore.deleteMany();
  await prisma.symptomReport.deleteMany();
  await prisma.waterQualityReport.deleteMany();
  await prisma.waterSource.deleteMany();
  await prisma.crowdsourcedReport.deleteMany();
  await prisma.weatherData.deleteMany();
  await prisma.systemSettings.deleteMany();
  await prisma.governmentDataImport.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);

  // ─── Users ──────────────────────────────────────────
  const admin = await prisma.user.create({
    data: { email: "admin@jal-suraksha.gov.in", passwordHash, name: "Dr. Rajesh Kumar", role: "STATE_ADMIN", state: "Assam", language: "en" },
  });

  const districtOfficer = await prisma.user.create({
    data: { email: "district@jal-suraksha.gov.in", passwordHash, name: "Anita Das", role: "DISTRICT_OFFICER", district: "Kamrup", state: "Assam", language: "en" },
  });

  const phcDoctor = await prisma.user.create({
    data: { email: "doctor@jal-suraksha.gov.in", passwordHash, name: "Dr. Pranab Gogoi", role: "PHC_DOCTOR", district: "Kamrup", village: "Azara", state: "Assam", language: "en", latitude: 26.1445, longitude: 91.7362 },
  });

  const ashaNames = ["Priya Borah", "Minakshi Bora", "Rina Das", "Anjali Kalita", "Sunita Nath", "Mamoni Gogoi", "Rupali Saikia", "Jyotsna Deka", "Manorama Borah", "Lakshmi Deka"];
  const ashaWorkers = [];
  for (let i = 0; i < 10; i++) {
    const district = DISTRICTS[i % DISTRICTS.length];
    const village = VILLAGES[district][0];
    const worker = await prisma.user.create({
      data: {
        email: `asha${i + 1}@jal-suraksha.gov.in`,
        passwordHash,
        name: ashaNames[i],
        role: "ASHA_WORKER",
        district,
        village,
        state: "Assam",
        phone: `+9198765432${String(10 + i).padStart(2, "0")}`,
        latitude: 26.1 + Math.random() * 2,
        longitude: 91.5 + Math.random() * 2,
        language: i % 3 === 0 ? "as" : i % 3 === 1 ? "bn" : "hi",
      },
    });
    ashaWorkers.push(worker);
  }

  const villagers = [];
  for (let i = 0; i < 20; i++) {
    const district = DISTRICTS[i % DISTRICTS.length];
    const village = VILLAGES[district][Math.floor(Math.random() * VILLAGES[district].length)];
    const villager = await prisma.user.create({
      data: {
        email: `villager${i + 1}@example.com`,
        passwordHash,
        name: `Villager ${i + 1}`,
        role: "VILLAGER",
        district,
        village,
        state: "Assam",
        phone: `+9198765123${String(40 + i).padStart(2, "0")}`,
        latitude: 26.1 + Math.random() * 2,
        longitude: 91.5 + Math.random() * 2,
        language: ["en", "as", "bn", "hi"][i % 4],
      },
    });
    villagers.push(villager);
  }
  console.log(`  Created ${1 + 1 + 1 + ashaWorkers.length + villagers.length} users`);

  // ─── Water Sources ──────────────────────────────────
  const sourceTypes = ["well", "river", "pond", "tap", "borewell"];
  const sources: any[] = [];
  for (const district of DISTRICTS) {
    for (const village of VILLAGES[district]) {
      for (let j = 0; j < 2; j++) {
        const source = await prisma.waterSource.create({
          data: {
            name: `${village} ${sourceTypes[j]} ${j + 1}`,
            type: sourceTypes[j],
            latitude: 26.1 + Math.random() * 2,
            longitude: 91.5 + Math.random() * 2,
            village,
            district,
            state: "Assam",
            isContaminated: Math.random() < 0.3,
          },
        });
        sources.push(source);
      }
    }
  }
  console.log(`  Created ${sources.length} water sources`);

  // ─── Water Quality Reports ──────────────────────────
  let waterReportCount = 0;
  for (const source of sources) {
    const numReports = Math.floor(Math.random() * 8) + 1;
    for (let k = 0; k < numReports; k++) {
      const daysAgo = Math.floor(Math.random() * 90);
      const testDate = new Date();
      testDate.setDate(testDate.getDate() - daysAgo);
      const isContaminated = Math.random() < 0.25;

      await prisma.waterQualityReport.create({
        data: {
          sourceId: source.id,
          userId: ashaWorkers[Math.floor(Math.random() * ashaWorkers.length)].id,
          testDate,
          phLevel: isContaminated ? (Math.random() < 0.5 ? 5.5 + Math.random() : 8.5 + Math.random()) : 6.8 + Math.random() * 1.2,
          turbidity: isContaminated ? 10 + Math.random() * 40 : Math.random() * 4,
          tds: isContaminated ? 600 + Math.random() * 400 : 100 + Math.random() * 200,
          chlorineResidual: isContaminated ? 0 : 0.2 + Math.random() * 0.5,
          ecoliPresence: isContaminated && Math.random() < 0.6,
          coliformCount: isContaminated ? Math.floor(Math.random() * 200) : 0,
          enteredBy: ashaWorkers[Math.floor(Math.random() * ashaWorkers.length)].name,
          kitUsed: ["WaterScope", "Aquagenx", "Pooltest 9", "iCheck"][Math.floor(Math.random() * 4)],
        },
      });
      waterReportCount++;
    }
  }
  console.log(`  Created ${waterReportCount} water quality reports`);

  // ─── Symptom Reports ────────────────────────────────
  const symptomTypes = ["DIARRHEA", "VOMITING", "FEVER", "DEHYDRATION", "NAUSEA", "ABDOMINAL_PAIN", "BLOODY_STOOL"];
  const severityLevels = ["MILD", "MODERATE", "SEVERE", "CRITICAL"];
  const ageGroups = ["INFANT", "TODDLER", "CHILD", "ADULT", "ELDERLY"];

  let symptomCount = 0;
  const outbreakVillages = ["Azara", "Raha", "Majuli", "Chowkham"];

  for (const village of outbreakVillages) {
    const district = Object.entries(VILLAGES).find(([_, v]) => v.includes(village))?.[0] || "Kamrup";
    const clusterSize = 8 + Math.floor(Math.random() * 8);
    for (let k = 0; k < clusterSize; k++) {
      const daysAgo = Math.floor(Math.random() * 7);
      const onsetDate = new Date();
      onsetDate.setDate(onsetDate.getDate() - daysAgo);

      await prisma.symptomReport.create({
        data: {
          reporterName: villagers[Math.floor(Math.random() * villagers.length)].name,
          reporterPhone: `+9198765${Math.floor(10000 + Math.random() * 89999)}`,
          village,
          district,
          state: "Assam",
          latitude: 26.1 + Math.random() * 2,
          longitude: 91.5 + Math.random() * 2,
          symptomType: symptomTypes[Math.floor(Math.random() * symptomTypes.length)],
          severity: severityLevels[Math.floor(Math.random() * 3) + 1],
          onsetDate,
          ageGroup: ageGroups[Math.floor(Math.random() * ageGroups.length)],
          affectedCount: 1 + Math.floor(Math.random() * 3),
          waterSourceUsed: sources.find((s) => s.village === village)?.name || "Unknown",
          source: ["MOBILE", "ASHA", "SMS"][Math.floor(Math.random() * 3)],
          isVerified: Math.random() < 0.6,
        },
      });
      symptomCount++;
    }
  }

  for (let i = 0; i < 50; i++) {
    const district = DISTRICTS[Math.floor(Math.random() * DISTRICTS.length)];
    const village = VILLAGES[district][Math.floor(Math.random() * VILLAGES[district].length)];
    const daysAgo = Math.floor(Math.random() * 60);
    const onsetDate = new Date();
    onsetDate.setDate(onsetDate.getDate() - daysAgo);

    await prisma.symptomReport.create({
      data: {
        reporterName: villagers[Math.floor(Math.random() * villagers.length)].name,
        village,
        district,
        state: "Assam",
        latitude: 26.1 + Math.random() * 2,
        longitude: 91.5 + Math.random() * 2,
        symptomType: symptomTypes[Math.floor(Math.random() * symptomTypes.length)],
        severity: severityLevels[Math.floor(Math.random() * severityLevels.length)],
        onsetDate,
        ageGroup: ageGroups[Math.floor(Math.random() * ageGroups.length)],
        affectedCount: 1 + Math.floor(Math.random() * 2),
        source: ["MOBILE", "WEB", "ASHA", "SMS", "IVR"][Math.floor(Math.random() * 5)],
        isVerified: Math.random() < 0.5,
      },
    });
    symptomCount++;
  }
  console.log(`  Created ${symptomCount} symptom reports`);

  // ─── Weather Data ───────────────────────────────────
  let weatherCount = 0;
  for (const district of DISTRICTS) {
    for (let d = 0; d < 90; d++) {
      const date = new Date();
      date.setDate(date.getDate() - d);
      const isMonsoon = date.getMonth() >= 5 && date.getMonth() <= 9;

      await prisma.weatherData.create({
        data: {
          district,
          state: "Assam",
          date,
          rainfallMm: isMonsoon ? Math.random() * 50 : Math.random() * 10,
          temperature: isMonsoon ? 25 + Math.random() * 8 : 15 + Math.random() * 15,
          humidity: isMonsoon ? 70 + Math.random() * 25 : 40 + Math.random() * 30,
          windSpeed: 5 + Math.random() * 20,
          source: "IMD",
        },
      });
      weatherCount++;
    }
  }
  console.log(`  Created ${weatherCount} weather records`);

  // ─── Alerts ─────────────────────────────────────────
  for (const village of outbreakVillages) {
    const district = Object.entries(VILLAGES).find(([_, v]) => v.includes(village))?.[0] || "Kamrup";
    await prisma.alert.create({
      data: {
        title: `Outbreak Alert: ${village}`,
        message: `Multiple cases of water-borne disease reported in ${village}, ${district}. Immediate investigation recommended.`,
        riskLevel: Math.random() < 0.5 ? "HIGH" : "CRITICAL",
        village,
        district,
        state: "Assam",
        latitude: 26.1 + Math.random() * 2,
        longitude: 91.5 + Math.random() * 2,
        triggerType: "THRESHOLD_BREACH",
        isActive: true,
      },
    });
  }
  console.log("  Created outbreak alerts");

  // ─── Risk Scores ────────────────────────────────────
  for (const village of outbreakVillages) {
    const district = Object.entries(VILLAGES).find(([_, v]) => v.includes(village))?.[0] || "Kamrup";
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 1);
    await prisma.riskScore.create({
      data: {
        village,
        district,
        state: "Assam",
        latitude: 26.1 + Math.random() * 2,
        longitude: 91.5 + Math.random() * 2,
        riskLevel: Math.random() < 0.5 ? "HIGH" : "CRITICAL",
        score: 60 + Math.random() * 40,
        factors: JSON.stringify({ symptomScore: 25, waterScore: 20, rainfallScore: 15, historicalScore: 15 }),
        calculatedAt: new Date(),
        validUntil,
      },
    });
  }
  console.log("  Created risk scores");

  // ─── Crowdsourced Reports ───────────────────────────
  const reportCategories = ["CONTAMINATED_WATER", "ILLNESS_CLUSTER", "BROKEN_PIPE", "OPEN_DRAINAGE", "STAGNANT_WATER"];
  const reportStatuses = ["NEW", "UNDER_REVIEW", "VERIFIED", "ACTION_TAKEN", "RESOLVED"];
  for (let i = 0; i < 15; i++) {
    const district = DISTRICTS[Math.floor(Math.random() * DISTRICTS.length)];
    const village = VILLAGES[district][Math.floor(Math.random() * VILLAGES[district].length)];
    await prisma.crowdsourcedReport.create({
      data: {
        reporterName: `Citizen ${i + 1}`,
        category: reportCategories[Math.floor(Math.random() * reportCategories.length)],
        description: `Reported issue in ${village}: suspected contaminated water source, multiple families affected.`,
        latitude: 26.1 + Math.random() * 2,
        longitude: 91.5 + Math.random() * 2,
        village,
        district,
        state: "Assam",
        status: reportStatuses[Math.floor(Math.random() * reportStatuses.length)],
      },
    });
  }
  console.log("  Created crowdsourced reports");

  // ─── Case Verifications & Tasks ─────────────────────
  const caseStatuses = ["PENDING", "IN_PROGRESS", "VERIFIED", "ACTION_TAKEN", "RESOLVED"];
  const taskTypes = ["field_verification", "sample_collection", "awareness", "water_testing"];
  const taskPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];

  for (let i = 0; i < 8; i++) {
    const caseRecord = await prisma.caseVerification.create({
      data: {
        reportId: `report-${i}`,
        reportType: Math.random() < 0.5 ? "symptom" : "water_quality",
        status: caseStatuses[i % caseStatuses.length],
        verifiedBy: phcDoctor.id,
      },
    });

    if (i < 5) {
      await prisma.taskAssignment.create({
        data: {
          caseId: caseRecord.id,
          assignedTo: ashaWorkers[i % ashaWorkers.length].id,
          assignedBy: phcDoctor.id,
          taskType: taskTypes[i % taskTypes.length],
          description: `Investigate and verify reported case in affected area. Collect samples if needed.`,
          priority: taskPriorities[i % taskPriorities.length],
          status: i < 3 ? "COMPLETED" : "PENDING",
          latitude: 26.1 + Math.random() * 2,
          longitude: 91.5 + Math.random() * 2,
        },
      });
    }
  }
  console.log("  Created case verifications and tasks");

  // ─── Settings ───────────────────────────────────────
  const settings = [
    { key: "diarrhea_threshold_7days", value: "5", description: "Cases in 7 days to trigger alert" },
    { key: "turbidity_threshold_ntu", value: "5", description: "Max turbidity in NTU" },
    { key: "ph_min", value: "6.5", description: "Min safe pH" },
    { key: "ph_max", value: "8.5", description: "Max safe pH" },
    { key: "tds_max_mgl", value: "500", description: "Max TDS in mg/L" },
    { key: "sms_gateway", value: "MSG91", description: "SMS provider" },
  ];
  for (const s of settings) {
    await prisma.systemSettings.create({ data: s });
  }
  console.log("  Created system settings");

  console.log("\nSeed complete! Demo credentials:");
  console.log("  admin@jal-suraksha.gov.in / password123");
  console.log("  district@jal-suraksha.gov.in / password123");
  console.log("  doctor@jal-suraksha.gov.in / password123");
  console.log("  asha1@jal-suraksha.gov.in / password123");
  console.log("  villager1@example.com / password123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
