const prisma = require('../../config/db');

async function listUsers({ page = 1, limit = 20, role, is_active }) {
  const skip = (page - 1) * limit;
  const where = {};
  if (role) where.role = role;
  if (is_active !== undefined) where.is_active = is_active === 'true' || is_active === true;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: 'desc' },
      select: { id: true, email: true, name: true, role: true, is_active: true, created_at: true, updated_at: true },
    }),
    prisma.user.count({ where }),
  ]);

  return { users, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

async function getUserById(id) {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, role: true, is_active: true, created_at: true, updated_at: true },
  });
}

async function updateUser(id, { role, is_active, name }) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return null;

  const data = {};
  if (role !== undefined) data.role = role;
  if (is_active !== undefined) data.is_active = is_active;
  if (name !== undefined) data.name = name;

  return prisma.user.update({
    where: { id },
    data,
    select: { id: true, email: true, name: true, role: true, is_active: true, created_at: true, updated_at: true },
  });
}

module.exports = { listUsers, getUserById, updateUser };
