
import prisma from "../config/database";

const roles = [
  {
    name: "ADMIN",
    description: "Full platform administration access",
  },
  {
    name: "TEAM_LEADER",
    description: "Manages teams, projects, and tasks",
  },
  {
    name: "MEMBER",
    description: "Accesses assigned teams and tasks",
  },
];

async function seedRoles() {
  try {
    for (const role of roles) {
      await prisma.role.upsert({
        where: { name: role.name },
        update: {
          description: role.description,
        },
        create: role,
      });

      console.log(`Role initialized: ${role.name}`);
    }

    console.log("Roles initialized successfully.");
  } catch (error) {
    console.error("Failed to initialize roles:", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

seedRoles();
