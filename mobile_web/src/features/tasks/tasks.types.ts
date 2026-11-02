export type TaskStatus =
  | "TODO"
  | "IN_PROGRESS"
  | "IN_REVIEW"
  | "COMPLETED"
  | "CANCELLED";

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface TaskUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface TaskTeam {
  id: string;
  name: string;
}

export interface TaskUpdateCount {
  updates: number;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;

  teamId: string;
  createdById: string;
  assignedToId: string | null;

  createdAt: string;
  updatedAt: string;

  team: TaskTeam;
  createdBy: TaskUser;
  assignedTo: TaskUser | null;

  _count: TaskUpdateCount;

  isOverdue: boolean;
}

export interface TasksResponse {
  success: boolean;
  message: string;
  data: Task[];
}

export interface TaskResponse {
  success: boolean;
  message: string;
  data: Task;
}

export interface GetTasksFilters {
  teamId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedToId?: string;
}

export interface TaskDetailsTeam {
  id: string;
  name: string;
  description: string | null;
}

export interface TaskProgressUpdate {
  id: string;
  content: string;
  taskId: string;
  authorId: string;
  createdAt: string;
  author: TaskUser;
}

export interface TaskDetails extends Omit<Task, "team"> {
  team: TaskDetailsTeam;
  updates: TaskProgressUpdate[];
  _count: TaskUpdateCount;
}

export interface TaskDetailsResponse {
  success: boolean;
  message: string;
  data: TaskDetails;
}

export interface CreateTaskUpdateRequest {
  content: string;
}

export interface CreateTaskUpdateResponse {
  success: boolean;
  message: string;
  data: TaskProgressUpdate;
}

export interface UpdateTaskStatusRequest {
  status: TaskStatus;
}

export interface UpdateTaskStatusResponse {
  success: boolean;
  message: string;
  data: Task;
}

export interface CreateTaskRequest {
  title: string;
  description?: string | null;
  teamId: string;
  assignedToId?: string;
  priority?: TaskPriority;
  dueDate?: string;
}

export interface CreatedTask {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  teamId: string;
  createdById: string;
  assignedToId: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: TaskUser;
  assignedTo: TaskUser | null;
}

export interface CreateTaskResponse {
  success: boolean;
  message: string;
  data: CreatedTask;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string | null;
  priority?: TaskPriority;
  dueDate?: string | null;
  assignedToId?: string | null;
}
