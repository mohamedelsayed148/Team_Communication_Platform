import prisma from "../../config/database";
import { Prisma } from "@prisma/client";
import { CreateTaskInput } from "./tasks.validation";
import type { GetTasksQuery } from "./tasks.validation";
import type { UpdateTaskStatusInput } from "./tasks.validation";
import type { UpdateTaskInput } from "./tasks.validation";
import { createNotification } from "../notifications/notification-creation.service";

export async function createTask(
  requesterId: string,
  isAdmin: boolean,
  data: CreateTaskInput,
) {
  return prisma.$transaction(
    async (tx) => {
      // 1. Verify that the team exists
      const team = await tx.team.findUnique({
        where: { id: data.teamId },
        select: { id: true },
      });

      if (!team) {
        throw Object.assign(new Error("Team not found"), {
          statusCode: 404,
        });
      }

      // 2. Verify requester permissions
      // Platform ADMIN can create tasks in any team.
      // Other users must be LEADERs of the specified team.
      if (!isAdmin) {
        const requesterMembership = await tx.teamMember.findUnique({
          where: {
            teamId_userId: {
              teamId: data.teamId,
              userId: requesterId,
            },
          },
          select: {
            role: true,
          },
        });

        if (!requesterMembership || requesterMembership.role !== "LEADER") {
          throw Object.assign(
            new Error(
              "Only team leaders or platform administrators can create tasks",
            ),
            { statusCode: 403 },
          );
        }
      }

      // 3. Verify that the task creator is active
      const creator = await tx.user.findUnique({
        where: { id: requesterId },
        select: {
          id: true,
          status: true,
        },
      });

      if (!creator || creator.status !== "ACTIVE") {
        throw Object.assign(
          new Error("An active user is required to create a task"),
          { statusCode: 403 },
        );
      }

      // 4. If an assignee was provided, verify their eligibility
      if (data.assignedToId) {
        const assignee = await tx.user.findUnique({
          where: { id: data.assignedToId },
          select: {
            id: true,
            status: true,
          },
        });

        if (!assignee) {
          throw Object.assign(new Error("Assigned user not found"), {
            statusCode: 404,
          });
        }

        if (assignee.status !== "ACTIVE") {
          throw Object.assign(
            new Error("Cannot assign a task to an inactive user"),
            { statusCode: 400 },
          );
        }

        // 5. Verify that the assignee belongs to this team
        const membership = await tx.teamMember.findUnique({
          where: {
            teamId_userId: {
              teamId: data.teamId,
              userId: data.assignedToId,
            },
          },
          select: {
            teamId: true,
            userId: true,
          },
        });

        if (!membership) {
          throw Object.assign(
            new Error("Assigned user is not a member of this team"),
            { statusCode: 400 },
          );
        }
      }

      // 6. Create the task
      const task = await tx.task.create({
        data: {
          title: data.title,
          description: data.description,
          teamId: data.teamId,
          createdById: requesterId,
          assignedToId: data.assignedToId,
          priority: data.priority,
          dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        },
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          priority: true,
          dueDate: true,
          teamId: true,
          createdById: true,
          assignedToId: true,
          createdAt: true,
          updatedAt: true,

          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },

          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      // 7. Notify the assigned member.
      if (task.assignedToId) {
        await createNotification(tx, {
          userId: task.assignedToId,
          taskId: task.id,
          type: "TASK_ASSIGNED",
          title: "New task assigned",
          message: `You have been assigned a new task: ${task.title}`,
        });
      }

      return task;
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );
}

export async function getTasks(
  requesterId: string,
  isAdmin: boolean,
  filters: GetTasksQuery,
) {
  const where: Prisma.TaskWhereInput = {
    ...(filters.teamId && { teamId: filters.teamId }),
    ...(filters.status && { status: filters.status }),
    ...(filters.priority && { priority: filters.priority }),
    ...(filters.assignedToId && {
      assignedToId: filters.assignedToId,
    }),
  };

  // Non-admin users can only see tasks in teams
  // where they are members.
  if (!isAdmin) {
    where.team = {
      members: {
        some: {
          userId: requesterId,
        },
      },
    };
  }

  const tasks = await prisma.task.findMany({
    where,
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      dueDate: true,
      teamId: true,
      createdById: true,
      assignedToId: true,
      createdAt: true,
      updatedAt: true,

      team: {
        select: {
          id: true,
          name: true,
        },
      },

      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },

      assignedTo: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },

      _count: {
        select: {
          updates: true,
        },
      },
    },
  });

  const now = new Date();

  return tasks.map((task) => ({
    ...task,
    isOverdue:
      task.dueDate !== null &&
      task.dueDate < now &&
      task.status !== "COMPLETED" &&
      task.status !== "CANCELLED",
  }));
}

