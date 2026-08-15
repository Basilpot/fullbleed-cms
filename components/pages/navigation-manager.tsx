"use client";

import React, { useState, useEffect, JSX } from "react";
import {
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Edit2,
  Save,
  X,
  Code,
  Eye,
  ArrowRight,
  ArrowLeft,
  MoveDown,
  MoveUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import CodeEditor from "@uiw/react-textarea-code-editor";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "../page-header";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface MenuItem {
  id: string;
  label: string;
  url: string;
  children: MenuItem[];
}

interface MenuFormData {
  label: string;
  url: string;
}

interface SortableMenuItemProps {
  item: MenuItem;
  depth: number;
  onEdit: (item: MenuItem) => void;
  onDelete: (id: string) => void;
  onIncreaseDepth: (id: string) => void;
  onDecreaseDepth: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  hasChildren: boolean;
  canIncreaseDepth: boolean;
  canDecreaseDepth: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

const SortableMenuItem: React.FC<SortableMenuItemProps> = ({
  item,
  depth,
  onEdit,
  onDelete,
  onIncreaseDepth,
  onDecreaseDepth,
  onMoveUp,
  onMoveDown,
  isExpanded,
  onToggle,
  hasChildren,
  canIncreaseDepth,
  canDecreaseDepth,
  canMoveUp,
  canMoveDown,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-2">
      <div
        className="flex items-center gap-2 p-3 bg-card border rounded-lg hover:shadow-md transition-all group"
        style={{ marginLeft: `${depth * 32}px` }}
      >
        <div {...attributes} {...listeners} className="cursor-move">
          <GripVertical className="w-4 h-4 text-muted-foreground hover:text-foreground" />
        </div>

        {hasChildren ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onToggle(item.id)}
            className="h-6 w-6"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </Button>
        ) : (
          <div className="w-6" />
        )}

        <div className="flex-1 min-w-0">
          <div className="font-medium text-foreground truncate">{item.label}</div>
          <div className="text-sm text-muted-foreground truncate">{item.url}</div>
        </div>

        {depth > 0 && (
          <Badge variant="outline" className="text-xs">
            Level {depth + 1}
          </Badge>
        )}

        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onMoveUp(item.id)}
            disabled={!canMoveUp}
            className="h-8 w-8"
            title="Move up"
          >
            <MoveUp className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onMoveDown(item.id)}
            disabled={!canMoveDown}
            className="h-8 w-8"
            title="Move down"
          >
            <MoveDown className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onIncreaseDepth(item.id)}
            disabled={!canIncreaseDepth}
            className="h-8 w-8 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
            title="Increase depth (nest under previous)"
          >
            <ArrowRight className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDecreaseDepth(item.id)}
            disabled={!canDecreaseDepth}
            className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
            title="Decrease depth (move up one level)"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(item)}
            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(item.id)}
            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

