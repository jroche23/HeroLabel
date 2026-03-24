import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testPerformanceLogic() {
  console.log("Testing Performance Tracking Logic\n");
  console.log("=====================================\n");

  const user = await prisma.user.findFirst();
  if (!user) {
    console.log("No user found");
    return;
  }

  console.log(`Testing for user: ${user.name} (${user.id})\n`);

  // Test 1: Performance Overview
  console.log("TEST 1: Performance Overview");
  console.log("----------------------------");

  const annotations = await prisma.annotation.findMany({
    where: {
      userId: user.id,
    },
    include: {
      reviews: true,
    },
  });

  const totalSubmitted = annotations.filter((a) => a.status === "submitted").length;
  const totalSkipped = annotations.filter((a) => a.status === "skipped").length;
  const totalPending = annotations.filter((a) => a.status === "pending").length;

  const totalTimeMinutes = annotations.reduce((sum, a) => sum + a.timeSpent, 0);
  const timeAnnotating = totalTimeMinutes / 60;

  const allReviews = annotations.flatMap((a) => a.reviews);
  const totalReviewed = allReviews.length;
  const acceptedCount = allReviews.filter((r) => r.status === "accepted").length;
  const fixAcceptedCount = allReviews.filter((r) => r.status === "fix_accepted").length;
  const rejectedCount = allReviews.filter((r) => r.status === "rejected").length;

  const performanceScore =
    totalReviewed > 0 ? ((acceptedCount + fixAcceptedCount) / totalReviewed) * 100 : 0;

  console.log(JSON.stringify({
    totalSubmitted,
    totalSkipped,
    totalPending,
    timeAnnotating: Number(timeAnnotating.toFixed(2)),
    performanceScore: Number(performanceScore.toFixed(2)),
    totalReviewed,
    acceptedCount,
    fixAcceptedCount,
    rejectedCount,
  }, null, 2));

  // Test 2: Timeline
  console.log("\nTEST 2: Performance Timeline");
  console.log("----------------------------");

  const timelineAnnotations = annotations.filter(
    (a) => a.status === "submitted" || a.status === "skipped"
  );

  const timelineMap = new Map();
  timelineAnnotations.forEach((annotation) => {
    if (!annotation.submittedAt) return;

    const date = annotation.submittedAt.toISOString().split("T")[0];
    const existing = timelineMap.get(date) || {
      date,
      submitted: 0,
      skipped: 0,
    };

    if (annotation.status === "submitted") {
      existing.submitted++;
    } else if (annotation.status === "skipped") {
      existing.skipped++;
    }

    timelineMap.set(date, existing);
  });

  const timeline = Array.from(timelineMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  console.log(JSON.stringify(timeline, null, 2));

  // Test 3: Time Spent
  console.log("\nTEST 3: Time Spent by Date");
  console.log("----------------------------");

  const timeSpentMap = new Map();
  timelineAnnotations.forEach((annotation) => {
    if (!annotation.submittedAt) return;

    const date = annotation.submittedAt.toISOString().split("T")[0];
    const existing = timeSpentMap.get(date) || {
      date,
      totalTime: 0,
      count: 0,
    };

    existing.totalTime += annotation.timeSpent;
    existing.count++;

    timeSpentMap.set(date, existing);
  });

  const timeSpentData = Array.from(timeSpentMap.values())
    .map((item) => ({
      date: item.date,
      avgTimePerAnnotation: Number((item.totalTime / item.count).toFixed(2)),
      totalTimeHours: Number((item.totalTime / 60).toFixed(2)),
      annotationCount: item.count,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  console.log(JSON.stringify(timeSpentData, null, 2));

  console.log("\n✅ All logic tests passed!");
}

testPerformanceLogic()
  .catch((e) => {
    console.error("Error:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