export async function getTaskById(
  requesterId: string,
  isAdmin: boolean,
  taskId: string,
) {
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,

      // ADMIN can access any task.
      // Other users must belong to the task's team.
      ...(isAdmin
        ? {}
        : {
            team: {
              members: {
                some: {
                  userId: requesterId,
                },
              },
            },
          }),
    },

    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      dueDate: true,

      teamId: true,
      createdById: true,
      assignedToId: true,

      createdAt: true,
      updatedAt: true,

      team: {
        select: {
          id: true,
          name: true,
          description: true,
        },
      },

      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },

      assignedTo: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },

      updates: {
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          content: true,
          taskId: true,
          authorId: true,
          createdAt: true,

          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },

      _count: {
        select: {
          updates: true,
        },
      },
    },
  });

  if (!task) {
    throw Object.assign(new Error("Task not found"), {
      statusCode: 404,
    });
  }

  const now = new Date();

  return {
    ...task,
    isOverdue:
      task.dueDate !== null &&
      task.dueDate < now &&
      task.status !== "COMPLETED" &&
      task.status !== "CANCELLED",
  };
}

export async function createTaskUpdate(
  requesterId: string,
  taskId: string,
  content: string,
) {
  return prisma.$transaction(
    async (tx) => {
      // 1. Find the task.
      const task = await tx.task.findUnique({
        where: { id: taskId },
        select: {
          id: true,
          title: true,
          teamId: true,
          createdById: true,
          assignedToId: true,
        },
      });

      if (!task) {
        throw Object.assign(new Error("Task not found"), {
          statusCode: 404,
        });
      }

      // 2. Only the assigned member can submit progress.
      if (task.assignedToId !== requesterId) {
        throw Object.assign(
          new Error("Only the assigned member can submit progress updates"),
          { statusCode: 403 },
        );
      }

      // 3. Verify that the requester is active.
      const user = await tx.user.findUnique({
        where: { id: requesterId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          status: true,
        },
      });

      if (!user || user.status !== "ACTIVE") {
        throw Object.assign(
          new Error("An active user is required to submit progress updates"),
          { statusCode: 403 },
        );
      }

      // 4. Create the progress update.
      const update = await tx.taskUpdate.create({
        data: {
          content,
          taskId,
          authorId: requesterId,
        },
        select: {
          id: true,
          content: true,
          taskId: true,
          authorId: true,
          createdAt: true,

          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      // 5. Retrieve all team leaders.
      const teamLeaders = await tx.teamMember.findMany({
        where: {
          teamId: task.teamId,
          role: "LEADER",
        },
        select: {
          userId: true,
        },
      });

      // 6. Identify notification recipients.
      // Include the task creator and all team leaders.
      // A Set prevents duplicate notifications.
      const recipients = new Set<string>();

      if (task.createdById !== requesterId) {
        recipients.add(task.createdById);
      }

      for (const leader of teamLeaders) {
        if (leader.userId !== requesterId) {
          recipients.add(leader.userId);
        }
      }

      // 7. Prepare the notification message.
      const actorName = `${user.firstName} ${user.lastName}`;

      const message =
        `${actorName} submitted a progress update for task ` +
        `"${task.title}": ${content}`;

      // 8. Create notifications and email jobs.
      for (const recipientId of recipients) {
        await createNotification(tx, {
          userId: recipientId,
          taskId: task.id,
          type: "TASK_PROGRESS_UPDATED",
          title: "New task progress update",
          message,
        });
      }

      return update;
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );
}

export async function updateTaskStatus(
  requesterId: string,
  isAdmin: boolean,
  taskId: string,
  newStatus: UpdateTaskStatusInput["status"],
) {
  return prisma.$transaction(
    async (tx) => {
      // 1. Find the task.
      const task = await tx.task.findUnique({
        where: { id: taskId },
        select: {
          id: true,
          title: true,
          teamId: true,
          createdById: true,
          assignedToId: true,
          status: true,
        },
      });

      if (!task) {
        throw Object.assign(new Error("Task not found"), {
          statusCode: 404,
        });
      }

      // 2. Verify that the requester is active.
      const requester = await tx.user.findUnique({
        where: { id: requesterId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          status: true,
        },
      });

      if (!requester || requester.status !== "ACTIVE") {
        throw Object.assign(
          new Error("An active user is required to update task status"),
          { statusCode: 403 },
        );
      }

      // 3. Determine whether the requester is a team leader.
      let isTeamLeader = false;

      if (!isAdmin) {
        const membership = await tx.teamMember.findUnique({
          where: {
            teamId_userId: {
              teamId: task.teamId,
              userId: requesterId,
            },
          },
          select: { role: true },
        });

        isTeamLeader = membership?.role === "LEADER";
      }

      // 4. Verify permissions.
      const hasManagementPermission = isAdmin || isTeamLeader;

      if (!hasManagementPermission) {
        if (task.assignedToId !== requesterId) {
          throw Object.assign(
            new Error(
              "Only the assigned member or a team leader can update this task",
            ),
            { statusCode: 403 },
          );
        }

        if (newStatus === "COMPLETED" || newStatus === "CANCELLED") {
          throw Object.assign(
            new Error(
              "Only team leaders or platform administrators can complete or cancel tasks",
            ),
            { statusCode: 403 },
          );
        }
      }

      // 5. Avoid unnecessary updates and notifications.
      if (task.status === newStatus) {
        return {
          id: task.id,
          title: task.title,
          status: task.status,
          teamId: task.teamId,
          assignedToId: task.assignedToId,
        };
      }

      // 6. Update task status.
      const updatedTask = await tx.task.update({
        where: { id: taskId },
        data: { status: newStatus },
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
          teamId: true,
          assignedToId: true,
          updatedAt: true,
        },
      });

      // 7. Determine notification type.
      let notificationType = "TASK_STATUS_CHANGED";
      let notificationTitle = "Task status updated";

      if (newStatus === "COMPLETED") {
        notificationType = "TASK_COMPLETED";
        notificationTitle = "Task completed";
      } else if (newStatus === "CANCELLED") {
        notificationType = "TASK_CANCELLED";
        notificationTitle = "Task cancelled";
      }

      // 8. Identify the person who performed the action.
      const actorName = `${requester.firstName} ${requester.lastName}`;

      const message =
        `${actorName} changed the status of task "${task.title}" ` +
        `from ${task.status} to ${newStatus}.`;

      // 9. Notify task participants.
      const recipients = new Set<string>();

      if (task.createdById !== requesterId) {
        recipients.add(task.createdById);
      }

      if (task.assignedToId && task.assignedToId !== requesterId) {
        recipients.add(task.assignedToId);
      }

      for (const recipientId of recipients) {
        await createNotification(tx, {
          userId: recipientId,
          taskId: task.id,
          type: notificationType,
          title: notificationTitle,
          message,
        });
      }

      return updatedTask;
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );
}

export async function updateTask(
  requesterId: string,
  isAdmin: boolean,
  taskId: string,
  data: UpdateTaskInput,
) {
  return prisma.$transaction(
    async (tx) => {
      // 1. Find the task and retrieve its current values.
      const task = await tx.task.findUnique({
        where: { id: taskId },
        select: {
          id: true,
          title: true,
          description: true,
          priority: true,
          dueDate: true,
          teamId: true,
          assignedToId: true,
        },
      });

      if (!task) {
        throw Object.assign(new Error("Task not found"), {
          statusCode: 404,
        });
      }

      // 2. Verify requester is active.
      const requester = await tx.user.findUnique({
        where: { id: requesterId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          status: true,
        },
      });

      if (!requester || requester.status !== "ACTIVE") {
        throw Object.assign(
          new Error("An active user is required to update a task"),
          { statusCode: 403 },
        );
      }

      // 3. Verify management permission.
      if (!isAdmin) {
        const membership = await tx.teamMember.findUnique({
          where: {
            teamId_userId: {
              teamId: task.teamId,
              userId: requesterId,
            },
          },
          select: { role: true },
        });

        if (!membership || membership.role !== "LEADER") {
          throw Object.assign(
            new Error(
              "Only team leaders or platform administrators can update task details",
            ),
            { statusCode: 403 },
          );
        }
      }

      // 4. Validate the new assignee, if provided.
      if (data.assignedToId !== undefined && data.assignedToId !== null) {
        const assignee = await tx.user.findUnique({
          where: { id: data.assignedToId },
          select: {
            id: true,
            status: true,
          },
        });

        if (!assignee) {
          throw Object.assign(new Error("Assigned user not found"), {
            statusCode: 404,
          });
        }

        if (assignee.status !== "ACTIVE") {
          throw Object.assign(
            new Error("Cannot assign a task to an inactive user"),
            { statusCode: 400 },
          );
        }

        const membership = await tx.teamMember.findUnique({
          where: {
            teamId_userId: {
              teamId: task.teamId,
              userId: data.assignedToId,
            },
          },
          select: {
            teamId: true,
            userId: true,
          },
        });

        if (!membership) {
          throw Object.assign(
            new Error("Assigned user is not a member of this team"),
            { statusCode: 400 },
          );
        }
      }

      // 5. Detect actual changes.
      const titleChanged =
        data.title !== undefined && data.title !== task.title;

      const descriptionChanged =
        data.description !== undefined && data.description !== task.description;

      const priorityChanged =
        data.priority !== undefined && data.priority !== task.priority;

      const dueDateChanged =
        data.dueDate !== undefined &&
        (data.dueDate
          ? new Date(data.dueDate).getTime() !== task.dueDate?.getTime()
          : task.dueDate !== null);

      const changedFields: string[] = [];

      if (titleChanged) changedFields.push("title");
      if (descriptionChanged) changedFields.push("description");
      if (priorityChanged) changedFields.push("priority");
      if (dueDateChanged) changedFields.push("dueDate");

      const assignmentChanged =
        data.assignedToId !== undefined &&
        data.assignedToId !== task.assignedToId;

      // 6. Update only supplied fields.
      const updatedTask = await tx.task.update({
        where: { id: taskId },
        data: {
          ...(data.title !== undefined && {
            title: data.title,
          }),

          ...(data.description !== undefined && {
            description: data.description,
          }),

          ...(data.priority !== undefined && {
            priority: data.priority,
          }),

          ...(data.dueDate !== undefined && {
            dueDate: data.dueDate ? new Date(data.dueDate) : null,
          }),

          ...(data.assignedToId !== undefined && {
            assignedToId: data.assignedToId,
          }),
        },
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          priority: true,
          dueDate: true,
          teamId: true,
          createdById: true,
          assignedToId: true,
          createdAt: true,
          updatedAt: true,

          team: {
            select: {
              id: true,
              name: true,
            },
          },

          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      // 7. Prepare the actor's name.
      const actorName = `${requester.firstName} ${requester.lastName}`;

      // 8. Handle assignment changes.
      if (assignmentChanged) {
        // Notify previous assignee.
        if (task.assignedToId && task.assignedToId !== requesterId) {
          await createNotification(tx, {
            userId: task.assignedToId,
            taskId: task.id,
            type: "TASK_UNASSIGNED",
            title: "Task reassigned",
            message: `${actorName} reassigned the task "${updatedTask.title}" to another team member.`,
          });
        }

        // Notify new assignee.
        if (updatedTask.assignedToId) {
          await createNotification(tx, {
            userId: updatedTask.assignedToId,
            taskId: updatedTask.id,
            type: "TASK_ASSIGNED",
            title: "Task assigned to you",
            message: `${actorName} assigned the task "${updatedTask.title}" to you.${changedFields.length > 0 ? ` The following details were also updated: ${changedFields.join(", ")}.` : ""}`,
          });
        }
      } else if (
        changedFields.length > 0 &&
        updatedTask.assignedToId &&
        updatedTask.assignedToId !== requesterId
      ) {
        // 9. Notify current assignee about task modifications.
        await createNotification(tx, {
          userId: updatedTask.assignedToId,
          taskId: updatedTask.id,
          type: "TASK_UPDATED",
          title: "Assigned task updated",
          message: `${actorName} updated the task "${updatedTask.title}". Changed details: ${changedFields.join(", ")}. Please review the latest task details.`,
        });
      }

      return updatedTask;
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );
}

export async function deleteTask(taskId: string) {
  return prisma.$transaction(
    async (tx) => {
      // 1. Check whether the task exists.
      const task = await tx.task.findUnique({
        where: {
          id: taskId,
        },
        select: {
          id: true,
          title: true,
        },
      });

      if (!task) {
        throw Object.assign(new Error("Task not found"), {
          statusCode: 404,
        });
      }

      // 2. Delete the task.
      // Related TaskUpdates are deleted automatically
      // because the TaskUpdate relation uses onDelete: Cascade.
      await tx.task.delete({
        where: {
          id: taskId,
        },
      });

      return task;
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );
}