const NavigationManager = ({ footer }: { footer?: boolean }) => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [autoItems, setAutoItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoNav, setAutoNav] = useState(false);

  const [newItem, setNewItem] = useState<MenuFormData>({ label: "", url: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<MenuFormData>({
    label: "",
    url: "",
  });
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [showJsonEditor, setShowJsonEditor] = useState(false);
  const [jsonInput, setJsonInput] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const API_BASE_URL = "/api";
  const endpoint = footer ? "footers" : "menus";

  useEffect(() => {
    fetchMenu();
  }, []);

  const fetchMenu = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/${endpoint}`);
      const data = await res.json();

      if (data.success) {
        setMenuItems(data.data.items || []);
        setAutoItems(data.data.autoItems || []);
        setAutoNav(data.data.auto === true);
      }
    } catch (error) {
      console.error("Error fetching menu:", error);
      toast.error("Failed to load menu");
    } finally {
      setLoading(false);
    }
  };

  const saveMenu = async (items: MenuItem[]) => {
    try {
      setSaving(true);
      const res = await fetch(`${API_BASE_URL}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      const data = await res.json();

      if (data.success) {
      } else {
        toast.error("Failed to save menu");
      }
    } catch (error) {
      console.error("Error saving menu:", error);
      toast.error("Failed to save menu");
    } finally {
      setSaving(false);
    }
  };

  const handleAutoNavChange = async (value: boolean) => {
    setAutoNav(value);
    try {
      const res = await fetch(`${API_BASE_URL}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: menuItems, auto: value }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error("Failed to save auto nav");
        setAutoNav(!value);
      } else {
        toast.success(
          value ? "Auto nav enabled" : "Auto nav disabled",
        );
      }
    } catch (error) {
      console.error("Error saving auto nav:", error);
      toast.error("Failed to save auto nav");
      setAutoNav(!value);
    }
  };

  const generateId = (): string => Math.random().toString(36).substr(2, 9);

  const flattenItems = (
    items: MenuItem[],
    parentId: string | null = null,
    depth = 0,
  ): Array<
    MenuItem & { parentId: string | null; depth: number; path: string[] }
  > => {
    let flat: Array<
      MenuItem & { parentId: string | null; depth: number; path: string[] }
    > = [];
    items.forEach((item, index) => {
      flat.push({
        ...item,
        parentId,
        depth,
        path: parentId
          ? [...(flat.find((f) => f.id === parentId)?.path || []), item.id]
          : [item.id],
      });
      if (item.children && item.children.length > 0) {
        flat = [...flat, ...flattenItems(item.children, item.id, depth + 1)];
      }
    });
    return flat;
  };

  const addMenuItem = async () => {
    if (!newItem.label || !newItem.url) return;

    const item: MenuItem = {
      id: generateId(),
      label: newItem.label,
      url: newItem.url,
      children: [],
    };

    const newItems = [...menuItems, item];
    setMenuItems(newItems);
    await saveMenu(newItems);
    setNewItem({ label: "", url: "" });
    toast.success("Menu item added");
  };

  const deleteMenuItem = (
    id: string,
    items: MenuItem[] = menuItems,
  ): MenuItem[] => {
    return items.filter((item) => {
      if (item.id === id) return false;
      if (item.children.length > 0) {
        item.children = deleteMenuItem(id, item.children);
      }
      return true;
    });
  };

  const handleDelete = async (id: string) => {
    const newItems = deleteMenuItem(id);
    setMenuItems(newItems);
    await saveMenu(newItems);
    toast.success("Menu item deleted");
  };

  const findItemById = (
    id: string,
    items: MenuItem[] = menuItems,
  ): MenuItem | null => {
    for (const item of items) {
      if (item.id === id) return item;
      if (item.children.length > 0) {
        const found = findItemById(id, item.children);
        if (found) return found;
      }
    }
    return null;
  };

  const updateMenuItem = (
    id: string,
    updates: Partial<MenuItem>,
    items: MenuItem[] = menuItems,
  ): MenuItem[] => {
    return items.map((item) => {
      if (item.id === id) {
        return { ...item, ...updates };
      }
      if (item.children.length > 0) {
        return {
          ...item,
          children: updateMenuItem(id, updates, item.children),
        };
      }
      return item;
    });
  };

  const removeFromParent = (
    itemId: string,
    items: MenuItem[],
  ): { items: MenuItem[]; removedItem: MenuItem | null } => {
    let removedItem: MenuItem | null = null;
    const newItems = items.filter((item) => {
      if (item.id === itemId) {
        removedItem = { ...item };
        return false;
      }
      if (item.children.length > 0) {
        const result = removeFromParent(itemId, item.children);
        item.children = result.items;
        if (result.removedItem) removedItem = result.removedItem;
      }
      return true;
    });
    return { items: newItems, removedItem };
  };

  const addToParent = (
    parentId: string,
    newChild: MenuItem,
    items: MenuItem[],
  ): MenuItem[] => {
    return items.map((item) => {
      if (item.id === parentId) {
        return { ...item, children: [...item.children, newChild] };
      }
      if (item.children.length > 0) {
        return {
          ...item,
          children: addToParent(parentId, newChild, item.children),
        };
      }
      return item;
    });
  };

  const moveUp = async (itemId: string) => {
    const flatItems = flattenItems(menuItems);
    const itemIndex = flatItems.findIndex((i) => i.id === itemId);

    if (itemIndex <= 0) return;

    const currentItem = flatItems[itemIndex];
    const currentParentId = currentItem.parentId;

    // Find previous sibling (same parent)
    let prevSiblingIndex = -1;
    for (let i = itemIndex - 1; i >= 0; i--) {
      if (flatItems[i].parentId === currentParentId) {
        prevSiblingIndex = i;
        break;
      }
    }

    if (prevSiblingIndex === -1) return;

    const { items: tempItems, removedItem } = removeFromParent(
      itemId,
      menuItems,
    );
    if (!removedItem) return;

    const insertItem = (
      items: MenuItem[],
      targetId: string,
      newItem: MenuItem,
    ): MenuItem[] => {
      const result: MenuItem[] = [];
      for (const item of items) {
        if (item.id === targetId) {
          result.push(newItem, item);
        } else {
          result.push({
            ...item,
            children:
              item.children.length > 0
                ? insertItem(item.children, targetId, newItem)
                : item.children,
          });
        }
      }
      return result;
    };

    const prevSibling = flatItems[prevSiblingIndex];
    let newItems: MenuItem[];

    if (currentParentId) {
      newItems = insertItem(tempItems, prevSibling.id, removedItem);
    } else {
      const rootIndex = tempItems.findIndex((i) => i.id === prevSibling.id);
      tempItems.splice(rootIndex, 0, removedItem);
      newItems = tempItems;
    }

    setMenuItems(newItems);
    await saveMenu(newItems);
  };

  const moveDown = async (itemId: string) => {
    const flatItems = flattenItems(menuItems);
    const itemIndex = flatItems.findIndex((i) => i.id === itemId);

    if (itemIndex === -1) return;

    const currentItem = flatItems[itemIndex];
    const currentParentId = currentItem.parentId;

    // Find next sibling (same parent)
    let nextSiblingIndex = -1;
    for (let i = itemIndex + 1; i < flatItems.length; i++) {
      if (flatItems[i].parentId === currentParentId) {
        nextSiblingIndex = i;
        break;
      }
    }

    if (nextSiblingIndex === -1) return;

    const { items: tempItems, removedItem } = removeFromParent(
      itemId,
      menuItems,
    );
    if (!removedItem) return;

    const insertAfterItem = (
      items: MenuItem[],
      targetId: string,
      newItem: MenuItem,
    ): MenuItem[] => {
      const result: MenuItem[] = [];
      for (const item of items) {
        result.push(item);
        if (item.id === targetId) {
          result.push(newItem);
        }
        if (item.children.length > 0) {
          item.children = insertAfterItem(item.children, targetId, newItem);
        }
      }
      return result;
    };

    const nextSibling = flatItems[nextSiblingIndex];
    let newItems: MenuItem[];

    if (currentParentId) {
      newItems = insertAfterItem(tempItems, nextSibling.id, removedItem);
    } else {
      const rootIndex = tempItems.findIndex((i) => i.id === nextSibling.id);
      tempItems.splice(rootIndex + 1, 0, removedItem);
      newItems = tempItems;
    }

    setMenuItems(newItems);
    await saveMenu(newItems);
  };

  const increaseDepth = async (itemId: string) => {
    const flatItems = flattenItems(menuItems);
    const itemIndex = flatItems.findIndex((i) => i.id === itemId);

    if (itemIndex <= 0) return;

    const currentItem = flatItems[itemIndex];
    const currentParentId = currentItem.parentId;

    // Find previous sibling
    let prevSiblingIndex = -1;
    for (let i = itemIndex - 1; i >= 0; i--) {
      if (flatItems[i].parentId === currentParentId) {
        prevSiblingIndex = i;
        break;
      }
    }

    if (prevSiblingIndex === -1) return;

    const previousItem = flatItems[prevSiblingIndex];

    const { items: newItems, removedItem } = removeFromParent(
      itemId,
      menuItems,
    );
    if (!removedItem) return;

    const finalItems = addToParent(previousItem.id, removedItem, newItems);

    setMenuItems(finalItems);
    await saveMenu(finalItems);
    setExpandedItems(new Set([...expandedItems, previousItem.id]));
  };

  const decreaseDepth = async (itemId: string) => {
    const flatItems = flattenItems(menuItems);
    const itemIndex = flatItems.findIndex((i) => i.id === itemId);

    if (itemIndex < 0) return;

    const item = flatItems[itemIndex];
    if (!item.parentId) return;

    const { items: tempItems, removedItem } = removeFromParent(
      itemId,
      menuItems,
    );
    if (!removedItem) return;

    const parentItem = flatItems.find((i) => i.id === item.parentId);
    if (!parentItem) return;

    const grandparentId = parentItem.parentId;

    const insertAfterItem = (
      items: MenuItem[],
      targetId: string,
      newItem: MenuItem,
    ): MenuItem[] => {
      const result: MenuItem[] = [];
      for (const item of items) {
        result.push(item);
        if (item.id === targetId) {
          result.push(newItem);
        }
        if (item.children.length > 0) {
          item.children = insertAfterItem(item.children, targetId, newItem);
        }
      }
      return result;
    };

    let newItems: MenuItem[];
    if (grandparentId) {
      newItems = insertAfterItem(tempItems, item.parentId, removedItem);
    } else {
      const parentIndex = tempItems.findIndex((i) => i.id === item.parentId);
      tempItems.splice(parentIndex + 1, 0, removedItem);
      newItems = tempItems;
    }

    setMenuItems(newItems);
    await saveMenu(newItems);
  };

  const handleEdit = (item: MenuItem) => {
    setEditingId(item.id);
    setEditingItem({ label: item.label, url: item.url });
  };

  const handleSaveEdit = async (id: string) => {
    const newItems = updateMenuItem(id, editingItem);
    setMenuItems(newItems);
    await saveMenu(newItems);
    setEditingId(null);
    setEditingItem({ label: "", url: "" });
    toast.success("Menu item updated");
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      setActiveId(null);
      return;
    }

    const { items: tempItems, removedItem } = removeFromParent(
      String(active.id),
      menuItems,
    );
    if (!removedItem) {
      setActiveId(null);
      return;
    }

    const insertBeforeItem = (
      items: MenuItem[],
      targetId: string,
      newItem: MenuItem,
    ): MenuItem[] => {
      const result: MenuItem[] = [];
      for (const item of items) {
        if (item.id === targetId) {
          result.push(newItem, item);
        } else {
          result.push({
            ...item,
            children:
              item.children.length > 0
                ? insertBeforeItem(item.children, targetId, newItem)
                : item.children,
          });
        }
      }
      return result;
    };

    const overParentId =
      flattenItems(menuItems).find((i) => i.id === over.id)?.parentId ?? null;
    let newItems: MenuItem[];

    if (overParentId === null) {
      const overIndex = tempItems.findIndex((i) => i.id === over.id);
      tempItems.splice(overIndex, 0, removedItem);
      newItems = tempItems;
    } else {
      newItems = insertBeforeItem(tempItems, String(over.id), removedItem);
    }

    setMenuItems(newItems);
    saveMenu(newItems);
    setActiveId(null);
  };

  const toggleJsonEditor = () => {
    if (!showJsonEditor) {
      setJsonInput(JSON.stringify(menuItems, null, 2));
      setJsonError("");
    }
    setShowJsonEditor(!showJsonEditor);
  };

  const handleJsonSave = async () => {
    try {
      const parsed = JSON.parse(jsonInput);
      setMenuItems(parsed);
      await saveMenu(parsed);
      setJsonError("");
      setShowJsonEditor(false);
      toast.success("JSON updated successfully");
    } catch (error) {
      setJsonError("Invalid JSON: " + (error as Error).message);
    }
  };

  const exportJSON = () => {
    const json = JSON.stringify(menuItems, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "menu-structure.json";
    a.click();
    toast.success("JSON exported");
  };

  const renderMenuItem = (
    item: MenuItem,
    depth = 0,
    index: number,
    siblings: MenuItem[],
  ): JSX.Element => {
    const isExpanded = expandedItems.has(item.id);
    const hasChildren = item.children && item.children.length > 0;
    const isEditing = editingId === item.id;

    const flatItems = flattenItems(menuItems);
    const currentFlatIndex = flatItems.findIndex((i) => i.id === item.id);
    const currentItem = flatItems[currentFlatIndex];

    // Check if can move up (has previous sibling with same parent)
    const canMoveUp = flatItems
      .slice(0, currentFlatIndex)
      .some((i) => i.parentId === currentItem.parentId);

    // Check if can move down (has next sibling with same parent)
    const canMoveDown = flatItems
      .slice(currentFlatIndex + 1)
      .some((i) => i.parentId === currentItem.parentId);

    const canIncreaseDepth = canMoveUp; // Can nest if there's a previous sibling
    const canDecreaseDepth = depth > 0; // Can decrease if not at root

    return (
      <div key={item.id}>
        {isEditing ? (
          <div
            className="flex items-center gap-2 p-3 bg-card border rounded-lg mb-2"
            style={{ marginLeft: `${depth * 32}px` }}
          >
            <div className="flex-1 space-y-2">
              <Input
                type="text"
                value={editingItem.label}
                onChange={(e) =>
                  setEditingItem({ ...editingItem, label: e.target.value })
                }
                placeholder="Label"
              />
              <Input
                type="text"
                value={editingItem.url}
                onChange={(e) =>
                  setEditingItem({ ...editingItem, url: e.target.value })
                }
                placeholder="URL"
              />
            </div>
            <Button
              size="icon"
              onClick={() => handleSaveEdit(item.id)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Save className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setEditingId(null)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <SortableMenuItem
            item={item}
            depth={depth}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onIncreaseDepth={increaseDepth}
            onDecreaseDepth={decreaseDepth}
            onMoveUp={moveUp}
            onMoveDown={moveDown}
            isExpanded={isExpanded}
            onToggle={toggleExpand}
            hasChildren={hasChildren}
            canIncreaseDepth={canIncreaseDepth}
            canDecreaseDepth={canDecreaseDepth}
            canMoveUp={canMoveUp}
            canMoveDown={canMoveDown}
          />
        )}

        {hasChildren && isExpanded && (
          <div className="mt-1">
            {item.children.map((child, idx) =>
              renderMenuItem(child, depth + 1, idx, item.children),
            )}
          </div>
        )}
      </div>
    );
  };

  const activeItem = activeId ? findItemById(activeId) : null;

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-6 flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading menu...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        <div className="mb-6">
          <PageHeader
            title={footer ? "Footer" : "Navbar"}
            description={
              footer
                ? "Customize your footer navigation."
                : "Customize your header navigation."
            }
          >
            <button
              type="button"
              onClick={() => handleAutoNavChange(!autoNav)}
              className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 shadow-sm cursor-pointer transition-colors hover:bg-muted"
            >
              <span className="flex flex-col text-left">
                <span className="text-sm font-medium leading-tight">
                  Auto nav
                </span>
                <span className="text-xs text-muted-foreground">
                  Generate from site content
                </span>
              </span>
              <Switch id="auto-nav" checked={autoNav} className="pointer-events-none" />
            </button>
          </PageHeader>
        </div>
        {!autoNav && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Menu Builder
                </CardTitle>
                {saving && (
                  <p className="text-sm text-blue-600 mt-1">Saving...</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button onClick={toggleJsonEditor} variant="outline">
                  {showJsonEditor ? (
                    <Eye className="w-4 h-4 mr-2" />
                  ) : (
                    <Code className="w-4 h-4 mr-2" />
                  )}
                  {showJsonEditor ? "View Menu" : "Edit JSON"}
                </Button>
                <Button
                  onClick={exportJSON}
                  className="bg-primary hover:bg-primary/20"
                >
                  Export JSON
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {showJsonEditor ? (
              <div className="space-y-4">
                <div>
                  <Label>Edit JSON Directly</Label>
                  <CodeEditor
                    value={jsonInput}
                    language="json"
                    placeholder="Enter JSON here..."
                    onChange={(e) => setJsonInput(e.target.value)}
                    padding={15}
                    className="font-mono text-sm mt-2"
                    style={{
                      backgroundColor: "#0000",
                      fontFamily: "ui-monospace, monospace",
                    }}
                  />
                  {jsonError && (
                    <p className="mt-2 text-sm text-red-600">{jsonError}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleJsonSave}>Save Changes</Button>
                  <Button onClick={toggleJsonEditor} variant="outline">
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-muted rounded-lg p-4 mb-6">
                  <Label className="text-base mb-3 block">Add Menu Item</Label>
                  <div className="flex gap-3">
                    <Input
                      placeholder="Menu Label"
                      value={newItem.label}
                      onChange={(e) =>
                        setNewItem({ ...newItem, label: e.target.value })
                      }
                    />
                    <Input
                      placeholder="URL"
                      value={newItem.url}
                      onChange={(e) =>
                        setNewItem({ ...newItem, url: e.target.value })
                      }
                    />
                    <Button onClick={addMenuItem}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-4">
                    <Label className="text-base">Menu Structure</Label>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MoveUp className="w-3 h-3" /> Move up
                      </span>
                      <span className="flex items-center gap-1">
                        <MoveDown className="w-3 h-3" /> Move down
                      </span>
                      <span className="flex items-center gap-1">
                        <ArrowRight className="w-3 h-3 text-purple-600" /> Nest
                      </span>
                      <span className="flex items-center gap-1">
                        <ArrowLeft className="w-3 h-3 text-orange-600" /> Unnest
                      </span>
                    </div>
                  </div>
                  {menuItems.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                      No menu items yet. Add one above to get started.
                    </div>
                  ) : (
                    <SortableContext
                      items={flattenItems(menuItems).map((item) => item.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {menuItems.map((item, idx) =>
                        renderMenuItem(item, 0, idx, menuItems),
                      )}
                    </SortableContext>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
        )}

        {!autoNav && !showJsonEditor && (
          <Card>
            <CardHeader>
              <CardTitle>JSON Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
                {JSON.stringify(menuItems, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
      {autoNav && (
        <Card>
          <CardHeader>
            <CardTitle>Auto nav</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Generated automatically from your site content. It replaces your
              custom {footer ? "footer" : "navbar"} items while enabled. Toggle
              it off to edit your custom items.
            </p>
            {autoItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                Nothing to generate yet. Publish products, categories and brands
                to populate auto nav.
              </div>
            ) : (
              <div className="space-y-2">
                {autoItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-1 p-3 bg-card border rounded-lg"
                  >
                    <div className="font-medium text-foreground">{item.label}</div>
                    {item.url && (
                      <div className="text-sm text-muted-foreground">{item.url}</div>
                    )}
                    {item.children.length > 0 && (
                      <div className="mt-2 space-y-1 pl-4 border-l-2 border-border">
                        {item.children.map((child) => (
                          <div key={child.id}>
                            <div className="text-sm text-muted-foreground">
                              {child.label}
                              {child.url && (
                                <span className="text-xs text-muted-foreground/70">
                                  {" "}
                                  · {child.url}
                                </span>
                              )}
                            </div>
                            {child.children.length > 0 && (
                              <div className="ml-4 mt-1 space-y-1 border-l-2 border-border pl-4">
                                {child.children.map((grand) => (
                                  <div
                                    key={grand.id}
                                    className="text-sm text-muted-foreground"
                                  >
                                    {grand.label}
                                    {grand.url && (
                                      <span className="text-xs text-muted-foreground/70">
                                        {" "}
                                        · {grand.url}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      <DragOverlay>
        {" "}
        {activeItem ? (
          <div className="flex items-center gap-2 p-3 bg-background border-2 border-blue-500 rounded-lg shadow-xl">
            {" "}
            <GripVertical className="w-4 h-4 text-muted-foreground" />{" "}
            <div>
              {" "}
              <div className="font-medium text-foreground">
                {activeItem.label}
              </div>{" "}
              <div className="text-sm text-muted-foreground">{activeItem.url}</div>{" "}
            </div>{" "}
          </div>
        ) : null}{" "}
      </DragOverlay>{" "}
    </DndContext>
  );
};
export default NavigationManager;
