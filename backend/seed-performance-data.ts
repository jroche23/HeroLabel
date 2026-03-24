import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedTestData() {
  console.log("Seeding test data...");

  // Find the first user
  const user = await prisma.user.findFirst();
  if (!user) {
    console.log("No user found. Please create a user first.");
    return;
  }

  console.log(`Using user: ${user.name} (${user.id})`);

  // Find the first project
  let project = await prisma.project.findFirst({
    where: { userId: user.id },
  });

  if (!project) {
    // Create a test project
    project = await prisma.project.create({
      data: {
        title: "Test Performance Project",
        description: "A project for testing performance tracking",
        userId: user.id,
      },
    });
    console.log(`Created project: ${project.title} (${project.id})`);
  } else {
    console.log(`Using project: ${project.title} (${project.id})`);
  }

  // Create tasks
  console.log("Creating tasks...");
  const tasks = [];
  for (let i = 0; i < 10; i++) {
    const task = await prisma.task.create({
      data: {
        projectId: project.id,
        data: JSON.stringify({
          imageUrl: `https://example.com/image${i + 1}.jpg`,
          description: `Task ${i + 1}`,
        }),
        status: "completed",
        assignedTo: user.id,
      },
    });
    tasks.push(task);
  }
  console.log(`Created ${tasks.length} tasks`);

  // Create annotations
  console.log("Creating annotations...");
  const annotations = [];
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const submittedDate = new Date();
    submittedDate.setDate(submittedDate.getDate() - (9 - i));

    const annotation = await prisma.annotation.create({
      data: {
        taskId: task.id,
        projectId: project.id,
        userId: user.id,
        status: i < 7 ? "submitted" : i < 9 ? "skipped" : "pending",
        submittedAt:
          i < 9 ? submittedDate : null,
        timeSpent: Math.random() * 30 + 5, // Random time between 5-35 minutes
      },
    });
    annotations.push(annotation);
  }
  console.log(`Created ${annotations.length} annotations`);

  // Create reviews for submitted annotations
  console.log("Creating reviews...");
  const submittedAnnotations = annotations.filter((a) => a.status === "submitted");
  for (let i = 0; i < submittedAnnotations.length; i++) {
    const annotation = submittedAnnotations[i];
    const statuses = ["accepted", "fix_accepted", "rejected"];
    // 70% accepted, 20% fix_accepted, 10% rejected
    const randomStatus =
      i < 5 ? "accepted" : i < 6 ? "fix_accepted" : "rejected";

    await prisma.annotationReview.create({
      data: {
        annotationId: annotation.id,
        reviewerId: user.id,
        status: randomStatus,
        reviewedAt: new Date(annotation.submittedAt!.getTime() + 3600000), // 1 hour after submission
        feedback: randomStatus === "rejected" ? "Needs improvement" : null,
      },
    });
  }
  console.log(`Created reviews for ${submittedAnnotations.length} annotations`);

  console.log("✅ Test data seeded successfully!");
}

seedTestData()
  .catch((e) => {
    console.error("Error seeding data:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
