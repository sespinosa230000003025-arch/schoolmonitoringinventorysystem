import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { serialize } from "@/server/api/serialize";

const insensitive = { mode: "insensitive" } as const;

export const roomsRouter = createTRPCRouter({
  // GET /api/rooms
  list: publicProcedure
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
                { r_name: { contains: search, ...insensitive } },
                { r_description: { contains: search, ...insensitive } },
              ],
            }
          : {};

        const [rows, count] = await ctx.db.$transaction([
          ctx.db.room.findMany({
            where,
            take: limit,
            skip: offset,
            orderBy: { id: "desc" },
          }),
          ctx.db.room.count({ where }),
        ]);

        const totalPages = Math.ceil(count / limit);

        return {
          success: true as const,
          data: rows,
          pagination: {
            page,
            limit,
            total: count,
            totalPages,
          },
        };
      } catch (error) {
        console.error("Error fetching rooms:", error);
        return {
          success: false as const,
          error: "Failed to fetch rooms",
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

  // POST /api/rooms
  create: protectedProcedure
    .input(
      z.object({
        r_name: z.string(),
        r_description: z.string().nullish(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { r_name, r_description } = input;

        const room = await ctx.db.room.create({
          data: {
            r_name,
            r_description: r_description || null,
            r_status: 1,
          },
        });

        return {
          success: true as const,
          data: room,
          message: "Room created successfully",
        };
      } catch (error) {
        console.error("Error creating room:", error);
        console.error(
          "Error details:",
          error instanceof Error ? error.message : "Unknown error"
        );
        return {
          success: false as const,
          error: `Failed to create room: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        };
      }
    }),

  // PUT /api/rooms/[id]
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        r_name: z.string(),
        r_description: z.string().nullish(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, r_name, r_description } = input;

        // Find the room first
        const existing = await ctx.db.room.findUnique({ where: { id } });
        if (!existing) {
          return { success: false as const, error: "Room not found" };
        }

        // Update the room
        const room = await ctx.db.room.update({
          where: { id },
          data: {
            r_name,
            r_description: r_description || null,
          },
        });

        return {
          success: true as const,
          data: room,
          message: "Room updated successfully",
        };
      } catch (error) {
        console.error("Error updating room:", error);
        console.error(
          "Error details:",
          error instanceof Error ? error.message : "Unknown error"
        );
        return {
          success: false as const,
          error: `Failed to update room: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        };
      }
    }),

  // GET /api/rooms/[id]/items
  items: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      try {
        // Find all active borrows for this room (b_status = 1 means borrowed)
        const borrows = await ctx.db.borrow.findMany({
          where: {
            room_id: input.id,
            b_status: 1, // Only active borrows
          },
          include: {
            Item: {
              select: {
                id: true,
                i_deviceID: true,
                i_model: true,
                i_category: true,
                i_brand: true,
                i_description: true,
                i_type: true,
                item_rawstock: true,
                i_status: true,
                i_mr: true,
                i_price: true,
                i_photo: true,
              },
            },
            Member: {
              select: {
                id: true,
                m_school_id: true,
                m_fname: true,
                m_lname: true,
                m_gender: true,
                m_contact: true,
                m_department: true,
                m_year_section: true,
                m_type: true,
              },
            },
          },
          orderBy: { b_date_borrowed: "desc" },
        });

        // Extract items from borrows and add borrow information
        const itemsWithBorrowInfo = borrows.map((borrow) => ({
          ...serialize(borrow.Item),
          borrow_id: borrow.id,
          borrow_quantity: borrow.b_quantity,
          date_borrowed: borrow.b_date_borrowed,
          due_date: borrow.b_due_date,
          room_id: borrow.room_id,
          borrow_purpose: borrow.b_purpose,
          borrow_notes: borrow.b_notes,
          borrow_status: borrow.b_status,
          borrower: borrow.Member,
        }));

        return {
          success: true as const,
          data: itemsWithBorrowInfo,
          message: `Found ${itemsWithBorrowInfo.length} items currently borrowed to this room`,
        };
      } catch (error) {
        console.error("Error fetching room items:", error);
        console.error(
          "Error details:",
          error instanceof Error ? error.message : "Unknown error"
        );
        return {
          success: false as const,
          error: `Failed to fetch room items: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          data: [],
        };
      }
    }),
});
