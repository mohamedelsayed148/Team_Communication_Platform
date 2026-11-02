import apiClient from "@/src/api/client";

import type {
  Task,
  TasksResponse,
  TaskDetails,
  TaskDetailsResponse,
  GetTasksFilters,
  CreateTaskUpdateRequest,
  UpdateTaskStatusRequest,
  CreateTaskRequest,
  CreateTaskResponse,
  UpdateTaskRequest,
} from "./tasks.types";

export async function getTasks(filters?: GetTasksFilters): Promise<Task[]> {
  const response = await apiClient.get<TasksResponse>("/tasks", {
    params: filters,
  });

  return response.data.data;
}

export async function getTaskById(taskId: string): Promise<TaskDetails> {
  const response = await apiClient.get<TaskDetailsResponse>(`/tasks/${taskId}`);

  return response.data.data;
}

export async function createTaskUpdate(
  taskId: string,
  data: CreateTaskUpdateRequest,
): Promise<void> {
  await apiClient.post(`/tasks/${taskId}/updates`, data);
}

export async function updateTaskStatus(
  taskId: string,
  data: UpdateTaskStatusRequest,
): Promise<void> {
  await apiClient.patch(`/tasks/${taskId}/status`, data);
}

export async function createTask(
  data: CreateTaskRequest,
): Promise<CreateTaskResponse> {
  const response = await apiClient.post<CreateTaskResponse>("/tasks", data);

  return response.data;
}

export async function updateTask(
  taskId: string,
  data: UpdateTaskRequest,
): Promise<void> {
  await apiClient.patch(`/tasks/${taskId}`, data);
}

export async function deleteTask(taskId: string): Promise<void> {
  await apiClient.delete(`/tasks/${taskId}`);
}