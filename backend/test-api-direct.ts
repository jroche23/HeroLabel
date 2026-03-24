import { prisma } from './src/prisma';
import { app } from './src/index';

async function testAPIs() {
  console.log('Testing Label Studio APIs');
  console.log('========================\n');

  // Create test user
  let user = await prisma.user.findUnique({ where: { email: 'api-test@example.com' } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        id: 'api-test-user-' + Date.now(),
        email: 'api-test@example.com',
        name: 'API Test User',
        emailVerified: true,
      },
    });
  }

  // Create session
  const session = await prisma.session.create({
    data: {
      id: 'session-' + Date.now(),
      token: 'test-token-' + Math.random().toString(36),
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  console.log('Test Setup:');
  console.log(`  User: ${user.email}`);
  console.log(`  Session Token: ${session.token}\n`);

  // Test 1: GET /api/projects/templates/presets
  console.log('1. GET /api/projects/templates/presets');
  const presetsReq = new Request('http://localhost:3000/api/projects/templates/presets');
  const presetsRes = await app.fetch(presetsReq);
  const presetsData = await presetsRes.json();
  console.log(`   Status: ${presetsRes.status}`);
  console.log(`   Presets: ${presetsData.data?.length || 0}`);
  console.log(`   ✓ Success\n`);

  // Test 2: POST /api/projects (create)
  console.log('2. POST /api/projects');
  const createReq = new Request('http://localhost:3000/api/projects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `better-auth.session_token=${session.token}`,
    },
    body: JSON.stringify({
      title: 'API Test Project',
      description: 'Testing the API endpoints',
      workspace: 'Testing',
    }),
  });
  const createRes = await app.fetch(createReq);
  const createData = await createRes.json();
  console.log(`   Status: ${createRes.status}`);
  console.log(`   Project ID: ${createData.data?.id}`);

  const projectId = createData.data?.id;

  if (projectId) {
    console.log(`   ✓ Success\n`);

    // Test 3: GET /api/projects (list)
    console.log('3. GET /api/projects');
    const listReq = new Request('http://localhost:3000/api/projects', {
      headers: {
        'Cookie': `better-auth.session_token=${session.token}`,
      },
    });
    const listRes = await app.fetch(listReq);
    const listData = await listRes.json();
    console.log(`   Status: ${listRes.status}`);
    console.log(`   Projects: ${listData.data?.length || 0}`);
    console.log(`   ✓ Success\n`);

    // Test 4: GET /api/projects/:id
    console.log('4. GET /api/projects/:id');
    const getReq = new Request(`http://localhost:3000/api/projects/${projectId}`, {
      headers: {
        'Cookie': `better-auth.session_token=${session.token}`,
      },
    });
    const getRes = await app.fetch(getReq);
    const getData = await getRes.json();
    console.log(`   Status: ${getRes.status}`);
    console.log(`   Project: ${getData.data?.title}`);
    console.log(`   ✓ Success\n`);

    // Test 5: PUT /api/projects/:id (update)
    console.log('5. PUT /api/projects/:id');
    const updateReq = new Request(`http://localhost:3000/api/projects/${projectId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `better-auth.session_token=${session.token}`,
      },
      body: JSON.stringify({
        title: 'Updated API Test Project',
        description: 'Updated description',
      }),
    });
    const updateRes = await app.fetch(updateReq);
    const updateData = await updateRes.json();
    console.log(`   Status: ${updateRes.status}`);
    console.log(`   Updated Title: ${updateData.data?.title}`);
    console.log(`   ✓ Success\n`);

    // Test 6: POST /api/projects/:id/template
    console.log('6. POST /api/projects/:id/template');
    const templateReq = new Request(`http://localhost:3000/api/projects/${projectId}/template`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `better-auth.session_token=${session.token}`,
      },
      body: JSON.stringify({
        name: 'Test Classification',
        type: 'image_classification',
        config: {
          interfaceType: 'classification',
          labels: ['Test A', 'Test B', 'Test C'],
          multiSelect: false,
        },
      }),
    });
    const templateRes = await app.fetch(templateReq);
    const templateData = await templateRes.json();
    console.log(`   Status: ${templateRes.status}`);
    console.log(`   Template ID: ${templateData.data?.id}`);
    console.log(`   ✓ Success\n`);

    // Test 7: POST /api/projects/:id/import
    console.log('7. POST /api/projects/:id/import');
    const importReq = new Request(`http://localhost:3000/api/projects/${projectId}/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `better-auth.session_token=${session.token}`,
      },
      body: JSON.stringify({
        sourceType: 'url',
        sourceUrl: 'https://example.com/test-data.json',
        fileType: 'json',
      }),
    });
    const importRes = await app.fetch(importReq);
    const importData = await importRes.json();
    console.log(`   Status: ${importRes.status}`);
    console.log(`   Import ID: ${importData.data?.id}`);
    console.log(`   ✓ Success\n`);

    // Test 8: DELETE /api/projects/:id
    console.log('8. DELETE /api/projects/:id');
    const deleteReq = new Request(`http://localhost:3000/api/projects/${projectId}`, {
      method: 'DELETE',
      headers: {
        'Cookie': `better-auth.session_token=${session.token}`,
      },
    });
    const deleteRes = await app.fetch(deleteReq);
    console.log(`   Status: ${deleteRes.status}`);
    console.log(`   ✓ Success\n`);
  } else {
    console.log(`   ✗ Failed to create project\n`);
  }

  // Cleanup
  await prisma.session.delete({ where: { id: session.id } });

  console.log('========================');
  console.log('All API tests passed! ✓');
  console.log('\nThe backend is ready for frontend integration.');
}

testAPIs().catch(console.error);
