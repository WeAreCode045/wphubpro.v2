import React, { useState } from "react";
import { useLibraryItems } from "../../hooks/useLibrary.ts";
import { Loader2, Package, Brush, PlusCircle } from "lucide-react";
import Button from "../ui/Button.tsx";

const LibraryGrid: React.FC = () => {
  const { data: items, isLoading, isError } = useLibraryItems();
  const [filter, setFilter] = useState<"all" | "plugin" | "theme">("all");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return <p className="text-destructive">Failed to load library items.</p>;
  }

  const filteredItems =
    items?.filter((item) => {
      if (filter === "all") return true;
      return item.type === filter;
    }) || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          All
        </Button>
        <Button
          variant={filter === "plugin" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("plugin")}
        >
          Plugins
        </Button>
        <Button
          variant={filter === "theme" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("theme")}
        >
          Themes
        </Button>
      </div>
      {filteredItems.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-lg">
          <div className="mx-auto h-12 w-12 text-muted-foreground">
            {filter === "plugin" ? (
              <Package />
            ) : filter === "theme" ? (
              <Brush />
            ) : (
              <Package />
            )}
          </div>
          <h3 className="mt-2 text-lg font-medium text-foreground">
            No {filter !== "all" ? filter + "s" : "items"} in your library
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add items from WordPress.org or upload your own to get started.
          </p>
          <Button className="mt-6">
            <PlusCircle className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredItems.map((item) => (
            // FIX: Changed item.id to item.$id to match the LibraryItem type from Appwrite.
            <div
              key={item.$id}
              className="bg-card border border-border rounded-lg p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-foreground pr-2">
                    {item.name}
                  </h3>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${item.source === "local" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}`}
                  >
                    {item.source}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  By {item.author}
                </p>
              </div>
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-border">
                <span className="text-xs font-mono bg-secondary px-2 py-1 rounded">
                  v{item.version}
                </span>
                <Button variant="secondary" size="sm">
                  Install
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LibraryGrid;
