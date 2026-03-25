import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Loader2, AlertCircle, CheckCircle, Send } from "lucide-react";
import {
  runAgentTask,
  getAvailableTools,
  checkAgentHealth,
  AgentRunResponse,
} from "@/api/agent";
import { useAgentStore } from "@/store/agentStore";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { ScrollArea } from "@/app/components/ui/scroll-area";

interface TaskFormInput {
  task: string;
}

export default function AgentPage() {
  const { register, handleSubmit, reset, watch } = useForm<TaskFormInput>({
    defaultValues: { task: "" },
  });

  const token = useAuthStore((state) => state.token);
  const {
    tasks,
    currentTaskId,
    isLoading,
    error,
    availableTools,
    addTask,
    updateTask,
    setError,
    setLoading,
    setAvailableTools,
    setCurrentTaskId,
  } = useAgentStore();

  const [serviceHealth, setServiceHealth] = useState<boolean>(false);
  const taskInput = watch("task");
  const currentTask = tasks.find((t) => t.id === currentTaskId);

  // Check service health on mount
  useEffect(() => {
    const checkHealth = async () => {
      const isHealthy = await checkAgentHealth();
      setServiceHealth(isHealthy);
      if (!isHealthy) {
        setError(
          "IA-service is not available. Make sure Docker Compose is running."
        );
      }
    };

    checkHealth();
  }, [setError]);

  // Fetch available tools
  useEffect(() => {
    const fetchTools = async () => {
      if (!serviceHealth) return;
      try {
        const tools = await getAvailableTools(token || undefined);
        setAvailableTools(tools.tools);
      } catch (err) {
        console.error("Failed to fetch tools:", err);
      }
    };

    if (!availableTools) {
      fetchTools();
    }
  }, [serviceHealth, availableTools, setAvailableTools, token]);

  const onSubmit = async (data: TaskFormInput) => {
    if (!data.task.trim()) {
      setError("Please enter a task");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const taskId = `task_${Date.now()}`;

      // Add optimistic task
      addTask({
        id: taskId,
        task: data.task,
        response: "",
        toolUsed: null,
        toolResult: null,
        status: "running",
        createdAt: new Date(),
        error: null,
      });

      // Call API
      const result: AgentRunResponse = await runAgentTask(
        { task: data.task },
        token || undefined
      );

      // Update task with result
      updateTask(taskId, {
        status: result.status || "completed",
        response: result.response,
        toolUsed: result.tool_used,
        toolResult: result.tool_result,
        error: result.error,
      });

      reset();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to process task";
      setError(errorMessage);

      // Update task with error
      const taskId = `task_${Date.now()}`;
      updateTask(taskId, {
        status: "error",
        error: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold">AI Agent</h1>
        <p className="text-gray-500 mt-2">
          Interact with our intelligent AI agent to complete tasks
        </p>
      </div>

      {/* Service Status */}
      <Alert
        className={`${
          serviceHealth ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
        }`}
      >
        <div className="flex items-center gap-2">
          {serviceHealth ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription
            className={serviceHealth ? "text-green-600" : "text-red-600"}
          >
            {serviceHealth
              ? "IA-service is online and ready"
              : "IA-service is offline"}
          </AlertDescription>
        </div>
      </Alert>

      {error && (
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-600">{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task Input */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Create a Task</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Describe your task
                  </label>
                  <textarea
                    {...register("task", { required: true })}
                    placeholder="e.g., 'Write a professional email about project status' or 'Analyze my tech stock portfolio for Q1'"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                    disabled={isLoading || !serviceHealth}
                  />
                </div>

                <div className="text-sm text-gray-500">
                  {taskInput.length} / 500 characters
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || !serviceHealth || !taskInput.trim()}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Execute Task
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Available Tools */}
          {availableTools && Object.keys(availableTools).length > 0 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-sm">Available Tools</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(availableTools).map(([toolName, { description }]) => (
                    <div
                      key={toolName}
                      className="p-2 bg-blue-50 rounded-md border border-blue-100"
                    >
                      <p className="font-medium text-xs text-blue-900">{toolName}</p>
                      <p className="text-xs text-blue-700">{description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Task Results */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Results</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-full max-h-96">
                {tasks.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No tasks yet. Create one to get started!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        className={`p-3 rounded-md border cursor-pointer ${
                          task.id === currentTaskId
                            ? "bg-blue-50 border-blue-300"
                            : "bg-gray-50 border-gray-200 hover:border-gray-300"
                        }`}
                        onClick={() => setCurrentTaskId(task.id)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-xs font-medium text-gray-900 line-clamp-2">
                              {task.task}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {task.createdAt
                                ? new Date(task.createdAt).toLocaleTimeString()
                                : "Just now"}
                            </p>
                          </div>
                          <div className="flex-shrink-0">
                            {task.status === "running" && (
                              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                            )}
                            {task.status === "completed" && (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            )}
                            {task.error && (
                              <AlertCircle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Task Details */}
      {currentTask && (
        <Card>
          <CardHeader>
            <CardTitle>Task Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="response" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="response">Response</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="raw">Raw</TabsTrigger>
              </TabsList>

              <TabsContent value="response" className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-md min-h-32 whitespace-pre-wrap text-sm">
                  {currentTask.response ? (
                    <p>{currentTask.response}</p>
                  ) : currentTask.status === "running" ? (
                    <div className="flex items-center gap-2 text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing task...
                    </div>
                  ) : (
                    <p className="text-gray-500">No response yet</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="details" className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-gray-600">Task</p>
                  <p className="text-sm text-gray-900 mt-1">{currentTask.task}</p>
                </div>

                {currentTask.toolUsed && (
                  <div>
                    <p className="text-xs font-medium text-gray-600">Tool Used</p>
                    <p className="text-sm text-gray-900 mt-1">{currentTask.toolUsed}</p>
                  </div>
                )}

                {currentTask.toolResult && (
                  <div>
                    <p className="text-xs font-medium text-gray-600">Tool Result</p>
                    <p className="text-sm text-gray-900 mt-1">{currentTask.toolResult}</p>
                  </div>
                )}

                <div>
                  <p className="text-xs font-medium text-gray-600">Status</p>
                  <p className="text-sm text-gray-900 mt-1">{currentTask.status || "unknown"}</p>
                </div>

                {currentTask.error && (
                  <div className="bg-red-50 p-3 rounded-md">
                    <p className="text-xs font-medium text-red-600">Error</p>
                    <p className="text-sm text-red-700 mt-1">{currentTask.error}</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="raw">
                <div className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-auto max-h-96 text-xs font-mono">
                  <pre>{JSON.stringify(currentTask, null, 2)}</pre>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
