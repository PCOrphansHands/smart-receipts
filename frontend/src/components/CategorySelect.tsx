import { useEffect, useState } from 'react';
import { Label } from 'extensions/shadcn/components/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'extensions/shadcn/components/select';
import brain from 'brain';
import { Tag } from 'lucide-react';

interface Category {
  name: string;
  description: string;
  color: string;
  icon: string;
  display_order: number;
}

interface CategorySelectProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  showLabel?: boolean;
}

export default function CategorySelect({ value, onChange, label = "Category", showLabel = true }: CategorySelectProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await brain.get_categories();
      const data = await response.json();
      if (data.success) {
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      {showLabel && (
        <Label htmlFor="category" className="flex items-center gap-2">
          <Tag className="w-4 h-4" />
          {label}
        </Label>
      )}
      <Select value={value} onValueChange={onChange} disabled={loading}>
        <SelectTrigger id="category">
          <SelectValue placeholder={loading ? "Loading categories..." : "Select a category"} />
        </SelectTrigger>
        <SelectContent>
          {categories.map((category) => (
            <SelectItem key={category.name} value={category.name}>
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <span>{category.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
