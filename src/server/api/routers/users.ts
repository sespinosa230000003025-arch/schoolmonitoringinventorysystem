import { z } from "zod";
import bcrypt from "bcryptjs";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

const insensitive = { mode: "insensitive" } as const;

// Map type number to role string
const getRole = (type: number): "admin" | "faculty" | "staff" => {
  switch (type) {
    case 1:
      return "admin";
    case 2:
      return "faculty";
    case 3:
      return "staff";
    default:
      return "staff";
  }
};

export const usersRouter = createTRPCRouter({
  // GET /api/users
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(10),
        search: z.string().default(""),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const { page, limit, search } = input;
        const offset = (page - 1) * limit;

        const where = search
          ? {
              OR: [
                { name: { contains: search, ...insensitive } },
                { username: { contains: search, ...insensitive } },
              ],
            }
          : {};

        const [rows, count] = await ctx.db.$transaction([
          ctx.db.user.findMany({
            where,
            // Don't return passwords
            select: {
              id: true,
              name: true,
              username: true,
              role: true,
              status: true,
            },
            take: limit,
            skip: offset,
            orderBy: { id: "desc" },
          }),
          ctx.db.user.count({ where }),
        ]);

        return {
          success: true as const,
          data: rows,
          pagination: {
            page,
            limit,
            total: count,
            totalPages: Math.ceil(count / limit),
          },
        };
      } catch (error) {
        console.error("Get users error:", error);
        return {
          success: false as const,
          error: "Internal server error",
          data: [],
          pagination: {
            page: input.page,
            limit: input.limit,
            total: 0,
            totalPages: 0,
          },
        };
      }
    }),

  // POST /api/users
  create: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        username: z.string(),
        password: z.string(),
        type: z.union([z.string(), z.number()]).nullish(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Check if username already exists
        const existingUser = await ctx.db.user.findUnique({
          where: { username: input.username },
        });

        if (existingUser) {
          return { success: false as const, error: "Username already exists" };
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(input.password, 10);

        const userType = parseInt(String(input.type)) || 3; // Default to staff (3)

        const newUser = await ctx.db.user.create({
          data: {
            name: input.name,
            username: input.username,
            password: hashedPassword,
            role: getRole(userType),
            status: 1, // Active by default
          },
        });

        // Return user without password
        const { password, ...userResponse } = newUser;

        return {
          success: true as const,
          data: userResponse,
          message: "User created successfully",
        };
      } catch (error) {
        console.error("Create user error:", error);
        console.error(
          "Error details:",
          error instanceof Error ? error.message : "Unknown error"
        );
        return {
          success: false as const,
          error: `Failed to create user: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        };
      }
    }),

  // DELETE /api/users?id=
  //
  // NOTE: carried over verbatim from the Sequelize route, including the admin check below.
  // The session carries `role`, not `type`, so `(session.user as any).type` is always
  // undefined and this guard rejects every caller. Preserved deliberately — see the plan's
  // "Bugs carried over" section.
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Only admins can delete users
        if (!ctx.session.user || (ctx.session.user as any).type !== 1) {
          return {
            success: false as const,
            error: "Forbidden - Admin access required",
          };
        }

        // Prevent deleting yourself
        if (input.id === Number((ctx.session.user as any).id)) {
          return {
            success: false as const,
            error: "Cannot delete your own account",
          };
        }

        // Check if user exists
        const user = await ctx.db.user.findUnique({ where: { id: input.id } });
        if (!user) {
          return { success: false as const, error: "User not found" };
        }

        // Delete the user
        await ctx.db.user.delete({ where: { id: input.id } });

        return {
          success: true as const,
          message: "User deleted successfully",
        };
      } catch (error) {
        console.error("Delete user error:", error);
        return { success: false as const, error: "Failed to delete user" };
      }
    }),
});
