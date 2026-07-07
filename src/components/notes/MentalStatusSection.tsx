import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { DEFAULT_MSE_CATEGORIES, MSECategory } from '@/lib/mentalStatusConfig';
import { useOrganization } from '@/hooks/useOrganization';
import { ShieldAlert } from 'lucide-react';

interface MentalStatusSectionProps {
  value: Record<string, string[]> | null;
  onChange: (value: Record<string, string[]>) => void;
}

export default function MentalStatusSection({ value, onChange }: MentalStatusSectionProps) {
  const { organization } = useOrganization();
  const [categories, setCategories] = useState<MSECategory[]>(DEFAULT_MSE_CATEGORIES);

  useEffect(() => {
    if (organization?.settings?.mental_status_config) {
      try {
        const config = organization.settings.mental_status_config as any;
        if (config.categories && Array.isArray(config.categories)) {
          setCategories(config.categories);
        }
      } catch (err) {
        console.error('Error parsing mental_status_config:', err);
      }
    }
  }, [organization]);

  const currentValue = value || {};

  const handleCheckboxChange = (categoryId: string, option: string, checked: boolean) => {
    const categoryValues = currentValue[categoryId] || [];
    let newCategoryValues: string[];
    if (checked) {
      newCategoryValues = [...categoryValues, option];
    } else {
      newCategoryValues = categoryValues.filter(v => v !== option);
    }
    onChange({
      ...currentValue,
      [categoryId]: newCategoryValues
    });
  };

  return (
    <Card className="border border-border shadow-sm w-full md:col-span-3">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-sm font-bold text-primary">Examen del Estado Mental (MSE)</CardTitle>
            <CardDescription className="text-xs">
              Registra las observaciones del estado mental del paciente durante la sesión.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => {
            const selectedOptions = currentValue[category.id] || [];
            return (
              <div 
                key={category.id} 
                className="p-4 rounded-xl border border-border/60 bg-muted/10 space-y-3"
              >
                <h4 className="text-xs font-black uppercase tracking-wider text-primary border-b border-border/40 pb-1.5">
                  {category.label}
                </h4>
                <div className="space-y-2">
                  {category.options.map((option) => {
                    const isChecked = selectedOptions.includes(option);
                    const checkboxId = `mse-${category.id}-${option.replace(/\s+/g, '-').toLowerCase()}`;
                    return (
                      <div key={option} className="flex items-start gap-2.5">
                        <Checkbox
                          id={checkboxId}
                          checked={isChecked}
                          onCheckedChange={(checked) => 
                            handleCheckboxChange(category.id, option, !!checked)
                          }
                        />
                        <Label 
                          htmlFor={checkboxId} 
                          className="text-xs text-foreground/80 leading-normal font-medium cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {option}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
