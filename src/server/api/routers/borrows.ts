import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { serialize } from "@/server/api/serialize";

const insensitive = { mode: "insensitive" } as const;

export const borrowsRouter = createTRPCRouter({
  // GET /api/borrows
  list: publicProcedure
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(10),
        search: z.string().default(""),
        status: z.string().default(""),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const { page, limit, search, status } = input;
        const offset = (page - 1) * limit;

        const where: any = {};

        if (search) {
          // Search in related models
          where.OR = [
            { Item: { i_model: { contains: search, ...insensitive } } },
            { Item: { i_deviceID: { contains: search, ...insensitive } } },
            { Member: { m_fname: { contains: search, ...insensitive } } },
            { Member: { m_lname: { contains: search, ...insensitive } } },
            { Room: { r_name: { contains: search, ...insensitive } } },
          ];
        }

        if (status) {
          where.b_status = parseInt(status);
        }

        const [rows, count] = await ctx.db.$transaction([
          ctx.db.borrow.findMany({
            where,
            include: {
              // i_photo / i_brand drive the thumbnail shown next to an item in the UI.
              Item: {
                select: {
                  i_model: true,
                  i_deviceID: true,
                  i_photo: true,
                  i_brand: true,
                },
              },
              Member: { select: { m_fname: true, m_lname: true } },
              Room: { select: { r_name: true } },
            },
            take: limit,
            skip: offset,
            orderBy: { id: "desc" },
          }),
          ctx.db.borrow.count({ where }),
        ]);

        return {
          success: true as const,
          data: rows.map(serialize),
          pagination: {
            page,
            limit,
            total: count,
            totalPages: Math.ceil(count / limit),
          },
        };
      } catch (error) {
        console.error("Get borrows error:", error);
        return {
          success: false as const,
          error: "Failed to fetch borrows",
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

  // POST /api/borrows
  create: protectedProcedure
    .input(
      z.object({
        member_id: z.number(),
        item_id: z.number(),
        stock_id: z.number(),
        room_assigned: z.number().nullish(),
        time_limit: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Check if item has enough stock
        const item = await ctx.db.item.findUnique({
          where: { id: input.item_id },
        });
        if (!item) {
          return { success: false as const, error: "Item not found" };
        }

        if (item.item_rawstock < input.stock_id) {
          return {
            success: false as const,
            error: "Insufficient stock available",
          };
        }

        const newBorrow = await ctx.db.borrow.create({
          data: {
            member_id: input.member_id,
            item_id: input.item_id,
            room_id: input.room_assigned ?? null,
            b_due_date: new Date(input.time_limit),
            b_quantity: input.stock_id,
            b_status: 1, // 1 = borrowed
            b_purpose: null,
            b_notes: null,
          },
        });

        // Update item stock
        await ctx.db.item.update({
          where: { id: input.item_id },
          data: { item_rawstock: item.item_rawstock - input.stock_id },
        });

        return {
          success: true as const,
          data: newBorrow,
          message: "Borrow record created successfully",
        };
      } catch (error) {
        console.error("Create borrow error:", error);
        console.error(
          "Error details:",
          error instanceof Error ? error.message : "Unknown error"
        );
        return {
          success: false as const,
          error: `Failed to create borrow record: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        };
      }
    }),
});
