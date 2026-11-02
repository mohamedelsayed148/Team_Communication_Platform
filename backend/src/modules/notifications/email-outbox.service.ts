
import prisma from "../../config/database";
import resend from "../../config/resend";

const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 10;
const PROCESSING_TIMEOUT_MINUTES = 10;

const RETRY_DELAYS_MINUTES = [1, 5, 15, 30, 60];

async function recoverStuckEmails() {
  const recoveryThreshold = new Date(
    Date.now() - PROCESSING_TIMEOUT_MINUTES * 60 * 1000,
  );

  const result = await prisma.emailOutbox.updateMany({
    where: {
      status: "PROCESSING",
      processingStartedAt: {
        lt: recoveryThreshold,
      },
    },
    data: {
      status: "PENDING",
      processingStartedAt: null,
      nextRetryAt: new Date(),
      lastError: "Recovered after processing timeout.",
    },
  });

  return result.count;
}

export async function processEmailOutbox() {
  const recovered = await recoverStuckEmails();
  const now = new Date();

  const pendingEmails = await prisma.emailOutbox.findMany({
    where: {
      status: "PENDING",
      OR: [
        { nextRetryAt: null },
        { nextRetryAt: { lte: now } },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: BATCH_SIZE,
  });

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const email of pendingEmails) {
    const claim = await prisma.emailOutbox.updateMany({
      where: {
        id: email.id,
        status: "PENDING",
        OR: [
          { nextRetryAt: null },
          { nextRetryAt: { lte: new Date() } },
        ],
      },
      data: {
        status: "PROCESSING",
        attempts: { increment: 1 },
        processingStartedAt: new Date(),
      },
    });

    if (claim.count === 0) {
      skipped++;
      continue;
    }

    const updatedEmail = await prisma.emailOutbox.findUnique({
      where: { id: email.id },
    });

    if (!updatedEmail) {
      skipped++;
      continue;
    }

    try {
      const result = await resend.emails.send({
        from: process.env.EMAIL_FROM!,
        to: updatedEmail.toEmail,
        subject: updatedEmail.subject,
        text: updatedEmail.body,
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      await prisma.emailOutbox.update({
        where: { id: email.id },
        data: {
          status: "SENT",
          sentAt: new Date(),
          lastError: null,
          nextRetryAt: null,
          processingStartedAt: null,
        },
      });

      sent++;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unknown email delivery error";

      const hasReachedMaxAttempts =
        updatedEmail.attempts >= MAX_ATTEMPTS;

      if (hasReachedMaxAttempts) {
        await prisma.emailOutbox.update({
          where: { id: email.id },
          data: {
            status: "FAILED",
            lastError: errorMessage,
            nextRetryAt: null,
            processingStartedAt: null,
          },
        });
      } else {
        const delayMinutes =
          RETRY_DELAYS_MINUTES[updatedEmail.attempts - 1] ?? 60;

        const nextRetryAt = new Date(
          Date.now() + delayMinutes * 60 * 1000,
        );

        await prisma.emailOutbox.update({
          where: { id: email.id },
          data: {
            status: "PENDING",
            lastError: errorMessage,
            nextRetryAt,
            processingStartedAt: null,
          },
        });
      }

      failed++;
    }
  }

  return {
    recovered,
    checked: pendingEmails.length,
    sent,
    failed,
    skipped,
  };
}
