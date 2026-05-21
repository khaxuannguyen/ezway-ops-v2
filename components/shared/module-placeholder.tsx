import * as React from "react";
import { Hammer, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";

export interface ModulePlaceholderProps {
  title: React.ReactNode;
  description: React.ReactNode;
  icon?: LucideIcon;
  emptyTitle?: React.ReactNode;
  emptyDescription?: React.ReactNode;
  actions?: React.ReactNode;
}

export function ModulePlaceholder({
  title,
  description,
  icon = Hammer,
  emptyTitle = "Mô-đun đang được chuẩn bị",
  emptyDescription = "Chức năng này sẽ được kích hoạt trong các giai đoạn tiếp theo.",
  actions,
}: ModulePlaceholderProps) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} actions={actions} />
      <Card>
        <CardContent className="p-6">
          <EmptyState
            icon={icon}
            title={emptyTitle}
            description={emptyDescription}
          />
        </CardContent>
      </Card>
    </div>
  );
}
