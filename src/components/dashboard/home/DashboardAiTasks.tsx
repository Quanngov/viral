"use client";

import type { DashboardAiMonthlyTask } from "@/lib/dashboard-home-types";

type AiTasksProps = {
  tasks: DashboardAiMonthlyTask[];
};

export function DashboardAiTasks({ tasks }: AiTasksProps) {
  return (
    <div className="dashboard-home-tasks">
      <p className="dashboard-home-panel__heading">AI-задачи</p>
      {tasks.length === 0 ? (
        <p className="dashboard-home-tasks__empty">План на месяц появится после анализа аккаунта.</p>
      ) : (
        <ul className="dashboard-home-tasks__list">
          {tasks.slice(0, 3).map((task) => (
            <li key={task.id} className="dashboard-home-tasks__item">
              <span
                className={`dashboard-home-tasks__check ${task.completed ? "dashboard-home-tasks__check--done" : ""}`}
                aria-hidden
              >
                {task.completed ? "☑" : "☐"}
              </span>
              <span className={`dashboard-home-tasks__label ${task.completed ? "dashboard-home-tasks__label--done" : ""}`}>
                {task.label}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
