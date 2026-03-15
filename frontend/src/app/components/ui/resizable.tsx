"use client";

import { GripVerticalIcon } from "lucide-react";
import * as Resizable from "react-resizable-panels";

import { cn } from "./utils";

type ResizablePanelGroupProps = Resizable.PanelGroupProps & {
  className?: string;
};

function ResizablePanelGroup({
  className,
  ...props
}: ResizablePanelGroupProps) {
  return (
    <Resizable.PanelGroup
      data-slot="resizable-panel-group"
      className={cn(
        "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
        className
      )}
      {...props}
    />
  );
}

type ResizablePanelProps = Resizable.PanelProps;

function ResizablePanel(props: ResizablePanelProps) {
  return <Resizable.Panel data-slot="resizable-panel" {...props} />;
}

type ResizableHandleProps = {
  withHandle?: boolean;
  className?: string;
} & React.ComponentProps<typeof Resizable.PanelResizeHandle>;

function ResizableHandle({
  withHandle,
  className,
  ...props
}: ResizableHandleProps) {
  return (
    <Resizable.PanelResizeHandle
      data-slot="resizable-handle"
      className={cn(
        "bg-border relative flex w-px items-center justify-center",
        className
      )}
      {...props}
    >
      {withHandle && (
        <div className="bg-border z-10 flex h-4 w-3 items-center justify-center rounded-xs border">
          <GripVerticalIcon className="size-2.5" />
        </div>
      )}
    </Resizable.PanelResizeHandle>
  );
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };