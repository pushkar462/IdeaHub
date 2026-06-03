import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding permissions...');

  const permissions = [
    { key: 'workflow.assign', description: 'Can assign users to workflows' },
    { key: 'workflow.transition', description: 'Can change workflow status' },
    { key: 'department.manage', description: 'Can manage department settings' },
    { key: 'department.view', description: 'Can view department feed and sockets' },
    { key: 'analytics.view', description: 'Can view productivity and workflow analytics' },
    { key: 'audit.view', description: 'Can view raw audit logs' },
    { key: 'user.manage', description: 'Can manage users' },
  ];

  for (const p of permissions) {
    await prisma.permission.upsert({
      where: { key: p.key },
      update: {},
      create: p,
    });
  }

  // Baseline mapping: ADMIN gets everything.
  const allPerms = await prisma.permission.findMany();
  
  for (const p of allPerms) {
    await prisma.rolePermission.upsert({
      where: { role_permissionId: { role: Role.ADMIN, permissionId: p.id } },
      update: {},
      create: { role: Role.ADMIN, permissionId: p.id },
    });
    
    // Founders also get everything
    await prisma.rolePermission.upsert({
      where: { role_permissionId: { role: Role.FOUNDER, permissionId: p.id } },
      update: {},
      create: { role: Role.FOUNDER, permissionId: p.id },
    });
  }

  // Example subset for regular roles (e.g. backend)
  const basicPermKeys = ['workflow.assign', 'workflow.transition', 'department.view'];
  for (const p of allPerms.filter(p => basicPermKeys.includes(p.key))) {
    for (const role of [Role.BACKEND, Role.FRONTEND, Role.DEVOPS, Role.AI_ML]) {
      await prisma.rolePermission.upsert({
        where: { role_permissionId: { role, permissionId: p.id } },
        update: {},
        create: { role, permissionId: p.id },
      });
    }
  }

  console.log('Permissions seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
