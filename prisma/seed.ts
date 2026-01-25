import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create default user (CJNET)
  const user = await prisma.user.upsert({
    where: { username: 'CJNET' },
    update: {},
    create: {
      username: 'CJNET',
      password: 'CJNETrivera', // In production, hash this with bcrypt
      email: 'admin@cjnet.com',
      name: 'CJNET Admin',
    },
  });

  console.log('✅ Created user:', user.username);

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
