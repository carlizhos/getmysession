import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Palette } from 'lucide-react';
import useDarkMode from '@/hooks/useDarkMode';

export default function AppearanceSettings() {
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  return (
    <Card variant="flat" className="border border-border">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Palette className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Apariencia y Tema</CardTitle>
            <CardDescription>
              Personaliza los colores y el modo de visualización de tu cuenta.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between border rounded-lg p-4 bg-muted/20">
          <div className="space-y-0.5">
            <Label className="text-base font-medium">Modo Oscuro</Label>
            <p className="text-sm text-muted-foreground">
              Cambia la interfaz a colores oscuros para reducir la fatiga visual.
            </p>
          </div>
          <Switch
            checked={isDarkMode}
            onCheckedChange={toggleDarkMode}
          />
        </div>
      </CardContent>
    </Card>
  );
}
