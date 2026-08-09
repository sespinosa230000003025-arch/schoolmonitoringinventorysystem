import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { serialize } from "@/server/api/serialize";

const dateRange = z.object({
  startDate: z.string().nullish(),
  endDate: z.string().nullish(),
});

/** Mirrors the `whereClause.b_date_borrowed` between-filter from the REST route. */
const buildWhere = (input: z.infer<typeof dateRange>) => {
  const where: any = {};

  if (input.startDate && input.endDate) {
    where.b_date_borrowed = {
      gte: new Date(input.startDate),
      lte: new Date(input.endDate),
    };
  }

  return where;
};

export const reportsRouter = createTRPCRouter({
  // GET /api/reports?type=summary
  summary: protectedProcedure
    .input(dateRange)
    .query(async ({ ctx, input }) => {
      try {
        const where = buildWhere(input);

        // Get summary statistics
        const totalBorrows = await ctx.db.borrow.count({ where });
        const activeBorrows = await ctx.db.borrow.count({
          where: { ...where, b_status: 1 },
        });
        const returnedBorrows = await ctx.db.borrow.count({
          where: { ...where, b_status: 2 },
        });
        const overdueBorrows = await ctx.db.borrow.count({
          where: { ...where, b_status: 1, b_due_date: { lt: new Date() } },
        });

        // Get most borrowed items
        const mostBorrowedItems = await ctx.db.borrow.groupBy({
          by: ["item_id"],
          where,
          _count: { item_id: true },
          orderBy: { _count: { item_id: "desc" } },
          take: 10,
        });

        const borrowedItemDetails = await ctx.db.item.findMany({
          where: { id: { in: mostBorrowedItems.map((row) => row.item_id) } },
          select: { id: true, i_model: true, i_deviceID: true },
        });

        // Get most active borrowers (computed for parity with the REST route, which also
        // queried this without surfacing it in the response payload)
        await ctx.db.borrow.groupBy({
          by: ["member_id"],
          where,
          _count: { member_id: true },
          orderBy: { _count: { member_id: "desc" } },
          take: 10,
        });

        // Get total counts for items, members, rooms
        const totalItems = await ctx.db.item.count();
        const totalMembers = await ctx.db.borrower.count();
        const totalRooms = await ctx.db.room.count();

        // Transform mostBorrowedItems to match frontend expectations
        const popularItems = mostBorrowedItems.map((row) => {
          const item = borrowedItemDetails.find((i) => i.id === row.item_id);
          return {
            id: row.item_id,
            i_model: item?.i_model || "Unknown",
            i_deviceID: item?.i_deviceID || "Unknown",
            borrowCount: row._count.item_id,
          };
        });

        // Create comprehensive recent activity from multiple sources
        const activities: any[] = [];

        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        // Get recent borrows (last 30 days)
        const recentBorrows = await ctx.db.borrow.findMany({
          where: { b_date_borrowed: { gte: thirtyDaysAgo } },
          include: {
            Item: { select: { i_model: true, i_deviceID: true } },
            Member: { select: { m_fname: true, m_lname: true } },
          },
          orderBy: { b_date_borrowed: "desc" },
          take: 15,
        });

        // Add borrow activities
        recentBorrows.forEach((borrow) => {
          const memberName = `${borrow.Member?.m_fname || "Unknown"} ${
            borrow.Member?.m_lname || "Member"
          }`;
          const itemName = borrow.Item?.i_model || "Unknown Item";
          const deviceId = borrow.Item?.i_deviceID || "N/A";

          activities.push({
            id: `borrow-${borrow.id}`,
            type: "borrow",
            description: `${memberName} borrowed ${itemName} (${deviceId})`,
            date: borrow.b_date_borrowed,
          });
        });

        // Get recent returns (last 30 days) - only get records with actual return dates
        const recentReturns = await ctx.db.borrow.findMany({
          where: {
            b_status: 2, // Returned status
            b_date_returned: { not: null, gte: thirtyDaysAgo },
          },
          include: {
            Item: { select: { i_model: true, i_deviceID: true } },
            Member: { select: { m_fname: true, m_lname: true } },
          },
          orderBy: { b_date_returned: "desc" },
          take: 15,
        });

        // Add return activities
        recentReturns.forEach((borrow) => {
          const memberName = `${borrow.Member?.m_fname || "Unknown"} ${
            borrow.Member?.m_lname || "Member"
          }`;
          const itemName = borrow.Item?.i_model || "Unknown Item";
          const deviceId = borrow.Item?.i_deviceID || "N/A";

          activities.push({
            id: `return-${borrow.id}`,
            type: "return",
            description: `${memberName} returned ${itemName} (${deviceId})`,
            date: borrow.b_date_returned,
          });
        });

        // Get overdue items for activity feed
        const overdueForActivity = await ctx.db.borrow.findMany({
          where: {
            b_status: 1, // Still borrowed
            b_due_date: { lt: new Date() },
          },
          include: {
            Item: { select: { i_model: true, i_deviceID: true } },
            Member: { select: { m_fname: true, m_lname: true } },
          },
          orderBy: { b_due_date: "asc" },
          take: 5,
        });

        // Add overdue activities
        overdueForActivity.forEach((borrow) => {
          const daysOverdue = Math.floor(
            (new Date().getTime() - new Date(borrow.b_due_date).getTime()) /
              (1000 * 60 * 60 * 24)
          );
          const memberName = `${borrow.Member?.m_fname || "Unknown"} ${
            borrow.Member?.m_lname || "Member"
          }`;
          const itemName = borrow.Item?.i_model || "Unknown Item";
          const deviceId = borrow.Item?.i_deviceID || "N/A";

          activities.push({
            id: `overdue-${borrow.id}`,
            type: "overdue",
            description: `${itemName} (${deviceId}) is ${daysOverdue} day${
              daysOverdue > 1 ? "s" : ""
            } overdue - borrowed by ${memberName}`,
            date: borrow.b_due_date,
          });
        });

        // Sort all activities by date (most recent first) and limit to 15
        const recentActivity = activities
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 15);

        return {
          success: true as const,
          data: {
            totalBorrows,
            totalItems,
            totalMembers,
            totalRooms,
            activeBorrows,
            overdueBorrows,
            returnedThisMonth: returnedBorrows,
            popularItems,
            recentActivity,
          },
        };
      } catch (error) {
        console.error("Reports API error:", error);
        return {
          success: false as const,
          error: "Failed to generate report",
        };
      }
    }),

  // GET /api/reports?type=detailed
  detailed: protectedProcedure
    .input(dateRange)
    .query(async ({ ctx, input }) => {
      try {
        // Get detailed borrow records
        const detailedBorrows = await ctx.db.borrow.findMany({
          where: buildWhere(input),
          include: {
            Item: { select: { i_model: true, i_deviceID: true } },
            Member: { select: { m_fname: true, m_lname: true } },
            Room: { select: { r_name: true } },
          },
          orderBy: { b_date_borrowed: "desc" },
        });

        return {
          success: true as const,
          data: detailedBorrows.map(serialize),
        };
      } catch (error) {
        console.error("Reports API error:", error);
        return {
          success: false as const,
          error: "Failed to generate report",
          data: [],
        };
      }
    }),

  // GET /api/reports?type=overdue
  overdue: protectedProcedure
    .input(dateRange)
    .query(async ({ ctx, input }) => {
      try {
        // Get overdue items
        const overdueItems = await ctx.db.borrow.findMany({
          where: {
            ...buildWhere(input),
            b_status: 1, // Still borrowed
            b_due_date: { lt: new Date() },
          },
          include: {
            Item: { select: { i_model: true, i_deviceID: true } },
            Member: {
              select: { m_fname: true, m_lname: true, m_contact: true },
            },
            Room: { select: { r_name: true } },
          },
          orderBy: { b_due_date: "asc" },
        });

        return {
          success: true as const,
          data: overdueItems.map(serialize),
        };
      } catch (error) {
        console.error("Reports API error:", error);
        return {
          success: false as const,
          error: "Failed to generate report",
          data: [],
        };
      }
    }),
});
