const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Checking database...');
  const count = await prisma.registration.count();
  console.log(`Current registration count: ${count}`);

  const seqResult = await prisma.$queryRawUnsafe(
    `SELECT pg_get_serial_sequence('"Registration"', 'participantNumber') as seq;`
  );
  console.log('PostgreSQL sequence:', seqResult);

  const seqName = seqResult[0]?.seq;
  if (seqName) {
    console.log(`Found sequence: ${seqName}`);
    // Check if table is empty or if deleting all
    if (process.argv.includes('--delete-all')) {
      console.log('Deleting all test registrations...');
      await prisma.registration.deleteMany();
      console.log('All registrations deleted.');
    }

    const currentCount = await prisma.registration.count();
    if (currentCount === 0) {
      console.log('Table is empty. Resetting sequence to 1...');
      await prisma.$executeRawUnsafe(`ALTER SEQUENCE ${seqName} RESTART WITH 1;`);
      console.log('Sequence successfully reset to 1. Next registration will be TB001!');
    } else {
      console.log(`Table has ${currentCount} records. Sequence not reset. Pass --delete-all if you wish to wipe test data and reset.`);
    }
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
