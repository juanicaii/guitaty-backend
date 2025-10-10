import cron from 'node-cron';
import { prisma } from '../lib/prisma';

/**
 * Process subscriptions and create expenses for those due
 */
export async function processSubscriptions() {
  console.log('🔄 Processing subscriptions...');

  try {
    const now = new Date();

    // Find all active subscriptions where nextBillingDate is today or in the past
    const dueSubscriptions = await prisma.subscription.findMany({
      where: {
        isActive: true,
        nextBillingDate: {
          lte: now,
        },
      },
    });

    console.log(`📝 Found ${dueSubscriptions.length} subscriptions to process`);

    for (const subscription of dueSubscriptions) {
      try {
        // Get account to retrieve currency
        const account = await prisma.account.findUnique({
          where: { id: subscription.accountId },
          select: { currency: true },
        });

        if (!account) {
          console.error(`❌ Account not found for subscription ${subscription.id}`);
          continue;
        }

        // Create the expense transaction
        await prisma.transaction.create({
          data: {
            amount: subscription.amount,
            description: `${subscription.name}${subscription.description ? ` - ${subscription.description}` : ''}`,
            type: 'EXPENSE',
            date: subscription.nextBillingDate,
            currency: account.currency,
            processed: true,
            aiExtracted: false,
            userId: subscription.userId,
            accountId: subscription.accountId,
            categoryId: subscription.categoryId,
            metadata: {
              subscriptionId: subscription.id,
              subscriptionName: subscription.name,
              billingCycle: subscription.billingCycle,
            },
          },
        });

        // Update account balance
        await prisma.account.update({
          where: { id: subscription.accountId },
          data: {
            balance: {
              decrement: subscription.amount,
            },
          },
        });

        // Calculate next billing date
        const nextBillingDate = new Date(subscription.nextBillingDate);
        if (subscription.billingCycle === 'MONTHLY') {
          nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
        } else if (subscription.billingCycle === 'YEARLY') {
          nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
        }

        // Update subscription with next billing date
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            nextBillingDate,
          },
        });

        console.log(`✅ Processed subscription: ${subscription.name} (${subscription.id})`);
      } catch (error) {
        console.error(`❌ Error processing subscription ${subscription.id}:`, error);
      }
    }

    console.log('✨ Subscription processing completed');
  } catch (error) {
    console.error('❌ Error in processSubscriptions:', error);
  }
}

/**
 * Start the subscription processor cron job
 * Runs every day at midnight (00:00)
 */
export function startSubscriptionProcessor() {
  // Run every day at midnight
  cron.schedule('0 0 * * *', async () => {
    await processSubscriptions();
  });

  console.log('📅 Subscription processor scheduled to run daily at midnight');
}
