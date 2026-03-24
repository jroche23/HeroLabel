import { prisma } from "./src/prisma";

async function testAPI() {
  // Create a test user
  const user = await prisma.user.create({
    data: {
      id: "test-user-123",
      name: "Test User",
      email: "test@example.com",
      emailVerified: true,
    },
  });

  console.log("Created user:", user);

  // Create a test project
  const project = await prisma.project.create({
    data: {
      title: "Test Project",
      description: "A test project for Label Studio",
      workspace: "default",
      userId: user.id,
    },
  });

  console.log("Created project:", project);

  // Create a labeling template
  const template = await prisma.labelingTemplate.create({
    data: {
      projectId: project.id,
      name: "Image Classification",
      type: "image_classification",
      config: JSON.stringify({
        interfaceType: "classification",
        labels: ["Cat", "Dog", "Bird"],
        multiSelect: false,
      }),
      isPreset: false,
    },
  });

  console.log("Created template:", template);

  // Create a data import
  const dataImport = await prisma.dataImport.create({
    data: {
      projectId: project.id,
      sourceType: "url",
      sourceUrl: "https://example.com/images.zip",
      fileName: "images.zip",
      fileType: "zip",
      status: "pending",
    },
  });

  console.log("Created data import:", dataImport);

  // List all projects
  const projects = await prisma.project.findMany({
    where: { userId: user.id },
    include: {
      labelingTemplates: true,
      dataImports: true,
    },
  });

  console.log("\nAll projects:", JSON.stringify(projects, null, 2));
}

testAPI().catch(console.error).finally(() => process.exit(0));
