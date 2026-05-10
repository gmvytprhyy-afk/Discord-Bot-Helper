import { eq, and } from "drizzle-orm";
import { db, shopItemsTable, panelsTable, ticketsTable } from "@workspace/db";
import type { ShopItem, Panel, Ticket } from "@workspace/db";

export async function getActiveItems(guildId: string, type: "buy" | "sell"): Promise<ShopItem[]> {
  return db
    .select()
    .from(shopItemsTable)
    .where(
      and(
        eq(shopItemsTable.guildId, guildId),
        eq(shopItemsTable.type, type),
        eq(shopItemsTable.isActive, true),
      ),
    );
}

export async function getItemById(id: number): Promise<ShopItem | null> {
  const rows = await db
    .select()
    .from(shopItemsTable)
    .where(eq(shopItemsTable.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function addItem(
  guildId: string,
  name: string,
  type: "buy" | "sell",
  price?: number,
  description?: string,
): Promise<ShopItem> {
  const rows = await db
    .insert(shopItemsTable)
    .values({ guildId, name, type, price: price ?? null, description: description ?? null, isActive: true })
    .returning();
  return rows[0]!;
}

export async function removeItem(guildId: string, name: string, type: "buy" | "sell"): Promise<boolean> {
  const rows = await db
    .update(shopItemsTable)
    .set({ isActive: false })
    .where(
      and(
        eq(shopItemsTable.guildId, guildId),
        eq(shopItemsTable.name, name),
        eq(shopItemsTable.type, type),
        eq(shopItemsTable.isActive, true),
      ),
    )
    .returning();
  return rows.length > 0;
}

export async function upsertPanel(
  guildId: string,
  channelId: string,
  type: "shop" | "sell",
  title: string,
  description?: string,
): Promise<Panel> {
  const rows = await db
    .insert(panelsTable)
    .values({ guildId, channelId, type, title, description: description ?? null })
    .onConflictDoUpdate({
      target: [panelsTable.guildId, panelsTable.type],
      set: { channelId, title, description: description ?? null },
    })
    .returning();
  return rows[0]!;
}

export async function setPanelMessage(panelId: number, messageId: string): Promise<void> {
  await db.update(panelsTable).set({ messageId }).where(eq(panelsTable.id, panelId));
}

export async function getPanel(guildId: string, type: "shop" | "sell"): Promise<Panel | null> {
  const rows = await db
    .select()
    .from(panelsTable)
    .where(and(eq(panelsTable.guildId, guildId), eq(panelsTable.type, type)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getTicketByChannelId(channelId: string): Promise<Ticket | null> {
  const rows = await db
    .select()
    .from(ticketsTable)
    .where(eq(ticketsTable.threadId, channelId))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateTicketStatus(channelId: string, status: string): Promise<void> {
  await db
    .update(ticketsTable)
    .set({ status })
    .where(eq(ticketsTable.threadId, channelId));
}

export async function createTicket(
  guildId: string,
  userId: string,
  itemName: string,
  type: "buy" | "sell",
  threadId: string,
  itemPrice?: number,
): Promise<Ticket> {
  const rows = await db
    .insert(ticketsTable)
    .values({
      guildId,
      userId,
      itemName,
      type,
      threadId,
      itemPrice: itemPrice ?? null,
      status: "open",
    })
    .returning();
  return rows[0]!;
}
