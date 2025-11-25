import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const InventoryActionSchema = z.object({
  action: z.enum(['add', 'remove', 'use', 'equip', 'unequip']),
  itemName: z.string().min(1),
  quantity: z.number().int().positive().optional().default(1),
  slot: z.string().optional(), // For equip action
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = InventoryActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_FAILED', message: 'Invalid input', details: parsed.error.flatten() } },
        { status: 422 }
      );
    }

    const character = await prisma.character.findUnique({
      where: { id },
    });

    if (!character) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Character not found' } },
        { status: 404 }
      );
    }

    const { action, itemName, quantity, slot } = parsed.data;
    const inventory: Array<{ name: string; quantity: number; weight?: number; description?: string }> = 
      JSON.parse(character.inventory || '[]');
    const equippedItems: Record<string, string | undefined> = JSON.parse(character.equippedItems || '{}');

    const existingIndex = inventory.findIndex(
      (i) => i.name.toLowerCase() === itemName.toLowerCase()
    );

    switch (action) {
      case 'add':
        if (existingIndex >= 0) {
          inventory[existingIndex].quantity += quantity;
        } else {
          inventory.push({ name: itemName, quantity });
        }
        break;

      case 'remove':
      case 'use':
        if (existingIndex < 0) {
          return NextResponse.json(
            { error: { code: 'ITEM_NOT_FOUND', message: `Character doesn't have ${itemName}` } },
            { status: 400 }
          );
        }
        inventory[existingIndex].quantity -= quantity;
        if (inventory[existingIndex].quantity <= 0) {
          inventory.splice(existingIndex, 1);
        }
        break;

      case 'equip':
        const equipSlot = slot || 'mainHand';
        equippedItems[equipSlot] = itemName;
        break;

      case 'unequip':
        const unequipSlot = slot || 'mainHand';
        delete equippedItems[unequipSlot];
        break;
    }

    await prisma.character.update({
      where: { id },
      data: {
        inventory: JSON.stringify(inventory),
        equippedItems: JSON.stringify(equippedItems),
      },
    });

    return NextResponse.json({
      success: true,
      inventory,
      equippedItems,
      message: `${action === 'add' ? 'Added' : action === 'remove' ? 'Removed' : action === 'use' ? 'Used' : action === 'equip' ? 'Equipped' : 'Unequipped'} ${itemName}`,
    });
  } catch (error) {
    console.error('Inventory action failed:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to modify inventory' } },
      { status: 500 }
    );
  }
}
